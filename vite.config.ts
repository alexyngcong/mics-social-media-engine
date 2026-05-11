import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Build-time timestamp baked into the bundle so users can verify cache freshness
const BUILD_TIME = new Date().toLocaleString('en-GB', {
  day: 'numeric', month: 'short', year: '2-digit',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
}) + ' UAE';

export default defineConfig({
  plugins: [react()],
  base: '/mics-social-media-engine/',
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Split big dependencies into their own chunks so they cache independently
    // and the main app bundle stays small. compromise.js is ~140KB gzip but
    // changes rarely, so it's a perfect candidate for a separate chunk.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // NLP layer — large and cached separately so app updates don't bust it
          'compromise-nlp': ['compromise'],
          // React framework — extremely stable, big win for cache hit rate
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
