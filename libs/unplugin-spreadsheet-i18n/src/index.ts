import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { resolve } from 'pathe'
import { processSheetFile, scanConvert } from 'spreadsheet-i18n'
import { createUnplugin } from 'unplugin'
import { createFilter } from 'vite'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options) => {
  let cwd = resolve()
  const filter = createFilter(options?.include, options?.exclude)

  return {
    name: 'unplugin-spreadsheet-i18n',
    enforce: 'pre',
    vite: {
      async configResolved(config) {
        cwd = resolve(config.root)
      },
      async handleHotUpdate({ file }) {
        await processSheetFile({
          filePath: file,
          options,
          filter,
          cwd,
        })
      },
    },
    async buildStart() {
      await scanConvert(options, cwd)
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
