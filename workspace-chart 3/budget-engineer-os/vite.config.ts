import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // NOTE: `three`/`@react-three/*` are intentionally NOT pinned to a manual
        // chunk. They are only reachable through the dynamically-imported BimViewer,
        // so letting Rollup keep them inside that lazy chunk means the ~1MB 3D
        // payload loads on demand (when the user opts into 3D) instead of being
        // module-preloaded on first paint.
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'state-vendor': ['zustand'],
        },
      },
    },
  },
});
