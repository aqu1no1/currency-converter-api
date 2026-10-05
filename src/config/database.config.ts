import { registerAs } from '@nestjs/config';
import { loadEnv } from '@/config/env.schema';

export const databaseConfig = registerAs('database', () => {
  const env = loadEnv();

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    logQueries: env.LOG_QUERIES,
  };
});
