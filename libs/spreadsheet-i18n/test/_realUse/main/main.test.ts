import { rm } from 'node:fs/promises'
import { scanConvert } from '#src/core.js'
import { resolve } from 'pathe'
import { it } from 'vitest'

it('scanConvert', async () => {
  // Clean up output dir
  await rm(resolve(import.meta.dirname, '.output'), { recursive: true, force: true })

  await scanConvert(
    {
      outDir: resolve(import.meta.dirname, '.output'),
      include: /(?:\/|\\|^)i18n_\w*\.csv$/,
      fileProcessor: true,
      jiiProcessor: true,
    },
    resolve(import.meta.dirname),
  )
})
