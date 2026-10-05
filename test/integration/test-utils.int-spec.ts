import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates, seedSyncRun } from '../utils/seeds';
import { waitFor } from '../utils/wait-for';

vi.mock('@utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe('Test utils (integration)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
    ctx.provider.reset();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('seeds rates linked to a sync run', async () => {
    const syncRun = await seedSyncRun(ctx.dataSource, { type: SyncType.BACKFILL });
    await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { BRL: '5.4321', EUR: '0.92' },
      syncRunId: syncRun.id,
    });

    const saved = await ctx.dataSource
      .getRepository(ExchangeRate)
      .find({ relations: { currency: true }, order: { rate: 'ASC' } });

    expect(
      saved.map(({ currency, rate, rateDate, syncRunId }) => [
        currency.code,
        rate,
        rateDate,
        syncRunId,
      ]),
    ).toEqual([
      ['EUR', '0.92', '2026-09-28', syncRun.id],
      ['BRL', '5.4321', '2026-09-28', syncRun.id],
    ]);
  });

  it('rejects a currency that is not in the database', async () => {
    await expect(
      seedRates(ctx.dataSource, { date: '2026-09-28', rates: { XYZ: '1' } }),
    ).rejects.toThrow('Unknown currency in seed: XYZ');
  });

  it('resetDatabase clears rates and sync runs but keeps the currencies', async () => {
    const syncRun = await seedSyncRun(ctx.dataSource);
    await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { BRL: '5.42' },
      syncRunId: syncRun.id,
    });

    await resetDatabase(ctx.dataSource);

    expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(0);
    expect(await ctx.dataSource.getRepository(SyncRun).count()).toBe(0);
    expect(await ctx.dataSource.getRepository(Currency).count()).toBe(10);
  });

  it('replaces the exchange rate provider with the fake one', async () => {
    ctx.provider.fetchRatesInRange.mockResolvedValue([
      { currencyCode: 'BRL', rate: '5.42', rateDate: '2026-09-28' },
    ]);

    await ctx.http.post('/sync/backfill').expect(202);

    await waitFor(async () => {
      const run = await ctx.dataSource
        .getRepository(SyncRun)
        .findOneBy({ type: SyncType.BACKFILL });
      return run?.status === SyncStatus.SUCCESS;
    });

    expect(ctx.provider.fetchRatesInRange).toHaveBeenCalled();
    expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(1);
  });
});
