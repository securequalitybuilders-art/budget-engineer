import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // the only >500kB chunks are opt-in/lazy (three.js, web-llm) — never on the critical path
    chunkSizeWarningLimit: 7000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'state-vendor': ['zustand'],
          'three-vendor': ['three'],
        },
      },
    },
  },
});
