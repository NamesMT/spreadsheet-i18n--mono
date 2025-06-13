import type { ParsedPath } from 'node:path'
import type { ParseError, ParseMeta } from 'papaparse'
import type { ResolvedOptions } from '../core'
import type { FilterPattern, Options, ProcessedSheetData, SpecialFileProcessedOutput } from '../types'
import { objectGet, objectSet } from '@namesmt/utils'
import { consola } from 'consola'
import Papa from 'papaparse'
import { dirname, parse, relative, resolve } from 'pathe'

/**
 * Replaces spaces followed by "high" punctuation with a non-breaking space, for languages like `French`
 */
export function replacePunctuationSpace(str: string): string {
  if (typeof str !== 'string')
    return str

  return str.replace(/ ([!$%:;?+-])/g, '\xA0$1')
}

/**
 * Checks if a cell value is effectively empty.
 */
export function isEmptyCell(cellValue: unknown, quoteChar: string = '"'): boolean {
  if (!cellValue)
    return true

  if (typeof cellValue === 'string' && quoteChar && cellValue === quoteChar.repeat(2))
    return true

  return false
}

/**
 * Transforms an array of records into an i18n-compatible object.
 */
interface TransformToI18nParams {
  records: Record<string, any>[]
  keyCol: string
  valueCol: string
  keyStyle: Options['keyStyle']
  transformOptions?: { replacePunctuationSpace?: boolean }
}

export function transformToI18n({
  records,
  keyCol,
  valueCol,
  keyStyle,
  transformOptions = {},
}: TransformToI18nParams): Record<string, any> {
  const i18nObject: Record<string, any> = {}
  records.forEach((item) => {
    const key = objectGet(item, keyCol)
    let value = objectGet(item, valueCol)

    if (isEmptyCell(key) || isEmptyCell(value))
      return

    if (typeof value !== 'string')
      value = String(value)

    if (transformOptions.replacePunctuationSpace)
      value = replacePunctuationSpace(value)

    if (keyStyle === 'nested') {
      try {
        if (typeof key !== 'string') {
          consola.warn(`[sheetI18n] Nested key is not a string, attempting to convert: ${key}`)
        }
        objectSet(i18nObject, String(key), value)
      }
      catch (error: any) {
        if (error instanceof TypeError && error.message.match(/^Cannot create property '.+' on string/)) {
          consola.error(`[sheetI18n] Conflict with nested key: '${key}'. A parent key might be a string. Consider using flat keyStyle or revising keys.`)
        }
        else {
          consola.error(`[sheetI18n] Error setting nested key '${key}': ${error.message}`)
        }
      }
    }
    else {
      i18nObject[String(key)] = value
    }
  })
  return i18nObject
}

interface FilterCommentRowsParams {
  csvString: string
  commentsConfig: ResolvedOptions['comments']
}
export function filterCommentRows({ csvString, commentsConfig }: FilterCommentRowsParams): string {
  // If commentsConfig is explicitly false, or if it's an empty string or empty array (which are falsy but not `false`),
  // we should not attempt to filter comments.
  if (commentsConfig === false || (typeof commentsConfig === 'string' && commentsConfig === '') || (Array.isArray(commentsConfig) && commentsConfig.length === 0)) {
    return csvString
  }
  // At this point, commentsConfig is a non-empty string or a non-empty array of strings.
  const commentPatterns = Array.isArray(commentsConfig) ? commentsConfig : [commentsConfig]
  return csvString
    .split(/\r?\n/)
    .filter(
      line => !commentPatterns.some((comment: string) => {
        const escapedComment = comment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const commentRegex = new RegExp(`^"?${escapedComment}`)
        return line.match(commentRegex)
      }),
    )
    .join('\r\n')
}

interface ParseCsvDataParams {
  csvString: string
  delimiter: ResolvedOptions['delimiter']
  logName: string
}
export function parseCsvData({
  csvString,
  delimiter,
  logName,
}: ParseCsvDataParams): { data: Record<string, any>[], meta: ParseMeta | undefined, errors: ParseError[] } {
  const result = Papa.parse<Record<string, any>>(csvString, {
    skipEmptyLines: true,
    header: true,
    delimiter,
  })

  if (result.errors?.length > 0) {
    consola.warn(`[sheetI18n] There was some parsing errors in ${logName}: ${result.errors.length}`)
    consola.debug(`[sheetI18n] Errors detail:\n${result.errors.map(e => `${e.message} [:${e.row}:${e.index}]`).join('\n')}`)
  }

  return { data: result.data || [], meta: result.meta, errors: result.errors || [] }
}

