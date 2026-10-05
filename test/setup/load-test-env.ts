import { existsSync } from 'node:fs';

if (existsSync('.env.test')) {
  process.loadEnvFile('.env.test');
} else if (!process.env.DB_HOST) {
  throw new Error('Missing .env.test: copy .env.test.example to .env.test');
}
