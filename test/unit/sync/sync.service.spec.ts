import { ConflictException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { CurrencyService } from '@/currency/currency.service';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { SyncService } from '@/sync/sync.service';
import {
  ExchangeRateProvider,
  ExchangeRateProviderUnavailableException,
  type ProviderRate,
} from '@ports/exchange-rate-provider.port';
import { BASE_CURRENCY } from '@constants/currency.constants';

vi.mock('@utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const RUN_ID = 'run-1';

const currencies = [
  { id: 'id-usd', code: 'USD' },
  { id: 'id-brl', code: 'BRL' },
  { id: 'id-eur', code: 'EUR' },
];

const recentRates: ProviderRate[] = [
  { currencyCode: 'BRL', rate: '5.42', rateDate: '2026-09-28' },
  { currencyCode: 'EUR', rate: '0.92', rateDate: '2026-09-28' },
];

describe('SyncService', () => {
  let service: SyncService;
  let provider: {
    fetchRecentRates: ReturnType<typeof vi.fn>;
    fetchRatesInRange: ReturnType<typeof vi.fn>;
  };
  let syncRunRepository: { save: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let exchangeRateRepository: { upsert: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    provider = {
      fetchRecentRates: vi.fn().mockResolvedValue(recentRates),
      fetchRatesInRange: vi.fn().mockResolvedValue([]),
    };
    syncRunRepository = {
      save: vi.fn((run: Partial<SyncRun>) => Promise.resolve({ id: RUN_ID, ...run })),
      update: vi.fn().mockResolvedValue(undefined),
    };
    exchangeRateRepository = { upsert: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ExchangeRateProvider, useValue: provider },
        { provide: getRepositoryToken(SyncRun), useValue: syncRunRepository },
        { provide: getRepositoryToken(ExchangeRate), useValue: exchangeRateRepository },
        {
          provide: CurrencyService,
          useValue: { findAllCurrencies: () => Promise.resolve(currencies) },
        },
        { provide: ExchangeRateService, useValue: { findLatestRateDate: vi.fn() } },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('daily sync', () => {
    it('creates the run as RUNNING, saves the rates and marks it SUCCESS with the row count', async () => {
      await service.syncRates({ type: SyncType.DAILY });

      expect(syncRunRepository.save).toHaveBeenCalledWith({
        type: SyncType.DAILY,
        status: SyncStatus.RUNNING,
        startedAt: expect.any(Date),
      });
      expect(exchangeRateRepository.upsert).toHaveBeenCalledWith(
        [
          { currencyId: 'id-brl', syncRunId: RUN_ID, rate: '5.42', rateDate: '2026-09-28' },
          { currencyId: 'id-eur', syncRunId: RUN_ID, rate: '0.92', rateDate: '2026-09-28' },
        ],
        ['currencyId', 'rateDate'],
      );
      expect(syncRunRepository.update).toHaveBeenCalledWith(RUN_ID, {
        status: SyncStatus.SUCCESS,
        rowsInserted: 2,
        finishedAt: expect.any(Date),
      });
    });

    it('passes BASE_CURRENCY and the currencies without the base to the port', async () => {
      await service.syncRates({ type: SyncType.DAILY });

      expect(provider.fetchRecentRates).toHaveBeenCalledWith({
        base: BASE_CURRENCY.BASED,
        currencies: ['BRL', 'EUR'],
        days: 5,
      });
      const [{ currencies: sentCurrencies }] = provider.fetchRecentRates.mock.calls[0];
      expect(sentCurrencies).not.toContain(BASE_CURRENCY.BASED);
    });

    it('uses the date from the response as rate_date, not the day the cron ran', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-04T09:00:00Z'));

      await service.syncRates({ type: SyncType.DAILY });

      const [rows] = exchangeRateRepository.upsert.mock.calls[0];
      expect(rows.map((row: { rateDate: string }) => row.rateDate)).toEqual([
        '2026-09-28',
        '2026-09-28',
      ]);
    });

    it('ignores rates of currencies that are not in the currencies table', async () => {
      provider.fetchRecentRates.mockResolvedValue([
        ...recentRates,
        { currencyCode: 'XYZ', rate: '1.5', rateDate: '2026-09-28' },
      ]);

      await service.syncRates({ type: SyncType.DAILY });

      expect(exchangeRateRepository.upsert.mock.calls[0][0]).toHaveLength(2);
      expect(syncRunRepository.update).toHaveBeenCalledWith(
        RUN_ID,
        expect.objectContaining({ status: SyncStatus.SUCCESS, rowsInserted: 2 }),
      );
    });

    it('marks SUCCESS with zero rows and skips the upsert when there are no rates', async () => {
      provider.fetchRecentRates.mockResolvedValue([]);

      await service.syncRates({ type: SyncType.DAILY });

      expect(exchangeRateRepository.upsert).not.toHaveBeenCalled();
      expect(syncRunRepository.update).toHaveBeenCalledWith(
        RUN_ID,
        expect.objectContaining({ status: SyncStatus.SUCCESS, rowsInserted: 0 }),
      );
    });

    it('marks FAILED with a translated message and does not throw to the cron when the provider fails', async () => {
      provider.fetchRecentRates.mockRejectedValue(
        new ExchangeRateProviderUnavailableException('Request to Frankfurter failed'),
      );

      await expect(service.syncRates({ type: SyncType.DAILY })).resolves.toBeUndefined();

      expect(exchangeRateRepository.upsert).not.toHaveBeenCalled();
      expect(syncRunRepository.update).toHaveBeenCalledWith(RUN_ID, {
        status: SyncStatus.FAILED,
        errorMessage: 'errors.UNAVAILABLE',
        finishedAt: expect.any(Date),
      });
    });

    it('cuts unexpected error messages to fit the error_message column', async () => {
      provider.fetchRecentRates.mockRejectedValue(new Error('x'.repeat(300)));

      await service.syncRates({ type: SyncType.DAILY });

      const [, changes] = syncRunRepository.update.mock.calls[0];
      expect(changes.status).toBe(SyncStatus.FAILED);
      expect(changes.errorMessage).toHaveLength(255);
    });
  });

  describe('backfill', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2002-06-01T12:00:00Z'));
    });

    it('fetches one year per call, from 2000 to the current year, and sums the rows into one run', async () => {
      provider.fetchRatesInRange.mockImplementation(({ start }: { start: string }) =>
        Promise.resolve([{ currencyCode: 'BRL', rate: '1.8', rateDate: start }]),
      );

      const syncRun = await service.startBackfill();

      expect(syncRun).toMatchObject({
        id: RUN_ID,
        type: SyncType.BACKFILL,
        status: SyncStatus.RUNNING,
      });
      await vi.waitFor(() => expect(syncRunRepository.update).toHaveBeenCalled());

      expect(
        provider.fetchRatesInRange.mock.calls.map(([params]) => [params.start, params.end]),
      ).toEqual([
        ['2000-01-01', '2000-12-31'],
        ['2001-01-01', '2001-12-31'],
        ['2002-01-01', '2002-12-31'],
      ]);
      expect(syncRunRepository.update).toHaveBeenCalledWith(
        RUN_ID,
        expect.objectContaining({ status: SyncStatus.SUCCESS, rowsInserted: 3 }),
      );
    });

    it('stops and marks FAILED when a year fails', async () => {
      provider.fetchRatesInRange
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new ExchangeRateProviderUnavailableException('down'));

      await service.startBackfill();
      await vi.waitFor(() => expect(syncRunRepository.update).toHaveBeenCalled());

      expect(provider.fetchRatesInRange).toHaveBeenCalledTimes(2);
      expect(syncRunRepository.update).toHaveBeenCalledWith(
        RUN_ID,
        expect.objectContaining({ status: SyncStatus.FAILED }),
      );
    });

    it('rejects a second backfill while one is running', async () => {
      provider.fetchRatesInRange.mockReturnValue(new Promise(() => undefined));

      await service.startBackfill();

      await expect(service.startBackfill()).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
