import { registerAs } from '@nestjs/config';
import { loadEnv } from '@/config/env.schema';

export const appConfig = registerAs('app', () => {
  const env = loadEnv();

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  };
});
