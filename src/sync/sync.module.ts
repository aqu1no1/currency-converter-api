import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from '@/currency/currency.module';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { FrankfurterModule } from '@/integrations/frankfurter/frankfurter.module';
import { SyncDailyRatesCron } from '@/sync/crons/sync-daily-rates.cron';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncController } from '@/sync/sync.controller';
import { SyncService } from '@/sync/sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncRun, Currency, ExchangeRate]),
    CurrencyModule,
    FrankfurterModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncDailyRatesCron],
})
export class SyncModule {}
