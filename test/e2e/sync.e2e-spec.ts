import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { SyncRun } from '@/sync/entities/sync-run.entity';
import { SyncStatus } from '@/sync/enums/sync-status.enum';
import { SyncType } from '@/sync/enums/sync-type.enum';
import { ExchangeRateProviderUnavailableException } from '@ports/exchange-rate-provider.port';
import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates, seedSyncRun } from '../utils/seeds';
import { waitFor } from '../utils/wait-for';

vi.mock('@utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe('Sync (e2e)', () => {
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

  const findRun = (id: string) => ctx.dataSource.getRepository(SyncRun).findOneByOrFail({ id });

  const waitForRunToFinish = async (id: string): Promise<SyncRun> => {
    await waitFor(async () => (await findRun(id)).status !== SyncStatus.RUNNING);
    return findRun(id);
  };

  describe('GET /sync', () => {
    beforeEach(async () => {
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.BACKFILL,
        status: SyncStatus.SUCCESS,
        startedAt: new Date('2026-09-26T10:00:00Z'),
      });
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.DAILY,
        status: SyncStatus.FAILED,
        startedAt: new Date('2026-09-27T09:00:00Z'),
      });
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.DAILY,
        status: SyncStatus.SUCCESS,
        startedAt: new Date('2026-09-28T09:00:00Z'),
      });
    });

    const summarize = (data: SyncRun[]) =>
      data.map(({ type, status, startedAt }) => [type, status, startedAt]);

    it('lists the runs newest first, paginated', async () => {
      const { body } = await ctx.http.get('/sync').query({ perPage: 2 }).expect(200);

      expect(summarize(body.data)).toEqual([
        ['DAILY', 'SUCCESS', '2026-09-28T09:00:00.000Z'],
        ['DAILY', 'FAILED', '2026-09-27T09:00:00.000Z'],
      ]);
      expect(body).toMatchObject({ total: 3, page: 1, perPage: 2, totalPages: 2 });
    });

    it('filters by type', async () => {
      const { body } = await ctx.http.get('/sync').query({ type: 'BACKFILL' }).expect(200);

      expect(summarize(body.data)).toEqual([['BACKFILL', 'SUCCESS', '2026-09-26T10:00:00.000Z']]);
      expect(body.total).toBe(1);
    });

    it('filters by status', async () => {
      const { body } = await ctx.http.get('/sync').query({ status: 'SUCCESS' }).expect(200);

      expect(summarize(body.data)).toEqual([
        ['DAILY', 'SUCCESS', '2026-09-28T09:00:00.000Z'],
        ['BACKFILL', 'SUCCESS', '2026-09-26T10:00:00.000Z'],
      ]);
    });

    it('returns 400 for an unknown type', async () => {
      await ctx.http
        .get('/sync')
        .query({ type: 'WEEKLY' })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: ['type precisa ser um destes valores: DAILY,BACKFILL'],
        });
    });
  });

  describe('GET /sync/status', () => {
    it('returns both fields as null when the database is empty', async () => {
      await ctx.http.get('/sync/status').expect(200, { lastRun: null, latestRateDate: null });
    });

    it('returns the latest DAILY run and the latest rate date', async () => {
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.DAILY,
        status: SyncStatus.SUCCESS,
        startedAt: new Date('2026-09-28T09:00:00Z'),
        finishedAt: new Date('2026-09-28T09:00:03Z'),
        rowsInserted: 45,
      });
      await seedSyncRun(ctx.dataSource, {
        type: SyncType.BACKFILL,
        status: SyncStatus.RUNNING,
        startedAt: new Date('2026-09-29T10:00:00Z'),
        finishedAt: null,
      });
      await seedRates(ctx.dataSource, { date: '2026-09-26', rates: { BRL: '5.41' } });

      await ctx.http.get('/sync/status').expect(200, {
        lastRun: {
          type: 'DAILY',
          status: 'SUCCESS',
          startedAt: '2026-09-28T09:00:00.000Z',
          finishedAt: '2026-09-28T09:00:03.000Z',
          rowsInserted: 45,
          error: null,
        },
        latestRateDate: '2026-09-26',
      });
    });
  });

  describe('POST /sync/backfill', () => {
    it('answers 202 with a RUNNING run and saves the rates in the background', async () => {
      ctx.provider.fetchRatesInRange.mockImplementation(async ({ start }) =>
        start === '2000-01-01'
          ? [
              { currencyCode: 'BRL', rate: '1.8', rateDate: '2000-01-03' },
              { currencyCode: 'EUR', rate: '0.9847', rateDate: '2000-01-03' },
            ]
          : [],
      );

      const { body } = await ctx.http.post('/sync/backfill').expect(202);

      expect(body).toMatchObject({ type: 'BACKFILL', status: 'RUNNING', rowsInserted: 0 });

      const run = await waitForRunToFinish(body.id);

      expect(run).toMatchObject({ status: SyncStatus.SUCCESS, rowsInserted: 2 });
      expect(ctx.provider.fetchRatesInRange).toHaveBeenCalledTimes(
        new Date().getFullYear() - 2000 + 1,
      );
      expect(await ctx.dataSource.getRepository(ExchangeRate).countBy({ syncRunId: body.id })).toBe(
        2,
      );
    });

    it('answers 409 while a backfill is running', async () => {
      let releaseFirstYear!: () => void;
      ctx.provider.fetchRatesInRange.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirstYear = () => resolve([]);
          }),
      );

      const { body } = await ctx.http.post('/sync/backfill').expect(202);
      await waitFor(() => ctx.provider.fetchRatesInRange.mock.calls.length === 1);

      await ctx.http.post('/sync/backfill').expect(409, {
        statusCode: 409,
        error: 'Conflict',
        message: 'Carga inicial já está em execução',
      });

      releaseFirstYear();
      const run = await waitForRunToFinish(body.id);

      expect(run.status).toBe(SyncStatus.SUCCESS);
      expect(await ctx.dataSource.getRepository(SyncRun).countBy({ type: SyncType.BACKFILL })).toBe(
        1,
      );
    });

    it('accepts a new backfill after the previous one finished', async () => {
      const first = await ctx.http.post('/sync/backfill').expect(202);
      await waitForRunToFinish(first.body.id);

      const second = await ctx.http.post('/sync/backfill').expect(202);
      await waitForRunToFinish(second.body.id);

      expect(second.body.id).not.toBe(first.body.id);
    });

    it('marks the run as FAILED when the provider fails during the backfill', async () => {
      ctx.provider.fetchRatesInRange
        .mockResolvedValueOnce([{ currencyCode: 'BRL', rate: '1.8', rateDate: '2000-01-03' }])
        .mockRejectedValueOnce(new ExchangeRateProviderUnavailableException('timeout'));

      const { body } = await ctx.http.post('/sync/backfill').expect(202);
      const run = await waitForRunToFinish(body.id);

      expect(run).toMatchObject({
        status: SyncStatus.FAILED,
        errorMessage: 'Provedor de cotações indisponível',
      });
      expect(run.finishedAt).toBeInstanceOf(Date);
      expect(ctx.provider.fetchRatesInRange).toHaveBeenCalledTimes(2);
    });
  });
});
