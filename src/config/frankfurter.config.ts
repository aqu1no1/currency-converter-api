import { registerAs } from '@nestjs/config';
import { loadEnv } from '@/config/env.schema';

export const frankfurterConfig = registerAs('frankfurter', () => {
  const env = loadEnv();

  return {
    baseUrl: env.FRANKFURTER_BASE_URL,
  };
});
