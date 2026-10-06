import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates } from '../utils/seeds';

describe('GET /exchange-rates/convert (e2e)', () => {
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

  const badRequest = (message: string) => ({ statusCode: 400, error: 'Bad Request', message });

  describe('with rates', () => {
    beforeEach(async () => {
      await seedRates(ctx.dataSource, { date: '2026-09-28', rates: { BRL: '5.52', EUR: '0.92' } });
    });

    it('converts using the cross rate of the latest day', async () => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'EUR', to: 'BRL', amount: '100' })
        .expect(200, {
          from: 'EUR',
          to: 'BRL',
          amount: 100,
          rate: 6,
          result: 600,
          date: '2026-09-28',
        });
    });

    it('accepts lowercase codes', async () => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'eur', to: 'brl', amount: '2.5' })
        .expect(200, {
          from: 'EUR',
          to: 'BRL',
          amount: 2.5,
          rate: 6,
          result: 15,
          date: '2026-09-28',
        });
    });

    it('returns 400 for an unsupported currency', async () => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'XYZ', to: 'BRL', amount: '100' })
        .expect(400, badRequest('Moeda não suportado(a)'));
    });

    it('returns 400 for a code with the wrong length', async () => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'EURO', to: 'BRL', amount: '100' })
        .expect(400, badRequest('O código precisa ter exatamente 3 caracteres'));
    });

    it.each([
      ['missing', {}],
      ['not a number', { amount: 'abc' }],
      ['in scientific notation', { amount: '1e3' }],
    ])('returns 400 when amount is %s', async (_, amount) => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'EUR', to: 'BRL', ...amount })
        .expect(400, badRequest('O valor precisa ser um número'));
    });

    it('returns 400 for a negative amount', async () => {
      await ctx.http
        .get('/exchange-rates/convert')
        .query({ from: 'EUR', to: 'BRL', amount: '-1' })
        .expect(400, badRequest('Valor não pode ser negativo(a)'));
    });
  });

  it('returns 503 when there are no rates', async () => {
    await ctx.http
      .get('/exchange-rates/convert')
      .query({ from: 'EUR', to: 'BRL', amount: '100' })
      .expect(503, {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Cotação indisponível',
      });
  });
});
