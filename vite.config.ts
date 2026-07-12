import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globIgnores: ['**/opencv-*'],
      },
      manifest: {
        name: 'Dzenhare Budget Engineer Studio',
        short_name: 'Budget Engineer',
        description: 'AI-powered computational design → CAD → BIM → BOQ',
        theme_color: '#1a365d',
        background_color: '#0B0F19',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'design', 'utilities'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 512,
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'tailwind-merge', 'clsx', 'class-variance-authority'],
          'state-vendor': ['zustand', 'immer', 'dexie'],
          'cad-vendor': ['makerjs', '@react-three/fiber', '@react-three/drei', 'three'],
        },
      },
    },
  },
});
