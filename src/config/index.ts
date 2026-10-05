import { appConfig } from '@/config/app.config';
import { databaseConfig } from '@/config/database.config';
import { frankfurterConfig } from '@/config/frankfurter.config';
import { loggerConfig } from '@/config/logger.config';

export { appConfig, databaseConfig, frankfurterConfig, loggerConfig };
export { envSchema, loadEnv, validateEnv, type Env } from '@/config/env.schema';
export { ENV_FILE } from '@/config/env-file';

export const configs = [appConfig, loggerConfig, databaseConfig, frankfurterConfig];
