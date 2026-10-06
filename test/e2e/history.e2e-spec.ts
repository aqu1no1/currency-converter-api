import { createTestingApp, type TestingApp } from '../utils/create-testing-app';
import { resetDatabase } from '../utils/database';
import { seedRates } from '../utils/seeds';

describe('GET /exchange-rates/history (e2e)', () => {
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

  const history = (query: Record<string, string>) =>
    ctx.http.get('/exchange-rates/history').query({ from: 'EUR', to: 'BRL', ...query });

  it('returns one item per day with both currencies, oldest first', async () => {
    await seedRates(ctx.dataSource, { date: '2026-09-03', rates: { BRL: '5.3' } });
    await seedRates(ctx.dataSource, { date: '2026-09-02', rates: { BRL: '5.4', EUR: '0.9' } });
    await seedRates(ctx.dataSource, { date: '2026-09-01', rates: { BRL: '5.0', EUR: '1.0' } });

    await history({ start: '2026-09-01', end: '2026-09-03' }).expect(200, {
      from: 'EUR',
      to: 'BRL',
      history: [
        { date: '2026-09-01', rate: 5 },
        { date: '2026-09-02', rate: 6 },
      ],
    });
  });

  it('returns an empty history for a period without rates', async () => {
    await history({ start: '2026-08-01', end: '2026-08-31' }).expect(200, {
      from: 'EUR',
      to: 'BRL',
      history: [],
    });
  });

  it('returns 400 for a date in the wrong format', async () => {
    await history({ start: '2026/09/01', end: '2026-09-03' }).expect(400, {
      statusCode: 400,
      error: 'Bad Request',
      message: ['start precisa estar no formato AAAA-MM-DD', 'start não é uma data válida'],
    });
  });

  it.each(['2026-02-30', '2026-02-29'])(
    'returns 400 for a date that does not exist (%s)',
    async (start) => {
      await history({ start, end: '2026-03-31' }).expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['start não é uma data válida'],
      });
    },
  );

  it('returns 400 when start is after end', async () => {
    await history({ start: '2026-09-03', end: '2026-09-01' }).expect(400, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'A data final precisa ser igual ou posterior à data inicial',
    });
  });

  it.each([
    ['exactly 2 years', '2024-01-01', '2026-01-01'],
    ['2 years from Feb 29th of a leap year', '2024-02-29', '2026-03-01'],
  ])('accepts a period of %s', async (_, start, end) => {
    await history({ start, end }).expect(200, { from: 'EUR', to: 'BRL', history: [] });
  });

  it.each([
    ['one day over 2 years', '2024-01-01', '2026-01-02'],
    ['one day over 2 years from Feb 29th', '2024-02-29', '2026-03-02'],
  ])('returns 400 for a period of %s', async (_, start, end) => {
    await history({ start, end }).expect(400, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'O período pode ter no máximo 2 anos',
    });
  });
});
