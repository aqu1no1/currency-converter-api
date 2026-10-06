import { createTestingApp, type TestingApp } from '../utils/create-testing-app';

describe('Validation and language (e2e)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('returns 400 for an unknown query parameter', async () => {
    await ctx.http
      .get('/exchange-rates')
      .query({ foo: 'bar' })
      .expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['property foo should not exist'],
      });
  });

  describe('DTO validation errors', () => {
    const invalidPage = () => ctx.http.get('/exchange-rates').query({ perPage: 101 });

    it('answers in pt-BR by default', async () => {
      await invalidPage().expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['perPage precisa ser no máximo 100'],
      });
    });

    it('answers in en with ?lang=en', async () => {
      await invalidPage()
        .query({ lang: 'en' })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: ['perPage must be at most 100'],
        });
    });

    it('answers in en with Accept-Language: en', async () => {
      await invalidPage()
        .set('Accept-Language', 'en')
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: ['perPage must be at most 100'],
        });
    });
  });

  describe('pipe and service errors', () => {
    const negativeAmount = () =>
      ctx.http.get('/exchange-rates/convert').query({ from: 'EUR', to: 'BRL', amount: '-1' });

    it('answers in pt-BR by default', async () => {
      await negativeAmount().expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Valor não pode ser negativo(a)',
      });
    });

    it('answers in en with ?lang=en', async () => {
      await negativeAmount().query({ lang: 'en' }).expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Amount cannot be negative',
      });
    });

    it('answers in en with Accept-Language: en', async () => {
      await ctx.http
        .get('/exchange-rates/history')
        .query({ from: 'EUR', to: 'BRL', start: '2026-09-03', end: '2026-09-01' })
        .set('Accept-Language', 'en')
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'The end date must be on or after the start date',
        });
    });
  });
});
