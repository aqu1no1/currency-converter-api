import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { CurrencyService } from '@/currency/currency.service';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { I18nTranslations } from '@/generated/i18n.generated';
import { FindSyncRunsQueryDto } from '@/sync/dto/find-sync-runs-query.dto';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { SyncTargets } from '@/sync/interfaces/sync-targets.interface';
import {
  ExchangeRateProvider,
  ExchangeRateProviderUnavailableException,
  ProviderRate,
} from '@ports/exchange-rate-provider.port';
import { BASE_CURRENCY } from '@constants/currency.constants';
import { PaginatedResponseDto } from '@dto/paginated-response.dto';
import { toPaginatedResponse, toSkipTake } from '@utils/pagination';
import { sleep } from '@utils/sleep';
import { TIME_IN_MS } from '@constants/time.constants';

const DAYS = 5;
const ERROR_MESSAGE_MAX_LENGTH = 255;
const BACKFILL_START_YEAR = 2000;
const BACKFILL_PAUSE_IN_MS = 7 * TIME_IN_MS.SECOND;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private isBackfillRunning = false;

  constructor(
    @InjectRepository(SyncRun)
    private readonly syncRunRepository: Repository<SyncRun>,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly currencyService: CurrencyService,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  async findAll({
    page,
    perPage,
    type,
    status,
  }: FindSyncRunsQueryDto): Promise<PaginatedResponseDto<SyncRun>> {
    const [data, total] = await this.syncRunRepository.findAndCount({
      where: {
        ...(type && { type }),
        ...(status && { status }),
      },
      order: { startedAt: 'DESC', id: 'DESC' },
      ...toSkipTake({ page, perPage }),
    });

    return toPaginatedResponse({ data, total, page, perPage });
  }

  async syncRates({ type }: { type: SyncType }): Promise<void> {
    const syncRun = await this.createRun({ type });

    await this.executeRun({
      syncRun,
      work: async ({ base, currencies, currencyIdByCode }) => {
        const rates = await this.exchangeRateProvider.fetchRecentRates({
          base,
          currencies,
          days: DAYS,
        });

        return this.saveRates({ rates, currencyIdByCode, syncRunId: syncRun.id });
      },
    });
  }

  async startBackfill(): Promise<SyncRun> {
    if (this.isBackfillRunning) {
      throw new ConflictException(
        this.i18n.t('errors.ALREADY_RUNNING', { args: { entity: this.i18n.t('t.BACKFILL') } }),
      );
    }
    this.isBackfillRunning = true;

    try {
      const syncRun = await this.createRun({ type: SyncType.BACKFILL });

      void this.backfillRates({ syncRun })
        .catch((error) => this.logger.error(`Backfill ${syncRun.id} crashed: ${String(error)}`))
        .finally(() => {
          this.isBackfillRunning = false;
        });

      return syncRun;
    } catch (error) {
      this.isBackfillRunning = false;
      this.logger.error(`Could not start backfill: ${String(error)}`);
      throw new InternalServerErrorException(
        this.i18n.t('errors.START_FAILED', { args: { entity: this.i18n.t('t.BACKFILL') } }),
      );
    }
  }

  private backfillRates({ syncRun }: { syncRun: SyncRun }): Promise<void> {
    return this.executeRun({
      syncRun,
      work: async ({ base, currencies, currencyIdByCode }) => {
        const currentYear = new Date().getFullYear();
        let rowsInserted = 0;

        for (let year = BACKFILL_START_YEAR; year <= currentYear; year++) {
          const rates = await this.exchangeRateProvider.fetchRatesInRange({
            base,
            currencies,
            start: `${year}-01-01`,
            end: `${year}-12-31`,
          });

          rowsInserted += await this.saveRates({ rates, currencyIdByCode, syncRunId: syncRun.id });
          this.logger.verbose(`Backfill ${year}: ${rates.length} rates`);

          if (year < currentYear) await sleep(BACKFILL_PAUSE_IN_MS);
        }

        return rowsInserted;
      },
    });
  }

  private createRun({ type }: { type: SyncType }): Promise<SyncRun> {
    this.logger.verbose(`Syncing rates (${type})`);

    return this.syncRunRepository.save({
      type,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });
  }

  private async executeRun({
    syncRun,
    work,
  }: {
    syncRun: SyncRun;
    work: (targets: SyncTargets) => Promise<number>;
  }): Promise<void> {
    try {
      const rowsInserted = await work(await this.loadSyncTargets());

      await this.syncRunRepository.update(syncRun.id, {
        status: SyncStatus.SUCCESS,
        rowsInserted,
        finishedAt: new Date(),
      });
      this.logger.log(`Sync ${syncRun.id} finished with ${rowsInserted} rows`);
    } catch (error) {
      const message = this.toErrorMessage({ error });

      this.logger.error(`Sync ${syncRun.id} failed: ${message}`);
      await this.syncRunRepository.update(syncRun.id, {
        status: SyncStatus.FAILED,
        errorMessage: message.slice(0, ERROR_MESSAGE_MAX_LENGTH),
        finishedAt: new Date(),
      });
    }
  }

  private async loadSyncTargets(): Promise<SyncTargets> {
    const base = BASE_CURRENCY.BASED;
    const allCurrencies = await this.currencyService.findAllCurrencies();

    return {
      base,
      currencies: allCurrencies.map((currency) => currency.code).filter((code) => code !== base),
      currencyIdByCode: new Map(allCurrencies.map((currency) => [currency.code, currency.id])),
    };
  }

  private async saveRates({
    rates,
    currencyIdByCode,
    syncRunId,
  }: {
    rates: ProviderRate[];
    currencyIdByCode: Map<string, string>;
    syncRunId: string;
  }): Promise<number> {
    const rows = rates.flatMap((rate) => {
      const currencyId = currencyIdByCode.get(rate.currencyCode);

      if (!currencyId) return [];

      return [{ currencyId, syncRunId, rate: rate.rate, rateDate: rate.rateDate }];
    });

    if (rows.length > 0) {
      await this.exchangeRateRepository.upsert(rows, ['currencyId', 'rateDate']);
    }

    return rows.length;
  }

  private toErrorMessage({ error }: { error: unknown }): string {
    if (error instanceof ExchangeRateProviderUnavailableException) {
      return this.i18n.t('errors.UNAVAILABLE', {
        args: { entity: this.i18n.t('t.EXCHANGE_RATE_PROVIDER') },
      });
    }

    return error instanceof Error ? error.message : String(error);
  }
}
