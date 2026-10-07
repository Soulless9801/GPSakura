import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'node', // component tests opt in to jsdom with `// @vitest-environment jsdom`
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'netlify/**/*.test.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'netlify/functions/*.ts', 'db/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      // Game rules, utilities and the serverless functions are fully unit-tested, so they
      // get a hard floor; the React UI and the canvas/WebGL demos are mostly untested, so
      // the global floor is low and only exists to catch wholesale deletion of tests.
      thresholds: {
        statements: 40,
        branches: 45,
        functions: 35,
        lines: 40,
        'src/utils/**': { statements: 95, branches: 85, functions: 95, lines: 95 },
        'src/entities/**': { statements: 95, branches: 85, functions: 95, lines: 95 },
        'src/blackjack/core/**': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'src/shengji/core/**': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'src/shengji/advisor/**': { statements: 90, branches: 75, functions: 90, lines: 90 },
        'netlify/functions/*.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
      },
    },
  },
}));
