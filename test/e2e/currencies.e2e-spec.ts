import { createTestingApp, type TestingApp } from '../utils/create-testing-app';

describe('Currencies (e2e)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('GET /currencies returns the 10 currencies in alphabetical order', async () => {
    const { body } = await ctx.http.get('/currencies').expect(200);

    expect(body.map(({ code, name }: { code: string; name: string }) => [code, name])).toEqual([
      ['ARS', 'Peso argentino'],
      ['AUD', 'Dólar australiano'],
      ['BRL', 'Real brasileiro'],
      ['CAD', 'Dólar canadense'],
      ['CHF', 'Franco suíço'],
      ['CNY', 'Yuan chinês'],
      ['EUR', 'Euro'],
      ['GBP', 'Libra esterlina'],
      ['JPY', 'Iene japonês'],
      ['USD', 'Dólar americano'],
    ]);
  });
});
