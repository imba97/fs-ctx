import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    slowTestThreshold: 2000
  }
})
