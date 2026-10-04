import { existsSync } from 'node:fs';

if (!existsSync('.env.test')) {
  throw new Error('Missing .env.test: copy .env.test.example to .env.test');
}

process.loadEnvFile('.env.test');
