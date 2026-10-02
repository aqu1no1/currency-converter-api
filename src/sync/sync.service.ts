import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { CurrencyService } from '@/currency/currency.service';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { I18nTranslations } from '@/generated/i18n.generated';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import {
  ExchangeRateProvider,
  ExchangeRateProviderUnavailableException,
} from '@ports/exchange-rate-provider.port';
import { BASE_CURRENCY } from '@utils/constants';

const DAYS = 5;
const ERROR_MESSAGE_MAX_LENGTH = 255;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncRun)
    private readonly syncRunRepository: Repository<SyncRun>,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly currencyService: CurrencyService,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  findAll(): Promise<SyncRun[]> {
    return this.syncRunRepository.find({ order: { startedAt: 'DESC' } });
  }

  async syncRates(type: SyncType): Promise<void> {
    this.logger.verbose(`Syncing rates (${type})`);

    const syncRun = await this.syncRunRepository.save({
      type,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      const base = BASE_CURRENCY.BASED;
      const allCurrencies = await this.currencyService.findAllCurrencies();
      const currencies = allCurrencies
        .map((currency) => currency.code)
        .filter((code) => code !== base);
      const currencyIdByCode = new Map(
        allCurrencies.map((currency) => [currency.code, currency.id]),
      );

      const rates = await this.exchangeRateProvider.fetchRecentRates({
        base,
        currencies,
        days: DAYS,
      });

      const rows = rates.flatMap((rate) => {
        const currencyId = currencyIdByCode.get(rate.currencyCode);

        if (!currencyId) return [];

        return [{ currencyId, syncRunId: syncRun.id, rate: rate.rate, rateDate: rate.rateDate }];
      });

      if (rows.length > 0) {
        await this.exchangeRateRepository.upsert(rows, ['currencyId', 'rateDate']);
      }

      await this.syncRunRepository.update(syncRun.id, {
        status: SyncStatus.SUCCESS,
        rowsInserted: rows.length,
        finishedAt: new Date(),
      });
      this.logger.log(`Sync ${syncRun.id} finished with ${rows.length} rows`);
    } catch (error) {
      const message = this.toErrorMessage(error);

      this.logger.error(`Sync ${syncRun.id} failed: ${message}`);
      await this.syncRunRepository.update(syncRun.id, {
        status: SyncStatus.FAILED,
        errorMessage: message.slice(0, ERROR_MESSAGE_MAX_LENGTH),
        finishedAt: new Date(),
      });
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof ExchangeRateProviderUnavailableException) {
      return this.i18n.t('errors.UNAVAILABLE', {
        args: { entity: this.i18n.t('t.EXCHANGE_RATE_PROVIDER') },
      });
    }

    return error instanceof Error ? error.message : String(error);
  }
}
