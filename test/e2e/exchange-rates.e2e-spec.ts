import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates } from '../utils/seeds';

interface ExchangeRateBody {
  currencyId: string;
  rate: string;
  rateDate: string;
}

describe('GET /exchange-rates (e2e)', () => {
  let ctx: TestingApp;
  let currencyCodeById: Map<string, string>;

  beforeAll(async () => {
    ctx = await createTestingApp();

    const { body } = await ctx.http.get('/currencies');
    currencyCodeById = new Map(
      body.map(({ id, code }: { id: string; code: string }) => [id, code]),
    );
  });

  beforeEach(async () => {
    await resetDatabase(ctx.dataSource);
    await seedRates(ctx.dataSource, { date: '2026-09-27', rates: { BRL: '5.41', EUR: '0.91' } });
    await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { JPY: '148.2', BRL: '5.42', EUR: '0.92' },
    });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  const summarize = (data: ExchangeRateBody[]) =>
    data.map(({ currencyId, rate, rateDate }) => [
      rateDate,
      currencyCodeById.get(currencyId),
      rate,
    ]);

  it('returns the first page with the default page size, newest first and by code', async () => {
    const { body } = await ctx.http.get('/exchange-rates').expect(200);

    expect(summarize(body.data)).toEqual([
      ['2026-09-28', 'BRL', '5.42'],
      ['2026-09-28', 'EUR', '0.92'],
      ['2026-09-28', 'JPY', '148.2'],
      ['2026-09-27', 'BRL', '5.41'],
      ['2026-09-27', 'EUR', '0.91'],
    ]);
    expect(body).toMatchObject({ total: 5, page: 1, perPage: 20, totalPages: 1 });
  });

  it('paginates with page and perPage', async () => {
    const { body } = await ctx.http
      .get('/exchange-rates')
      .query({ page: 2, perPage: 2 })
      .expect(200);

    expect(summarize(body.data)).toEqual([
      ['2026-09-28', 'JPY', '148.2'],
      ['2026-09-27', 'BRL', '5.41'],
    ]);
    expect(body).toMatchObject({ total: 5, page: 2, perPage: 2, totalPages: 3 });
  });

  it('returns an empty page after the last one', async () => {
    const { body } = await ctx.http
      .get('/exchange-rates')
      .query({ page: 4, perPage: 2 })
      .expect(200);

    expect(body).toEqual({ data: [], total: 5, page: 4, perPage: 2, totalPages: 3 });
  });

  it('filters by code, in any case', async () => {
    const { body } = await ctx.http.get('/exchange-rates').query({ code: 'brl' }).expect(200);

    expect(summarize(body.data)).toEqual([
      ['2026-09-28', 'BRL', '5.42'],
      ['2026-09-27', 'BRL', '5.41'],
    ]);
    expect(body).toMatchObject({ total: 2, totalPages: 1 });
  });

  it('returns 400 when perPage is over 100', async () => {
    await ctx.http
      .get('/exchange-rates')
      .query({ perPage: 101 })
      .expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['perPage precisa ser no máximo 100'],
      });
  });

  it('returns 400 when page is not a positive integer', async () => {
    await ctx.http
      .get('/exchange-rates')
      .query({ page: 0 })
      .expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['page precisa ser no mínimo 1'],
      });
  });
});
