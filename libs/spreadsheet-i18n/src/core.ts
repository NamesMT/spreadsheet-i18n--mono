import type { FilterPattern, Options, ProcessedSheetData, SpecialFileProcessedOutput } from './types'
import { createFilter } from '@rollup/pluginutils'
import { consola } from 'consola'
import { defu } from 'defu'
import { isAbsolute, parse, relative, resolve } from 'pathe'
import { process } from 'std-env'
import { glob } from 'tinyglobby'
import {
  outputFile,
  outputWriteMerge,
  readCsvFile,
  readXlsxFile,
} from './helpers/fs'
import {
  filterCommentRows,
  filterRowsWithEmptyKeys,
  generateStandardI18nOutputs,
  normalizePatterns,
  parseCsvData,
  processFileKeys,
  processJiiKeys,
} from './helpers/utils'

// Internal type for options after defaults have been applied.
export type ResolvedOptions = Options & Required<Pick<Options, 'include'
  | 'keyStyle'
  | 'keyColumn'
  | 'localesMatcher'
  | 'comments'
  | 'xlsx'
  | 'mergeOutput'
  | 'preserveStructure'
  | 'replacePunctuationSpace'
  | 'jiiProcessor'
  | 'jiiProcessorClean'
  | 'fileProcessor'
  | 'fileProcessorClean'>>

export const defaultOptionsObject: Partial<Options> & Pick<ResolvedOptions, 'include'
  | 'keyStyle'
  | 'keyColumn'
  | 'localesMatcher'
  | 'comments'
  | 'xlsx'
  | 'mergeOutput'
  | 'preserveStructure'
  | 'replacePunctuationSpace'
  | 'jiiProcessor'
  | 'jiiProcessorClean'
  | 'fileProcessor'
  | 'fileProcessorClean'> = {
  include: /(?:[/\\]|^)i18n\.[cdt]sv$/,
  exclude: undefined,
  outDir: undefined,
  keyStyle: 'flat',
  keyColumn: 'KEY',
  valueColumn: undefined,
  localesMatcher: /^\w{2}(?:-\w{2,4})?$/,
  comments: '//',
  xlsx: false,
  mergeOutput: true,
  preserveStructure: false,
  replacePunctuationSpace: true,
  jiiProcessor: false,
  jiiProcessorClean: true,
  fileProcessor: false,
  fileProcessorClean: true,
  delimiter: undefined,
}

interface ProcessSheetContentParams {
  fileContent: string
  filePath: string
  options?: Options
  cwd?: string
}

export function processSheetContent({
  fileContent,
  filePath,
  options,
  cwd,
}: ProcessSheetContentParams): {
  i18nOutputs: ProcessedSheetData[]
  specialOutputs: SpecialFileProcessedOutput[]
} {
  const resolvedOptions = defu(options, defaultOptionsObject) as ResolvedOptions
  const parsedPath = parse(filePath)

  const csvStringAfterComments = filterCommentRows({ csvString: fileContent, commentsConfig: resolvedOptions.comments })
  const { data: parsedRows, meta: parseMeta } = parseCsvData({ csvString: csvStringAfterComments, delimiter: resolvedOptions.delimiter, logName: filePath })

  const detectedLocales = (parseMeta?.fields || []).filter((field: string) => field.match(resolvedOptions.localesMatcher))

  const { filteredRows: rowsAfterEmptyKeyFilter } = filterRowsWithEmptyKeys({
    dataRows: parsedRows,
    keyColumn: resolvedOptions.keyColumn,
    logName: filePath,
  })

  let dataForStandardProcessing = [...rowsAfterEmptyKeyFilter]
  const allSpecialOutputs: SpecialFileProcessedOutput[] = []

  if (resolvedOptions.jiiProcessor) {
    const { remainingRows, outputs } = processJiiKeys({
      dataRows: dataForStandardProcessing,
      filePath,
      resolvedOptions,
      locales: detectedLocales,
      cwd,
    })
    if (resolvedOptions.jiiProcessorClean) {
      dataForStandardProcessing = remainingRows
    }
    allSpecialOutputs.push(...outputs)
  }

  if (resolvedOptions.fileProcessor) {
    const { remainingRows, outputs } = processFileKeys({
      dataRows: dataForStandardProcessing,
      filePath,
      resolvedOptions,
      locales: detectedLocales,
      cwd,
    })
    if (resolvedOptions.fileProcessorClean) {
      dataForStandardProcessing = remainingRows
    }
    allSpecialOutputs.push(...outputs)
  }

  const standardI18nOutputs = generateStandardI18nOutputs({
    dataRows: dataForStandardProcessing,
    resolvedOptions,
    detectedLocales,
    parsedPath,
    filePath,
    cwd,
  })

  return { i18nOutputs: standardI18nOutputs, specialOutputs: allSpecialOutputs }
}

