import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/currency/entities/exchange-rate.entity';
import { SyncDailyRatesCron } from '@/sync/crons/sync-daily-rates.cron';
import { SyncRun } from '@/sync/entities/sync-runs.entity';
import { SyncController } from '@/sync/sync.controller';
import { SyncService } from '@/sync/sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([SyncRun, Currency, ExchangeRate])],
  controllers: [SyncController],
  providers: [SyncService, SyncDailyRatesCron],
})
export class SyncModule {}
