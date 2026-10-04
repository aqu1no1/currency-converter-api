import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          env: { NODE_ENV: 'test' },
          setupFiles: ['./test/setup/load-test-env.ts'],
          globalSetup: ['./test/setup/migrate-test-db.ts'],
          include: ['test/integration/**/*.int-spec.ts'],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          env: { NODE_ENV: 'test' },
          setupFiles: ['./test/setup/load-test-env.ts'],
          globalSetup: ['./test/setup/migrate-test-db.ts'],
          include: ['test/e2e/**/*.e2e-spec.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
