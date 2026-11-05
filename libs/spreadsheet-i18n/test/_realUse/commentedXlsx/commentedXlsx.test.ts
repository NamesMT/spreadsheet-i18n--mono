import { readFile, rm } from 'node:fs/promises'
import { scanConvert } from '#src/core.js'
import { resolve } from 'pathe'
import { expect, it } from 'vitest'

// A comment row whose multi-line cell has `#` and other lines must be dropped whole
it('scanConvert an xlsx with a multi-line comment row', async () => {
  await rm(resolve(import.meta.dirname, '.output'), { recursive: true, force: true })

  await scanConvert(
    {
      outDir: resolve(import.meta.dirname, '.output'),
      include: /sheets\/commented.xlsx/,
      comments: '#',
      preserveStructure: true,
      xlsx: true,
    },
    resolve(import.meta.dirname),
  )

  const output = (path: string) => readFile(resolve(import.meta.dirname, '.output/sheets', path), 'utf8')
  expect(JSON.parse(await output('en.json'))).toEqual({ hello: 'Hello\nWorld', bye: 'Bye' })
  expect(JSON.parse(await output('vi.json'))).toEqual({ hello: 'Xin chao' })
})
