import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [...configDefaults.include, 'test/**'],
    coverage: {
      exclude: [...configDefaults.coverage.exclude!, 'tsdown.config.ts'],
    },
  },
})
