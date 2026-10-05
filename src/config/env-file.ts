// Arquivo .env lido pelo ConfigModule e pela CLI do TypeORM
export const ENV_FILE = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
