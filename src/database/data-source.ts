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
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: process.env.LOG_QUERIES === 'true',
  };
}

if (existsSync('.env')) process.loadEnvFile('.env');

export default new DataSource(getDataSourceOptions());
