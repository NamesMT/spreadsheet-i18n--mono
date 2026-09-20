import type { Options } from '#src/types.js'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { scanConvert } from '#src/core.js'
import { dirname, join, resolve } from 'pathe'
import { afterEach, expect, it } from 'vitest'

const tempDirs: string[] = []

async function setupProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ssi-scan-cwd-'))
  tempDirs.push(root)
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content, 'utf8')
  }
  return root
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

// Regression: scanConvert must apply its filtering consistently against the
// `cwd` argument, even when it differs from process.cwd().
it('scanConvert honours cwd for plain string include globs', async () => {
  const root = await setupProject({
    'i18n.csv': 'KEY,en\nroot.key,Root',
    'frontend/i18n.csv': 'KEY,en\nfrontend.key,Front',
  })
  const outDir = resolve(root, 'out')

  const options: Options = {
    include: ['i18n.csv', 'frontend/i18n.csv'],
    outDir,
    preserveStructure: false, // both files merge into out/en.json
  }

  await scanConvert(options, root)

  const merged = JSON.parse(await readFile(resolve(outDir, 'en.json'), 'utf8'))
  expect(merged).toEqual({ 'root.key': 'Root', 'frontend.key': 'Front' })
})

// Anchored RegExps in scanConvert are matched against paths relative to `cwd`;
// processSheetFile must not re-test them against the absolute path.
it('scanConvert matches anchored RegExps against cwd-relative paths', async () => {
  const root = await setupProject({
    'i18n.csv': 'KEY,en\nroot.key,Root',
    'frontend/i18n.csv': 'KEY,en\nfrontend.key,Front',
  })
  const outDir = resolve(root, 'out')

  const options: Options = {
    include: /^frontend\//,
    outDir,
    preserveStructure: true, // output goes to out/frontend/en.json
  }

  await scanConvert(options, root)

  const output = JSON.parse(await readFile(resolve(outDir, 'frontend/en.json'), 'utf8'))
  expect(output).toEqual({ 'frontend.key': 'Front' })
})
