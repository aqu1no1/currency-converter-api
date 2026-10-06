import { Currency } from '@/currency/entities/currency.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates, seedSyncRun } from '../utils/seeds';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

describe('Migrations (integration)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('seeds the 10 supported currencies', async () => {
    const currencies = await ctx.dataSource
      .getRepository(Currency)
      .find({ order: { code: 'ASC' } });

    expect(currencies.map((currency) => currency.code)).toEqual([
      'ARS',
      'AUD',
      'BRL',
      'CAD',
      'CHF',
      'CNY',
      'EUR',
      'GBP',
      'JPY',
      'USD',
    ]);
  });

  it('rejects two rates of the same currency on the same day', async () => {
    await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42' } });

    await expect(
      seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.43' } }),
    ).rejects.toMatchObject({ driverError: { code: UNIQUE_VIOLATION } });
  });

  it('accepts the same currency on different days and different currencies on the same day', async () => {
    await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.42', EUR: '0.92' } });
    await seedRates(ctx.dataSource, { date: '2026-09-29', rates: { BRL: '5.43' } });

    expect(await ctx.dataSource.getRepository(ExchangeRate).count()).toBe(3);
  });

  it('accepts a rate without a sync run', async () => {
    const [rate] = await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { BRL: '5.42' },
      syncRunId: null,
    });

    const saved = await ctx.dataSource.getRepository(ExchangeRate).findOneBy({ id: rate.id });

    expect(saved?.syncRunId).toBeNull();
  });

  it('links a rate to an existing sync run', async () => {
    const syncRun = await seedSyncRun(ctx.dataSource);
    const [rate] = await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { BRL: '5.42' },
      syncRunId: syncRun.id,
    });

    const saved = await ctx.dataSource
      .getRepository(ExchangeRate)
      .findOne({ where: { id: rate.id }, relations: { syncRun: true } });

    expect(saved?.syncRun?.id).toBe(syncRun.id);
  });

  it('rejects a rate pointing to a sync run that does not exist', async () => {
    await expect(
      seedRates(ctx.dataSource, {
        date: '2026-09-28',
        rates: { BRL: '5.42' },
        syncRunId: '01a0e4e3-5b7e-763a-b9ec-000000000000',
      }),
    ).rejects.toMatchObject({ driverError: { code: FOREIGN_KEY_VIOLATION } });
  });
});
