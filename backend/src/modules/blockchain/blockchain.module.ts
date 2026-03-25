import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SavingsService } from './savings.service';
import { BlockchainController } from './blockchain.controller';
import { StellarEventListenerService } from './stellar-event-listener.service';
import { StellarEventListenerController } from './stellar-event-listener.controller';
import { ProcessedStellarEvent } from './entities/processed-event.entity';
import { LedgerTransaction } from './entities/transaction.entity';
import { DeadLetterEvent } from './entities/dead-letter-event.entity';
import { MedicalClaim } from '../claims/entities/medical-claim.entity';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { DepositHandler } from './event-handlers/deposit.handler';
import { IndexerService } from './indexer.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessedStellarEvent,
      MedicalClaim,
      LedgerTransaction,
      DeadLetterEvent,
      User,
      UserSubscription,
      SavingsProduct,
    ]),
  ],
  controllers: [BlockchainController, StellarEventListenerController],
  providers: [
    StellarService,
    SavingsService,
    StellarEventListenerService,
    IndexerService,
    DepositHandler,
  ],
  exports: [
    StellarService,
    SavingsService,
    StellarEventListenerService,
    DepositHandler,
  ],
})
export class BlockchainModule {}
