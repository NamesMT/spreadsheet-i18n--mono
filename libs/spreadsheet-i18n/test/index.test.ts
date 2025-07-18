import * as indexModule from '#src/index.js'
import { describe, expect, it } from 'vitest'

describe('index', () => {
  it('should export public APIs', () => {
    expect(Object.keys(indexModule)).toMatchInlineSnapshot(`
      [
        "defaultOptionsObject",
        "processSheetContent",
        "processSheetFile",
        "scanConvert",
        "readCsvFile",
        "readXlsxFile",
        "outputFile",
        "outputWriteMerge",
        "replacePunctuationSpace",
        "isEmptyCell",
        "transformToI18n",
        "filterCommentRows",
        "parseCsvData",
        "filterRowsWithEmptyKeys",
        "parseJiiCommand",
        "parseFileCommand",
        "processJiiKeys",
        "processFileKeys",
        "generateStandardI18nOutputs",
        "resolveOutputPath",
        "normalizePatterns",
      ]
    `)
  })
})