interface FilterRowsWithEmptyKeysParams {
  dataRows: Record<string, any>[]
  keyColumn: string
  logName: string
}
export function filterRowsWithEmptyKeys({
  dataRows,
  keyColumn,
  logName,
}: FilterRowsWithEmptyKeysParams): { filteredRows: Record<string, any>[], skippedCount: number } {
  let skippedCount = 0
  const filteredRows = dataRows.filter((row) => {
    if (!isEmptyCell(row[keyColumn])) {
      return true
    }
    skippedCount++
    return false
  })
  if (skippedCount > 0) {
    consola.info(`[sheetI18n] ${logName}: ${skippedCount} rows with empty key skipped.`)
  }
  return { filteredRows, skippedCount }
}

// --- Special Key Parsers and Processors ---

export interface ParsedJiiCommand {
  id: string
  rawPrimaries: string
  pathStr: string
  key: string
  primaries: string[][]
}

/**
 * Parses a key string for the $JII; command.
 *
 * Syntax: `$JII;[filePath];[primaries];[path];[key]`
 * + `filePath`: The output file path, with extension (e.g., `cloud` results in `cloud` file without .json extension).
 * + `primaries`: Comma-separated key:value pairs (e.g., `id:item1,type:widget`). These become the main properties in the output JSON objects, and to distinguish them from the other items.
 * + `path`: Dot-separated path for nesting the translation within the output JSON (e.g., `product.details`).
 * + `key`: The final key for the translation string (e.g., `title`).
 *
 * ---
 *
 * Example:
 *
 * Input keyCell: `$JII;myProducts;id:prod123,category:electronics;info.specs;displayName`
 *
 * Output:
 * ```js
 * {
 *   id: 'myProducts',
 *   rawPrimaries: 'id:prod123,category:electronics',
 *   pathStr: 'info.specs',
 *   key: 'displayName',
 *   primaries: [['id', 'prod123'], ['category', 'electronics']]
 * }
 * ```
 *
 * This would contribute to an output file like `myProducts.json`, with content structured like:
 * ```jsonc
 * [
 *   {
 *     "id": "prod123",
 *     "category": "electronics",
 *     "info": {
 *       "specs": {
 *         "i18n": {
 *           "en": { "displayName": "English Value" },
 *           "fr": { "displayName": "French Value" }
 *         }
 *       }
 *     }
 *   },
 *   // ... other items sharing the same fileName and primaries
 * ]
 * ```
 */
export function parseJiiCommand(keyCell: string): ParsedJiiCommand | undefined {
  if (!keyCell.startsWith('$JII;'))
    return

  const parts = keyCell.replace('$JII;', '').split(';')
  if (parts.length !== 4 || !parts.every(Boolean))
    throw new Error('Invalid format')

  const [id, rawPrimaries, pathStr, key] = parts
  const primaries = rawPrimaries.split(',').map((s: string) => s.split(':'))
  return { id, rawPrimaries, pathStr, key, primaries }
}

export interface ParsedFileCommand {
  fileName: string
  extension: string | undefined
}

/**
 * Parses a key string for the $FILE; command.
 *
 * Syntax: `$FILE;[fileName];[extension]`
 * - `fileName`: The base name for the output file (e.g., `terms`).
 * - `extension`: The file extension (e.g., `md`, `txt`).
 *
 * ---
 *
 * Example:
 *
 * Input keyCell: `$FILE;privacyPolicy;md`
 *
 * Output:
 * ```js
 * { fileName: 'privacyPolicy', extension: 'md' }
 * ```
 *
 * This would generate files like `privacyPolicy_en.md`, `privacyPolicy_fr.md`, etc.
 *
 * --
 *
 * Input keyCell: `$FILE;readme`
 *
 * Output:
 * ```js
 * { fileName: 'readme', extension: undefined }
 * ```
 * This would generate files like `readme_en`, `readme_fr`, etc.
 */
export function parseFileCommand(keyCell: string): ParsedFileCommand | undefined {
  if (!keyCell.startsWith('$FILE;'))
    return

  const parts = keyCell.replace('$FILE;', '').split(';')
  if (parts.length < 1 || parts.length > 2 || !parts[0])
    throw new Error('Invalid format')

  const [fileName, extension] = parts
  return { fileName, extension }
}

/**
 * Processes rows that match the $JII; command format.
 *
 * It groups translations by the `id` and `rawPrimaries` from the command,
 * creating an array of objects in the output JSON file.
 *
 * Each object in the array will contain the primary key-value pairs and the nested translations.
 *
 * @returns An object containing rows that were not processed (remainingRows)
 *          and an array of special file outputs (outputs).
 */
