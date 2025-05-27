import { expect, it } from 'vitest'
import { logger } from '../src/helpers/logger'

it('logger', () => {
  expect(logger).toHaveProperty('info')
})
