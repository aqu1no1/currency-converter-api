import { createTestingApp, type TestingApp } from '../utils/create-testing-app';

describe('Health (e2e)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('returns ok when the database is up', async () => {
    await ctx.http.get('/health').expect(200, { status: 'ok' });
  });
});