interface ProcessJiiKeysParams {
  dataRows: Record<string, any>[]
  filePath: string
  resolvedOptions: ResolvedOptions
  locales: string[]
  cwd?: string
}
export function processJiiKeys({
  dataRows,
  filePath,
  resolvedOptions,
  locales,
  cwd,
}: ProcessJiiKeysParams): { remainingRows: Record<string, any>[], outputs: SpecialFileProcessedOutput[] } {
  const outputs: SpecialFileProcessedOutput[] = []
  const jsonStore: Record<string, Record<string, any>> = {} // { [id]: { rawPrimaries: data } }

  const remainingRows = dataRows.filter((row) => {
    const keyCell = String(row[resolvedOptions.keyColumn] || '')
    let command: ReturnType<typeof parseJiiCommand>
    try {
      command = parseJiiCommand(keyCell)
    }
    catch (e: any) {
      if (e?.message === 'Invalid format')
        consola.warn(`[sheetI18n] ${filePath}: $JII key found but invalid format: ${keyCell}`)
    }

    // If not $JII key or invalid
    if (!command) {
      // Filter out if invalid
      return !keyCell.startsWith('$JII;')
    }

    if (!locales.length) {
      consola.warn(`[sheetI18n] ${filePath}: $JII key found but no locales detected: ${keyCell}`)
      return false
    }

    const { id, rawPrimaries, pathStr, key, primaries } = command
    if (!jsonStore[id])
      jsonStore[id] = {}
    if (!jsonStore[id][rawPrimaries]) {
      jsonStore[id][rawPrimaries] = {}
    }

    const targetObject = jsonStore[id][rawPrimaries]
    primaries.forEach((primaryPair: string[]) => {
      if (primaryPair.length >= 1) {
        const k = primaryPair[0]
        const v = primaryPair.length > 1 ? primaryPair[1] : ''
        objectSet(targetObject, k, v)
      }
    })

    locales.forEach((locale) => {
      const value = row[locale]
      if (!isEmptyCell(value)) {
        const valToSet = resolvedOptions.replacePunctuationSpace ? replacePunctuationSpace(String(value)) : String(value)
        objectSet(targetObject, [...pathStr.split('.'), 'i18n', locale, key], valToSet)
      }
    })
    return false
  })

  Object.entries(jsonStore).forEach(([id, primaryGroups]) => {
    const outputData = Object.values(primaryGroups)
    if (outputData.length > 0) {
      const outputName = `${id}.json`
      outputs.push({
        outputPath: resolveOutputPath({
          outDirOptions: resolvedOptions,
          originalFilePath: filePath,
          outputName,
          cwd,
        }),
        content: outputData,
        type: 'json',
      })
    }
  })

  if (outputs.length > 0)
    consola.info(`[sheetI18n] ${filePath}: Special $JII keys processed.`)

  return { remainingRows, outputs }
}

/**
 * Processes rows that match the $FILE; command format.
 *
 * It creates separate text-based files for each locale, named according to the command.
 *
 * The content of each file will be the translation string for that locale.
 *
 * @param dataRows Rows parsed from the spreadsheet.
 * @param filePath Path of the source file (for logging).
 * @param resolvedOptions The resolved processing options.
 * @param locales Detected locale codes from the spreadsheet headers.
 * @returns An object containing rows that were not processed (remainingRows)
 *          and an array of special file outputs (outputs).
 */
interface ProcessFileKeysParams {
  dataRows: Record<string, any>[]
  filePath: string
  resolvedOptions: ResolvedOptions
  locales: string[]
  cwd?: string
}
export function processFileKeys({
  dataRows,
  filePath,
  resolvedOptions,
  locales,
  cwd,
}: ProcessFileKeysParams): { remainingRows: Record<string, any>[], outputs: SpecialFileProcessedOutput[] } {
  const outputs: SpecialFileProcessedOutput[] = []
  const filesContentStore: Record<string, string> = {}

  const remainingRows = dataRows.filter((row) => {
    const keyCell = String(row[resolvedOptions.keyColumn] || '')
    let command: ReturnType<typeof parseFileCommand>
    try {
      command = parseFileCommand(keyCell)
    }
    catch (e: any) {
      if (e?.message === 'Invalid format')
        consola.warn(`[sheetI18n] ${filePath}: $FILE key found but invalid format: ${keyCell}`)
    }

    if (!command) {
      return !keyCell.startsWith('$FILE;')
    }

    if (!locales.length) {
      consola.warn(`[sheetI18n] ${filePath}: $FILE key found but no locales detected: ${keyCell}`)
      return false
    }

    const { fileName, extension } = command
    locales.forEach((locale) => {
      const value = row[locale]
      if (!isEmptyCell(value)) {
        const outputFileName = `${fileName}_${locale}${extension ? `.${extension}` : ''}`
        filesContentStore[outputFileName] = resolvedOptions.replacePunctuationSpace ? replacePunctuationSpace(String(value)) : String(value)
      }
    })
    return false
  })

  Object.entries(filesContentStore).forEach(([outputFileName, content]) => {
    outputs.push({
      outputPath: resolveOutputPath({
        outDirOptions: resolvedOptions,
        originalFilePath: filePath,
        outputName: outputFileName,
        cwd,
      }),
      content,
      type: 'file',
    })
  })

  if (outputs.length > 0)
    consola.info(`[sheetI18n] ${filePath}: Special $FILE keys processed.`)
  return { remainingRows, outputs }
}

