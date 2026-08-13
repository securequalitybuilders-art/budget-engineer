import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/__tests__/**/*.test.{ts,tsx}', 'src/engine/rag/**/*.test.{ts,tsx}'],
    exclude: ['src/__tests__/integration/**', 'src/__tests__/smoke/**'],
    setupFiles: ['src/__tests__/setup.ts'],
    slowTestThreshold: 300,
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 1,
  },
})
