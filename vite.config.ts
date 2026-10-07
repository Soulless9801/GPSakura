import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'production-files-only',
    apply: 'build',
    generateBundle() {
      // Inspect the actual module graph, so an accidental runtime import of a test fails CI.
      const forbidden = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$|\/src\/test\/|\/node_modules\/(?:vitest|@vitest|@testing-library)\/)/;
      for (const id of this.getModuleIds()) {
        if (forbidden.test(id.split('?')[0])) {
          this.error(`Development-only module in production: ${id}`);
        }
      }
    },
  }],
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
});
