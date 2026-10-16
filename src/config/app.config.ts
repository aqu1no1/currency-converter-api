import { registerAs } from '@nestjs/config';
import { loadEnv, splitList } from '@/config/env.schema';

export const appConfig = registerAs('app', () => {
  const env = loadEnv();

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: splitList(env.CORS_ORIGINS),
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  };
});
