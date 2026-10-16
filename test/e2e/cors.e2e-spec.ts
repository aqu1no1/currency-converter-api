import { createTestingApp, type TestingApp } from '../utils/create-testing-app';

const ALLOWED_ORIGIN = 'http://localhost:5173';

describe('CORS (e2e)', () => {
  let ctx: TestingApp;

  beforeAll(async () => {
    ctx = await createTestingApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('allows the web site origin', async () => {
    const response = await ctx.http.get('/health').set('Origin', ALLOWED_ORIGIN).expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('does not allow an origin outside the list', async () => {
    const response = await ctx.http.get('/health').set('Origin', 'http://evil.example').expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the preflight with the allowed methods and headers', async () => {
    const response = await ctx.http
      .options('/exchange-rates/convert')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'accept-language')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Accept-Language');
  });
});
