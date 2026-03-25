import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { DeadLetterEvent } from './entities/dead-letter-event.entity';
import { DepositHandler } from './event-handlers/deposit.handler';

/** Shape of a raw Soroban event as returned by the RPC. */
interface SorobanEvent {
  id?: string;
  ledger: number;
  topic?: unknown[];
  value?: unknown;
  txHash?: string;
  [key: string]: unknown;
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private lastProcessedLedger = 0;

  constructor(
    @InjectRepository(DeadLetterEvent)
    private readonly dlqRepo: Repository<DeadLetterEvent>,
    private readonly depositHandler: DepositHandler,
  ) {}

  onModuleInit() {
    this.logger.log('Blockchain indexer initialised.');
  }

  /** Cron: poll Soroban RPC every 5 seconds. */
  @Interval(5_000)
  async runIndexerCycle(): Promise<void> {
    let events: SorobanEvent[] = [];

    try {
      events = await this.fetchEvents();
    } catch (err) {
      this.logger.error(
        `Failed to fetch events from RPC: ${(err as Error).message}`,
      );
      return;
    }

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Wraps individual event processing in a try-catch.
   * On failure: stringifies the raw event and inserts a DeadLetterEvent row,
   * then logs the ledger sequence that failed.
   */
  private async processEvent(event: SorobanEvent): Promise<void> {
    try {
      await this.handleEvent(event);
      this.lastProcessedLedger = event.ledger;
    } catch (err) {
      const errorMessage = (err as Error).message ?? String(err);

      this.logger.error(
        `Event processing failed at ledger=${event.ledger}: ${errorMessage}`,
      );

      await this.dlqRepo.save(
        this.dlqRepo.create({
          ledgerSequence: event.ledger,
          rawEvent: JSON.stringify(event),
          errorMessage,
        }),
      );
    }
  }

  /**
   * Core event handler — parse and dispatch by event type.
   * Extend this method to handle specific Soroban contract events.
   */
  private async handleEvent(event: SorobanEvent): Promise<void> {
    this.logger.debug(`Processing event at ledger=${event.ledger}`);

    const handledByDeposit = await this.depositHandler.handle(event);
    if (handledByDeposit) {
      this.logger.debug(`Handled deposit event at ledger=${event.ledger}`);
      return;
    }

    // TODO: dispatch to other domain-specific handlers.
  }

  /** Fetches new Soroban events from the RPC since the last processed ledger. */
  private async fetchEvents(): Promise<SorobanEvent[]> {
    const rpcUrl = process.env.SOROBAN_RPC_URL;
    if (!rpcUrl) {
      this.logger.warn('SOROBAN_RPC_URL not set — skipping indexer cycle.');
      return [];
    }

    // Placeholder: replace with actual @stellar/stellar-sdk RPC call
    return [];
  }
}
