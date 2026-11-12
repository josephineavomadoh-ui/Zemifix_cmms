import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for React component tests; switch to 'node' per test file when testing
    // pure service/utility logic to avoid DOM overhead.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.ts'],
    exclude: ['node_modules', '.next', 'prisma/migrations'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        'prisma/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/src': path.resolve(__dirname, 'src'),
    },
  },
});
