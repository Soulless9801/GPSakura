import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/three/')) {
            return 'three'
          }

          if (id.includes('/firebase/')) {
            return 'firebase'
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'vendor'
          }

          return undefined
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: '[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  define: {
    __DEV__: false,
  },
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
});
