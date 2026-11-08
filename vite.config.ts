import { defineConfig } from 'vitest/config'

// en Pages el sitio vive dentro de /MetodosNumericosPremiumApp/
export default defineConfig({
  base: '/MetodosNumericosPremiumApp/',
  build: {
    chunkSizeWarningLimit: 5000
  },
  test: {
    include: ['tests/**/*.test.ts']
  }
})
