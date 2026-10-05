import { registerAs } from '@nestjs/config';
import { loadEnv } from '@/config/env.schema';

export const loggerConfig = registerAs('logger', () => {
  const env = loadEnv();

  return {
    level: env.LOG_LEVEL,
    json: env.NODE_ENV === 'production',
  };
});
