import type { ConfigType } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import type { databaseConfig } from '@/config';

export function getDataSourceOptions(
  database: ConfigType<typeof databaseConfig>,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.name,
    synchronize: false,
    logging: database.logQueries,
  };
}