type SheetFileFilter = (filePath: string) => boolean

/**
 * Builds the single include/exclude filter shared by `scanConvert` and `processSheetFile`.
 *
 * It fixes the otherwise inconsistent semantics of `@rollup/pluginutils`' `createFilter`:
 * - string glob patterns are resolved against `cwd` instead of `process.cwd()`,
 * - RegExp patterns are tested against the path relative to `cwd`, which is what
 *   `scanConvert` uses when it filters its glob results.
 *
 * `include` globs and RegExps are combined with AND semantics, matching
 * `scanConvert`'s documented behaviour (scan by glob, then apply RegExp filters).
 */
function createSheetFilter(
  include: FilterPattern | undefined,
  exclude: FilterPattern | undefined,
  cwd: string,
): SheetFileFilter {
  const { globs: includeGlobs, regexps: includeRegexps } = normalizePatterns(include)
  const { globs: excludeGlobs, regexps: excludeRegexps } = normalizePatterns(exclude)

  const includeGlobFilter = createFilter(includeGlobs, undefined, { resolve: cwd })
  const excludeGlobFilter = createFilter(undefined, excludeGlobs, { resolve: cwd })

  const testRegexps = (regexps: RegExp[], relativeFilePath: string): boolean =>
    regexps.some((re) => {
      re.lastIndex = 0
      return re.test(relativeFilePath)
    })

  return (filePath) => {
    if (typeof filePath !== 'string' || filePath.includes('\0'))
      return false

    const absoluteFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath)
    const relativeFilePath = relative(cwd, absoluteFilePath)

    if (includeGlobs.length > 0 && !includeGlobFilter(absoluteFilePath))
      return false
    if (includeRegexps.length > 0 && !testRegexps(includeRegexps, relativeFilePath))
      return false

    if (excludeGlobs.length > 0 && !excludeGlobFilter(absoluteFilePath))
      return false
    if (excludeRegexps.length > 0 && testRegexps(excludeRegexps, relativeFilePath))
      return false

    return true
  }
}

interface ProcessSheetFileParams {
  filePath: string
  options?: Options
  /**
   * Optionally from `include`, `exclude`, a pre-created filter function can be passed in.
   *
   * A `@rollup/pluginutils` `createFilter` result is also accepted.
   */
  filter?: SheetFileFilter
  cwd?: string
}

export async function processSheetFile({
  filePath,
  options,
  filter,
  cwd,
}: ProcessSheetFileParams): Promise<void> {
  cwd = cwd ? resolve(cwd) : resolve()
  const resolvedOptions = defu(options, defaultOptionsObject) as ResolvedOptions

  filter ??= createSheetFilter(options?.include, options?.exclude, cwd)

  if (!filter(filePath))
    return consola.debug(`[sheetI18n] Skipping: ${relative(cwd, filePath)}`)

  const parsedPath = parse(filePath)
  consola.info(`[sheetI18n] Processing: ${relative(cwd, filePath)}`)

  const allowedExtensions = ['.csv', '.dsv', '.tsv']
  const spreadsheetExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb', '.ods', '.fods']
  if (resolvedOptions.xlsx) {
    allowedExtensions.push(...spreadsheetExtensions)
  }

  if (!allowedExtensions.includes(parsedPath.ext.toLowerCase())) {
    consola.error(
      `[sheetI18n] Unexpected extension: ${filePath}${spreadsheetExtensions.includes(parsedPath.ext.toLowerCase()) && !resolvedOptions.xlsx
        ? '. XLSX processing is not enabled. Set `xlsx: true` in options.'
        : ''
      }`,
    )
    return
  }

  let fileContentString: string
  try {
    if (['.csv', '.dsv', '.tsv'].includes(parsedPath.ext.toLowerCase())) {
      fileContentString = await readCsvFile(filePath, resolvedOptions.delimiter)
    }
    else if (spreadsheetExtensions.includes(parsedPath.ext.toLowerCase())) {
      if (!resolvedOptions.xlsx) {
        consola.error(`[sheetI18n] XLSX file (${filePath}) found but 'xlsx' option is false.`)
        return
      }
      fileContentString = readXlsxFile(filePath)
    }
    else {
      consola.error(`[sheetI18n] File type not supported for ${filePath}`)
      return
    }
  }
  catch (error: any) {
    consola.error(`[sheetI18n] Error reading file ${filePath}: ${error.message}`)
    return
  }

  const { i18nOutputs, specialOutputs } = processSheetContent({
    fileContent: fileContentString,
    filePath,
    options: resolvedOptions,
    cwd,
  })

  for (const { outputPath, data } of i18nOutputs) {
    if (!data || Object.keys(data).length === 0) {
      consola.warn(`[sheetI18n] Empty content for ${outputPath}. Skipping file write.`)
      continue
    }
    try {
      const fileData = JSON.stringify(data, null, 2)
      if (resolvedOptions.mergeOutput) {
        await outputWriteMerge(outputPath, fileData, { encoding: 'utf8', mergeContent: 'json' })
      }
      else {
        await outputFile(outputPath, fileData, { encoding: 'utf8' })
      }
      consola.info(`[sheetI18n] Generated: ${relative(resolvedOptions.outDir ?? cwd, outputPath)}`)
    }
    catch (error: any) {
      consola.error(`[sheetI18n] Error writing JSON output to ${outputPath}: ${error.message}`)
    }
  }

  for (const { outputPath, content, type } of specialOutputs) {
    try {
      const fileData: string = type === 'json' ? JSON.stringify(content, null, 2) : content as string
      await outputFile(outputPath, fileData, { encoding: 'utf8' })
      consola.info(`[sheetI18n] Generated (special): ${relative(resolvedOptions.outDir ?? cwd, outputPath)}`)
    }
    catch (error: any) {
      consola.error(`[sheetI18n] Error writing special output to ${outputPath}: ${error.message}`)
    }
  }
}

