import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    expect: {
      requireAssertions: true,
    },
    onStackTrace(error, { file }) {
      // Reduce context noise for LLM.

      // If we've encountered a ReferenceError, show the whole stack.
      if (error.name === 'ReferenceError') {
        return;
      }

      // Reject all frames from third party libraries.
      if (file.includes('node_modules')) {
        return false;
      }
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      enabled: true,
    },
  },
});
