import { execSync } from 'node:child_process';

export default function migrateTestDatabase(): void {
  try {
    execSync('pnpm migration:run', {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
    throw new Error(
      `Could not run the migrations on the test database. Is it up? Run "pnpm test:infra:up".\n${output}`,
    );
  }
}
