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
    include: ['src/__tests__/integration/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30000,
  },
})