/**
 * Scans a directory for files matching include/exclude patterns and processes them.
 *
 * @param options Options for processing, including include/exclude patterns.
 * @param cwd Sets the working directory for the scan and processing.
 *
 * Note: this is slightly breaking with old `unplugin-sheet-i18n`, in which all files would always be scanned then filters applied,
 * now, if you specify some glob patterns, the initial scan will use those patterns, then regexp filters is applied afterwards.
 */
export async function scanConvert(options?: Options, cwd?: string): Promise<void> {
  cwd = cwd ? resolve(cwd) : resolve()
  const resolvedOptions = defu(options, defaultOptionsObject) as ResolvedOptions

  consola.info(`[sheetI18n] Scanning directory: ${cwd}`)
  consola.debug(`[sheetI18n] Resolved options for scan: ${JSON.stringify(resolvedOptions, null, 2)}`)

  const { globs: includeGlobs, regexps: includeRegexps } = normalizePatterns(resolvedOptions.include)
  const { globs: excludeGlobs } = normalizePatterns(resolvedOptions.exclude)

  if (includeGlobs.length === 0 && includeRegexps.length === 0) {
    // This case implies that the default include regex was overridden with an empty pattern.
    consola.warn('[sheetI18n] No include patterns specified (neither globs nor RegExps). Nothing to process.')
    return
  }

  // Build the filter once, with `cwd` as the resolution base, and reuse it both for
  // pre-filtering the glob results and inside `processSheetFile`, so the two steps
  // can never disagree about which files match.
  const filter = createSheetFilter(resolvedOptions.include, resolvedOptions.exclude, cwd)

  // Determine the globs to search. If no includeGlobs are provided, search all files ('**/*')
  // so that includeRegexps can be applied later. excludeGlobs will always be used by tinyglobby.
  const globsToSearch = includeGlobs.length > 0 ? includeGlobs : ['**/*']

  let files: string[] = []
  try {
    files = await glob(globsToSearch, {
      cwd,
      ignore: excludeGlobs,
      absolute: true,
      dot: true,
      onlyFiles: true,
    })
    consola.debug(`[sheetI18n] Files after globbing (${globsToSearch.join(', ')} in ${cwd}): ${JSON.stringify(files)}`)
  }
  catch (error: any) {
    consola.error(`[sheetI18n] Error during globbing: ${error.message}`)
    return // Stop if globbing fails
  }

  const filteredFiles = files.filter(filter)

  if (filteredFiles.length === 0) {
    consola.info('[sheetI18n] No files matched the specified patterns after all filters.')
    return
  }

  consola.info(`[sheetI18n] Found ${filteredFiles.length} files to process.`)

  for (const filePath of filteredFiles) {
    // processSheetFile expects absolute paths for filePath, and cwd for relative logging
    await processSheetFile({ filePath, options: resolvedOptions, cwd, filter })
  }

  consola.info('[sheetI18n] Scan and convert finished.')
}

// IIFE for async setup of xlsx fs
(async () => {
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const nodeFsModule = await import('node:fs')
      const xlsxModule = await import('@e965/xlsx')
      if (nodeFsModule && xlsxModule && typeof xlsxModule.set_fs === 'function') {
        xlsxModule.set_fs(nodeFsModule.default || nodeFsModule)
      }
    }
  }
  catch (error) {
    consola.debug('[sheetI18n] Could not set fs for xlsx. This is expected if not in Node.js or xlsx is not used.', error instanceof Error ? error.message : String(error))
  }
})()
