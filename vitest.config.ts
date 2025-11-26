import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        css: 'injected',
      },
      preprocess: {
        style: () => {
          // Skip style preprocessing in tests to avoid jsdom issues
          return { code: '' };
        },
      },
    }),
  ],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
    alias: {
      // Ensure we use the browser version of Svelte in tests
      svelte: 'svelte',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: ['src/lib/types/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
    },
    conditions: ['browser', 'development'],
  },
});
