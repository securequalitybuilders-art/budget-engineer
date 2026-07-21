import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['src/__tests__/integration/**'],
    setupFiles: ['src/__tests__/setup.ts'],
    slowTestThreshold: 300,
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
      },
      forks: {
        minThreads: 1,
        maxThreads: 2,
      }
    }
  },
})
