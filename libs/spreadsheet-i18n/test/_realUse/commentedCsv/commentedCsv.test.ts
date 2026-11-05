import { readFile, rm } from 'node:fs/promises'
import { scanConvert } from '#src/core.js'
import { resolve } from 'pathe'
import { expect, it } from 'vitest'

// `\n` endings, a BOM, a comment row above the header and a multi-line cell with `#` lines
it('scanConvert a commented `\\n` csv', async () => {
  await rm(resolve(import.meta.dirname, '.output'), { recursive: true, force: true })

  await scanConvert(
    {
      outDir: resolve(import.meta.dirname, '.output'),
      include: /sheets\/i18n.csv/,
      comments: '#',
      fileProcessor: true,
      preserveStructure: true,
    },
    resolve(import.meta.dirname),
  )

  const output = (path: string) => readFile(resolve(import.meta.dirname, '.output/sheets', path), 'utf8')
  expect(JSON.parse(await output('en.json'))).toEqual({ hello: 'Hello', bye: 'Bye' })
  expect(JSON.parse(await output('vi.json'))).toEqual({ hello: 'Xin chao', bye: 'Tam biet' })
  await expect(output('terms_en.md')).resolves.toBe('# Terms\n#Not a comment, inside quotes')
})
