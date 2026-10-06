import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { SyncService } from '@/sync/sync.service';
import { ExchangeRateProviderUnavailableException } from '@ports/exchange-rate-provider.port';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates, seedSyncRun } from '../utils/seeds';

describe('SyncService (integration)', () => {
  let ctx: TestingApp;
  let service: SyncService;

  beforeAll(async () => {
    ctx = await createTestingApp();
    service = ctx.app.get(SyncService);
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
    ctx.provider.reset();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  const findSyncRuns = () => ctx.dataSource.getRepository(SyncRun).find();

  const findSavedRates = async () => {
    const rates = await ctx.dataSource
      .getRepository(ExchangeRate)
      .find({ relations: { currency: true } });

    return rates
      .map(({ currency, rate, rateDate, syncRunId }) => ({
        code: currency.code,
        rate,
        rateDate,
        syncRunId,
      }))
      .sort((a, b) => a.rateDate.localeCompare(b.rateDate) || a.code.localeCompare(b.code));
  };

  describe('syncRates', () => {
    it('saves the rates and finishes the run as SUCCESS with the inserted rows', async () => {
      ctx.provider.fetchRecentRates.mockResolvedValue([
        { currencyCode: 'BRL', rate: '5.42', rateDate: '2026-09-28' },
        { currencyCode: 'EUR', rate: '0.92', rateDate: '2026-09-28' },
        { currencyCode: 'BRL', rate: '5.43', rateDate: '2026-09-29' },
      ]);

      await service.syncRates({ type: SyncType.DAILY });

      const [syncRun] = await findSyncRuns();

      expect(syncRun).toMatchObject({
        type: SyncType.DAILY,
        status: SyncStatus.SUCCESS,
        rowsInserted: 3,
        errorMessage: null,
      });
      expect(syncRun.finishedAt).toBeInstanceOf(Date);
      expect(await findSavedRates()).toEqual([
        { code: 'BRL', rate: '5.42', rateDate: '2026-09-28', syncRunId: syncRun.id },
        { code: 'EUR', rate: '0.92', rateDate: '2026-09-28', syncRunId: syncRun.id },
        { code: 'BRL', rate: '5.43', rateDate: '2026-09-29', syncRunId: syncRun.id },
      ]);
    });

    it('asks the provider for every currency except the base', async () => {
      await service.syncRates({ type: SyncType.DAILY });

      const [{ base, currencies }] = ctx.provider.fetchRecentRates.mock.calls[0];

      expect(base).toBe('USD');
      expect([...currencies].sort()).toEqual([
        'ARS',
        'AUD',
        'BRL',
        'CAD',
        'CHF',
        'CNY',
        'EUR',
        'GBP',
        'JPY',
      ]);
    });

    it('does not duplicate rates when run twice and updates the rate revised by the provider', async () => {
      ctx.provider.fetchRecentRates.mockResolvedValue([
        { currencyCode: 'BRL', rate: '5.42', rateDate: '2026-09-28' },
        { currencyCode: 'EUR', rate: '0.92', rateDate: '2026-09-28' },
      ]);
      await service.syncRates({ type: SyncType.DAILY });

      ctx.provider.fetchRecentRates.mockResolvedValue([
        { currencyCode: 'BRL', rate: '5.4321', rateDate: '2026-09-28' },
        { currencyCode: 'EUR', rate: '0.92', rateDate: '2026-09-28' },
        { currencyCode: 'BRL', rate: '5.43', rateDate: '2026-09-29' },
      ]);
      await service.syncRates({ type: SyncType.DAILY });

      const secondRun = await ctx.dataSource
        .getRepository(SyncRun)
        .findOne({ where: {}, order: { startedAt: 'DESC', id: 'DESC' } });

      expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(3);
      expect(await findSavedRates()).toEqual([
        { code: 'BRL', rate: '5.4321', rateDate: '2026-09-28', syncRunId: secondRun!.id },
        { code: 'EUR', rate: '0.92', rateDate: '2026-09-28', syncRunId: secondRun!.id },
        { code: 'BRL', rate: '5.43', rateDate: '2026-09-29', syncRunId: secondRun!.id },
      ]);
      expect(secondRun).toMatchObject({ status: SyncStatus.SUCCESS, rowsInserted: 3 });
    });

    it('ignores a currency that is not in the database', async () => {
      ctx.provider.fetchRecentRates.mockResolvedValue([
        { currencyCode: 'BRL', rate: '5.42', rateDate: '2026-09-28' },
        { currencyCode: 'XYZ', rate: '1.23', rateDate: '2026-09-28' },
      ]);

      await service.syncRates({ type: SyncType.DAILY });

      const [syncRun] = await findSyncRuns();

      expect(syncRun).toMatchObject({ status: SyncStatus.SUCCESS, rowsInserted: 1 });
      expect((await findSavedRates()).map(({ code }) => code)).toEqual(['BRL']);
    });

    it('finishes the run as SUCCESS with no rows when the provider returns nothing', async () => {
      await service.syncRates({ type: SyncType.DAILY });

      const [syncRun] = await findSyncRuns();

      expect(syncRun).toMatchObject({ status: SyncStatus.SUCCESS, rowsInserted: 0 });
      expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(0);
    });

    it('marks the run as FAILED with the translated message when the provider is unavailable', async () => {
      ctx.provider.fetchRecentRates.mockRejectedValue(
        new ExchangeRateProviderUnavailableException('timeout'),
      );

      await service.syncRates({ type: SyncType.DAILY });

      const [syncRun] = await findSyncRuns();

      expect(syncRun).toMatchObject({
        status: SyncStatus.FAILED,
        rowsInserted: 0,
        errorMessage: 'Provedor de cotações indisponível',
      });
      expect(syncRun.finishedAt).toBeInstanceOf(Date);
      expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(0);
    });

    it('cuts the error message to 255 characters', async () => {
      const longMessage = 'x'.repeat(300);
      ctx.provider.fetchRecentRates.mockRejectedValue(new Error(longMessage));

      await service.syncRates({ type: SyncType.DAILY });

      const [syncRun] = await findSyncRuns();

      expect(syncRun.status).toBe(SyncStatus.FAILED);
      expect(syncRun.errorMessage).toBe(longMessage.slice(0, 255));
    });
  });

  describe('getStatus', () => {
    it('returns nulls when there are no runs and no rates', async () => {
      await expect(service.getStatus()).resolves.toEqual({ lastRun: null, latestRateDate: null });
    });

    it('returns the latest DAILY run, ignoring newer BACKFILL runs, and the latest rate date', async () => {
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.DAILY,
        status: SyncStatus.SUCCESS,
        startedAt: new Date('2026-09-27T10:00:00Z'),
        rowsInserted: 9,
      });
      const latestDaily = await seedSyncRun(ctx.dataSource, {
        type: SyncType.DAILY,
        status: SyncStatus.FAILED,
        startedAt: new Date('2026-09-28T10:00:00Z'),
        finishedAt: new Date('2026-09-28T10:00:05Z'),
        rowsInserted: 0,
        errorMessage: 'Provedor de cotações indisponível',
      });
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.BACKFILL,
        status: SyncStatus.SUCCESS,
        startedAt: new Date('2026-09-29T10:00:00Z'),
        rowsInserted: 88000,
      });
      await seedRates(ctx.dataSource, { date: '2026-09-25', rates: { BRL: '5.41' } });
      await seedRates(ctx.dataSource, { date: '2026-09-26', rates: { EUR: '0.92' } });

      await expect(service.getStatus()).resolves.toEqual({
        lastRun: {
          type: SyncType.DAILY,
          status: SyncStatus.FAILED,
          startedAt: latestDaily.startedAt,
          finishedAt: latestDaily.finishedAt,
          rowsInserted: 0,
          error: 'Provedor de cotações indisponível',
        },
        latestRateDate: '2026-09-26',
      });
    });

    it('returns no last run when only BACKFILL runs exist', async () => {
      await seedSyncRun(ctx.dataSource, { type: SyncType.BACKFILL });

      await expect(service.getStatus()).resolves.toMatchObject({ lastRun: null });
    });
  });
});