interface GenerateStandardI18nOutputsParams {
  dataRows: Record<string, any>[]
  resolvedOptions: ResolvedOptions
  detectedLocales: string[]
  parsedPath: ParsedPath
  filePath: string
  cwd?: string
}
export function generateStandardI18nOutputs({
  dataRows,
  resolvedOptions,
  detectedLocales,
  parsedPath,
  filePath,
  cwd,
}: GenerateStandardI18nOutputsParams): ProcessedSheetData[] {
  const i18nOutputs: ProcessedSheetData[] = []
  const currentValCol = resolvedOptions.valueColumn ?? undefined

  if (currentValCol) {
    const i18nData = transformToI18n({
      records: dataRows,
      keyCol: resolvedOptions.keyColumn,
      valueCol: currentValCol!,
      keyStyle: resolvedOptions.keyStyle,
      transformOptions: { replacePunctuationSpace: resolvedOptions.replacePunctuationSpace },
    })
    if (Object.keys(i18nData).length > 0) {
      const outputName = `${parsedPath.name}.json`
      i18nOutputs.push({
        locale: parsedPath.name,
        data: i18nData,
        outputPath: resolveOutputPath({
          outDirOptions: resolvedOptions,
          originalFilePath: filePath,
          outputName,
          cwd,
        }),
      })
    }
  }
  else {
    if (!detectedLocales.length) {
      consola.error(`[sheetI18n] No locales detected for ${filePath} and no valueColumn specified.`)
      return [] // Return empty if no locales and no valueColumn
    }
    detectedLocales.forEach((locale: string) => {
      const i18nData = transformToI18n({
        records: dataRows,
        keyCol: resolvedOptions.keyColumn,
        valueCol: locale,
        keyStyle: resolvedOptions.keyStyle,
        transformOptions: { replacePunctuationSpace: resolvedOptions.replacePunctuationSpace },
      })
      if (Object.keys(i18nData).length > 0) {
        const outputName = `${locale}.json`
        i18nOutputs.push({
          locale,
          data: i18nData,
          outputPath: resolveOutputPath({
            outDirOptions: resolvedOptions,
            originalFilePath: filePath,
            outputName,
            cwd,
          }),
        })
      }
    })
  }
  return i18nOutputs
}

interface ResolveOutputPathParams {
  outDirOptions: { outDir?: string | null, preserveStructure?: Options['preserveStructure'] }
  originalFilePath: string
  outputName: string
  cwd?: string
}
export function resolveOutputPath({
  outDirOptions,
  originalFilePath,
  outputName,
  cwd,
}: ResolveOutputPathParams): string {
  cwd = cwd ? resolve(cwd) : resolve()
  const parsedOriginalPath = parse(originalFilePath)
  const currentOutDir = outDirOptions.outDir ?? undefined

  if (!currentOutDir) {
    return resolve(parsedOriginalPath.dir, outputName)
  }

  const relativeOriginalDir = dirname(relative(cwd, originalFilePath))

  switch (outDirOptions.preserveStructure) {
    case true:
    case 'parent':
      return resolve(currentOutDir, relativeOriginalDir, outputName)
    case 'nested':
      return resolve(currentOutDir, relativeOriginalDir, parsedOriginalPath.name, outputName)
    case 'prefixed':
      return resolve(currentOutDir, relativeOriginalDir, `${parsedOriginalPath.name}_${outputName}`)
    default:
      return resolve(currentOutDir, outputName)
  }
}

/**
 * Normalizes a FilterPattern into separate arrays of globs and RegExps.
 *
 * @param patternInput The FilterPattern to normalize.
 * @returns An object with `globs` and `regexps` arrays.
 */
export function normalizePatterns(patternInput: FilterPattern | undefined): { globs: string[], regexps: RegExp[] } {
  const globs: string[] = []
  const regexps: RegExp[] = []

  if (!patternInput) {
    return { globs, regexps }
  }

  const patterns = Array.isArray(patternInput) ? patternInput : [patternInput]

  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      globs.push(pattern)
    }
    else if (pattern instanceof RegExp) {
      regexps.push(pattern)
    }
  }
  return { globs, regexps }
}
