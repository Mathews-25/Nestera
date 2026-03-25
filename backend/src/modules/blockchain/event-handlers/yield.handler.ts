import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { scValToNative, xdr } from '@stellar/stellar-sdk';
import {
  LedgerTransaction,
  LedgerTransactionType,
} from '../entities/transaction.entity';
import {
  SubscriptionStatus,
  UserSubscription,
} from '../../savings/entities/user-subscription.entity';
import { User } from '../../user/entities/user.entity';
import { SavingsProduct } from '../../savings/entities/savings-product.entity';

interface IndexerEvent {
  id?: string;
  topic?: unknown[];
  value?: unknown;
  txHash?: string;
  ledger?: number;
  [key: string]: unknown;
}

interface YieldPayload {
  publicKey: string;
  amount: string; // This represents the interest earned
}

@Injectable()
export class YieldHandler {
  private readonly logger = new Logger(YieldHandler.name);
  private static readonly YIELD_HASH_HEX = createHash('sha256')
    .update('Yield')
    .digest('hex');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async handle(event: IndexerEvent): Promise<boolean> {
    if (!this.isYieldTopic(event.topic)) {
      return false;
    }

    const payload = this.extractPayload(event.value);
    const eventId = this.resolveEventId(event);

    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const txRepo = manager.getRepository(LedgerTransaction);
      const subRepo = manager.getRepository(UserSubscription);

      const user = await userRepo.findOne({
        where: [
          { publicKey: payload.publicKey },
          { walletAddress: payload.publicKey },
        ],
      });

      if (!user) {
        throw new Error(
          `Cannot map yield payload publicKey to user: ${payload.publicKey}`,
        );
      }

      const existingTx = await txRepo.findOne({ where: { eventId } });
      if (existingTx) {
        this.logger.debug(
          `Yield event ${eventId} already persisted. Skipping.`,
        );
        return;
      }

      await txRepo.save(
        txRepo.create({
          userId: user.id,
          type: LedgerTransactionType.YIELD,
          amount: payload.amount,
          publicKey: payload.publicKey,
          eventId,
          transactionHash:
            typeof event.txHash === 'string' ? event.txHash : null,
          ledgerSequence:
            typeof event.ledger === 'number' ? String(event.ledger) : null,
          metadata: {
            topic: event.topic,
            rawValueType: typeof event.value,
          },
        }),
      );

      const amountAsNumber = Number(payload.amount);

      const subscription = await subRepo.findOne({
        where: {
          userId: user.id,
          status: SubscriptionStatus.ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });

      if (subscription) {
        subscription.totalInterestEarned = String(
          Number(subscription.totalInterestEarned || '0') + amountAsNumber,
        );
        await subRepo.save(subscription);
      } else {
        this.logger.warn(
          `No active subscription found for user ${user.id} to apply yield to.`,
        );
      }
    });

    return true;
  }

  private isYieldTopic(topic: unknown[] | undefined): boolean {
    if (!Array.isArray(topic) || topic.length === 0) {
      return false;
    }

    const first = topic[0];
    const normalized = this.toHex(first);

    // Also check for 'yld_dist' which is emitted by the contract strategy
    const YLD_DIST_HASH_HEX = createHash('sha256')
      .update('yld_dist')
      .digest('hex');

    return (
      normalized === YieldHandler.YIELD_HASH_HEX ||
      normalized === YLD_DIST_HASH_HEX
    );
  }

  private extractPayload(value: unknown): YieldPayload {
    const decoded = this.decodeScVal(value);
    const asRecord = this.ensureObject(decoded);

    const publicKey =
      this.pickString(asRecord, [
        'publicKey',
        'userPublicKey',
        'user',
        'address',
      ]) ?? '';
    const amountRaw =
      asRecord['amount'] ||
      asRecord['yield'] ||
      asRecord['user_yield'] ||
      asRecord['actual_yield'];

    const amount =
      typeof amountRaw === 'bigint'
        ? amountRaw.toString()
        : typeof amountRaw === 'number'
          ? String(amountRaw)
          : typeof amountRaw === 'string'
            ? amountRaw
            : '';

    if (!publicKey || !amount || Number.isNaN(Number(amount))) {
      throw new Error(
        'Invalid Yield payload: expected publicKey + numeric amount',
      );
    }

    return { publicKey, amount };
  }

  private resolveEventId(event: IndexerEvent): string {
    if (typeof event.id === 'string' && event.id.length > 0) {
      return event.id;
    }

    const txHash = typeof event.txHash === 'string' ? event.txHash : 'unknown';
    const ledger = typeof event.ledger === 'number' ? event.ledger : 0;
    return `${txHash}:${ledger}:yield`;
  }

  private decodeScVal(value: unknown): unknown {
    if (
      value &&
      typeof value === 'object' &&
      'toXDR' in value &&
      typeof (value as { toXDR?: unknown }).toXDR === 'function'
    ) {
      const base64 = (value as { toXDR: (encoding?: string) => string }).toXDR(
        'base64',
      );
      const scVal = xdr.ScVal.fromXDR(base64, 'base64');
      return scValToNative(scVal);
    }

    if (typeof value === 'string') {
      try {
        const scVal = xdr.ScVal.fromXDR(value, 'base64');
        return scValToNative(scVal);
      } catch {
        return value;
      }
    }

    return value;
  }

  private ensureObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    // Handle the case where value is an array (like in yld_dist event containing [strategy, actual_yield, treasury_fee, user_yield])
    if (Array.isArray(value)) {
      // If it's an array without keys, assume the first element is address, inner yield is index 3
      if (value.length >= 4) {
        return {
          address: value[0],
          user_yield: value[3],
        };
      }
    }

    throw new Error('Unexpected Yield payload shape.');
  }

  private pickString(
    record: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }

  private toHex(topicPart: unknown): string | null {
    if (typeof topicPart === 'string') {
      const clean = topicPart.toLowerCase().replace(/^0x/, '');
      if (/^[0-9a-f]{64}$/i.test(clean)) {
        return clean;
      }

      try {
        return Buffer.from(topicPart, 'base64').toString('hex');
      } catch {
        return null;
      }
    }

    if (
      topicPart &&
      typeof topicPart === 'object' &&
      'toXDR' in topicPart &&
      typeof (topicPart as { toXDR?: unknown }).toXDR === 'function'
    ) {
      try {
        const base64 = (
          topicPart as { toXDR: (encoding?: string) => string }
        ).toXDR('base64');
        return Buffer.from(base64, 'base64').toString('hex');
      } catch {
        return null;
      }
    }

    return null;
  }
}
