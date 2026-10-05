import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig, ENV_FILE } from '@/config';
import { getDataSourceOptions } from '@/database/data-source-options';

// Usado só pela CLI do TypeORM (migrations), que roda fora do Nest
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export default new DataSource({
  ...getDataSourceOptions(databaseConfig()),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
