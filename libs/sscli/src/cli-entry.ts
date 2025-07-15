#!/usr/bin/env node

import type { Options } from 'spreadsheet-i18n'
import { resolve } from 'node:path'
import { defineCommand, runMain } from 'citty'
import { scanConvert } from 'spreadsheet-i18n'

function parsePossibleRegExp(value?: string): undefined | string | RegExp {
  if (!value)
    return value

  // Check if it matches the pattern of a RegExp string
  const regexpPattern = /^\/(.+)\/([a-z]*)$/i
  const match = value.match(regexpPattern)

  if (match) {
    try {
      const [, pattern, flags] = match
      return new RegExp(pattern, flags)
    }
    catch {
      // Fallback to raw string if RegExp construction fails
      return value
    }
  }

  return value
}

const main = defineCommand({
  meta: {
    name: 'sscli',
    description: 'Spreadsheet command-line internalization tool',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'The working directory for the process',
    },
    include: {
      alias: ['i'],
      type: 'string',
      description: 'Glob pattern, regex, or string to include files, can be provided multiple times: `sscli -i A.csv -i B.csv`',
      default: /(?:[/\\]|^)i18n\.[cdt]sv$/.toString(),
    },
    exclude: {
      alias: ['x'],
      type: 'string',
      description: 'Glob pattern, regex, or string to exclude files, can be provided multiple times: `sscli -x A.csv -x B.csv',
    },
    outDir: {
      alias: ['o'],
      type: 'string',
      description: 'Output directory for the processed files',
    },
    keyStyle: {
      type: 'string',
      description: 'Key style for the output JSON',
      default: 'flat',
      valueHint: '"flat" | "nested"',
    },
    xlsx: {
      type: 'boolean',
      description: 'Enables support for spreadsheet formats (.xls, .xlsx, .xlsm, .xlsb, .ods, .fods)',
      default: false,
    },
    keyColumn: {
      type: 'string',
      description: 'The name of the column to be used as the key/identifier for translations',
      default: 'KEY',
    },
    valueColumn: {
      type: 'string',
    },
    localesMatcher: {
      type: 'string',
      description: 'Regular expression to identify locale columns when `valueColumn` is not defined',
      default: /^\w{2}(?:-\w{2,4})?$/.toString(),
    },
    delimiter: {
      type: 'string',
      description: 'Custom delimiter for CSV/TSV/DSV (Delimiter Separated Values) files',
    },
    comments: {
      type: 'string',
      description: 'String(s) indicating a comment line. Lines starting with this string will be skipped',
      default: '//',
    },
    mergeOutput: {
      type: 'boolean',
      description: 'If true, merges JSON output if multiple processed files result in the same output path',
      default: true,
    },
    preserveStructure: {
      type: 'string',
      description: 'Specifies the output directory structure when `outDir` is used.',
      valueHint: '"parent" | "nested" | "prefixed"',
    },
    replacePunctuationSpace: {
      type: 'boolean',
      description: 'Replaces spaces followed by "high" punctuation (`!$%:;?+-`) with a non-breaking space',
      default: true,
    },
    jiiProcessor: {
      type: 'boolean',
      description: 'Enables special processing for keys starting with `$JII;`',
      default: false,
    },
    jiiProcessorClean: {
      type: 'boolean',
      description: 'When enabled, keys processed by `jiiProcessor` are excluded from normal processing',
      default: true,
    },
    fileProcessor: {
      type: 'boolean',
      description: 'Enables special processing for keys starting with `$FILE;`',
      default: false,
    },
    fileProcessorClean: {
      type: 'boolean',
      description: 'When enabled, keys processed by `fileProcessor` are excluded from normal processing',
      default: true,
    },
  },
  async run({ args }) {
    const argsToOptions = {
      ...args,
      include: Array.isArray(args.include)
        ? args.include.map(parsePossibleRegExp)
        : parsePossibleRegExp(args.include),
      exclude: Array.isArray(args.exclude)
        ? args.exclude.map(parsePossibleRegExp)
        : parsePossibleRegExp(args.exclude),
      localesMatcher: parsePossibleRegExp(args.localesMatcher),
      cwd: args.cwd ?? resolve(),
    } as typeof args & Pick<Options, 'keyStyle' | 'localesMatcher' | 'preserveStructure'>

    await scanConvert(argsToOptions, args.cwd)
  },
})

runMain(main)
