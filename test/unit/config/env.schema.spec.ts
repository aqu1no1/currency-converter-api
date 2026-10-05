import { envSchema } from '@/config';

const requiredEnv = {
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'currency_converter',
  FRANKFURTER_BASE_URL: 'https://api.frankfurter.dev',
};

describe('envSchema', () => {
  it('applies the defaults of the optional variables', () => {
    const env = envSchema.parse(requiredEnv);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'log',
      DB_PORT: 5432,
      LOG_QUERIES: false,
    });
  });

  it('converts numbers and booleans received as text', () => {
    const env = envSchema.parse({
      ...requiredEnv,
      PORT: '3001',
      DB_PORT: '5433',
      LOG_QUERIES: 'true',
    });

    expect(env.PORT).toBe(3001);
    expect(env.DB_PORT).toBe(5433);
    expect(env.LOG_QUERIES).toBe(true);
  });

  it('lists every missing required variable', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(Object.keys(requiredEnv)),
    );
  });

  it('rejects an invalid value', () => {
    expect(() => envSchema.parse({ ...requiredEnv, PORT: '70000' })).toThrow();
    expect(() => envSchema.parse({ ...requiredEnv, FRANKFURTER_BASE_URL: 'not-a-url' })).toThrow();
  });
});
