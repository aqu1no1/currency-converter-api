import nock from 'nock';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncDailyRatesCron } from '@/sync/crons/sync-daily-rates.cron';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';

const FRANKFURTER_URL = 'https://api.frankfurter.dev';
const RATES_PATH = '/v2/rates';
const QUOTES = 'ARS,AUD,BRL,CAD,CHF,CNY,EUR,GBP,JPY';

const frankfurterResponse = [
  { date: '2026-09-25', base: 'USD', quote: 'BRL', rate: 5.3812 },
  { date: '2026-09-25', base: 'USD', quote: 'EUR', rate: 0.8563 },
  { date: '2026-09-28', base: 'USD', quote: 'BRL', rate: 5.4321 },
  { date: '2026-09-28', base: 'USD', quote: 'EUR', rate: 0.8517 },
  { date: '2026-09-28', base: 'USD', quote: 'JPY', rate: 149.37 },
];

describe('Daily sync through the real Frankfurter adapter (e2e)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);

    ctx = await createTestingApp({ useFakeProvider: false });
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await ctx?.close();
    nock.enableNetConnect();
  });

  it('syncs the simulated rates and converts with them', async () => {
    const scope = nock(FRANKFURTER_URL)
      .get(RATES_PATH)
      .query(
        (query) =>
          query.base === 'USD' &&
          query.quotes === QUOTES &&
          typeof query.from === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(query.from),
      )
      .reply(200, frankfurterResponse);

    await ctx.app.get(SyncDailyRatesCron).handle();

    expect(scope.isDone()).toBe(true);
    expect(await ctx.dataSource.getRepository(SyncRun).findOneByOrFail({})).toMatchObject({
      status: SyncStatus.SUCCESS,
      rowsInserted: 5,
    });

    // 2026-09-28: 1 EUR = 5.4321 / 0.8517 BRL = 6.377950...
    await ctx.http
      .get('/exchange-rates/convert')
      .query({ from: 'EUR', to: 'BRL', amount: '250' })
      .expect(200, {
        from: 'EUR',
        to: 'BRL',
        amount: 250,
        rate: 6.37795,
        result: 1594.49,
        date: '2026-09-28',
      });
  });

  it('keeps the run FAILED and the API without rates when Frankfurter answers garbage', async () => {
    nock(FRANKFURTER_URL)
      .get(RATES_PATH)
      .query(true)
      .reply(200, [{ date: '2026-09-28', base: 'USD', quote: 'BRL', rate: 'not a number' }]);

    await ctx.app.get(SyncDailyRatesCron).handle();

    expect(await ctx.dataSource.getRepository(SyncRun).findOneByOrFail({})).toMatchObject({
      status: SyncStatus.FAILED,
      errorMessage: 'Provedor de cotações indisponível',
    });
    await ctx.http
      .get('/exchange-rates/convert')
      .query({ from: 'EUR', to: 'BRL', amount: '250' })
      .expect(503);
  });
});
