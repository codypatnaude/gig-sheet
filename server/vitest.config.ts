import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@gig-sheets/shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
});
