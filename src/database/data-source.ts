import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

export function getDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: process.env.LOG_QUERIES === 'true',
  };
}

export const ENV_FILE = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export default new DataSource({
  ...getDataSourceOptions(),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
