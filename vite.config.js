import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
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
  }
});
