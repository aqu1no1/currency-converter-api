import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { SyncService } from '@/sync/sync.service';

@Injectable()
export class SyncDailyRatesCron {
  private readonly logger = new Logger(SyncDailyRatesCron.name);
  private isRunning = false;

  constructor(private readonly syncService: SyncService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM, {
    name: 'sync-daily-rates',
    timeZone: 'America/Sao_Paulo',
  })
  async handle(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous run still in progress, skipping');
      return;
    }
    this.isRunning = true;
    try {
      this.logger.verbose('Start daily rates sync');
      await this.syncService.syncRates(SyncType.DAILY);
    } finally {
      this.logger.verbose('Finish daily rates sync');
      this.isRunning = false;
    }
  }
}
