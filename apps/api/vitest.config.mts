import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    root: './',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // The database e2e suites share one test database, so files run one at a time.
    fileParallelism: false,
  },
  // SWC is needed so decorator metadata (Nest DI) is emitted in tests.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
