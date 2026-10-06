import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates } from '../utils/seeds';

describe('GET /exchange-rates/latest/:base (e2e)', () => {
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

  it('returns the cross rates of the latest day in alphabetical order, without the base', async () => {
    await seedRates(ctx.dataSource, { date: '2026-09-27', rates: { BRL: '5.0', EUR: '1.0' } });
    await seedRates(ctx.dataSource, {
      date: '2026-09-28',
      rates: { JPY: '147.2', BRL: '5.52', EUR: '0.92' },
    });

    const { body } = await ctx.http.get('/exchange-rates/latest/eur').expect(200);

    expect(body).toEqual({
      base: 'EUR',
      date: '2026-09-28',
      rates: { BRL: 6, JPY: 160, USD: 1.086957 },
    });
    expect(Object.keys(body.rates)).toEqual(['BRL', 'JPY', 'USD']);
  });

  it('returns 404 for an unsupported currency', async () => {
    await ctx.http.get('/exchange-rates/latest/XYZ').expect(404, {
      statusCode: 404,
      error: 'Not Found',
      message: 'Moeda não suportado(a)',
    });
  });

  it('returns 503 when there are no rates', async () => {
    await ctx.http.get('/exchange-rates/latest/EUR').expect(503, {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Cotação indisponível',
    });
  });
});
