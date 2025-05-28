import type { ParsedPath } from 'node:path'
import type { ParseError, ParseMeta } from 'papaparse'
import type { ResolvedOptions } from '../core'
import type { FilterPattern, Options, ProcessedSheetData, SpecialFileProcessedOutput } from '../types'
import { objectGet, objectSet } from '@namesmt/utils'
import Papa from 'papaparse'
import { dirname, parse, relative, resolve } from 'pathe'
import { logger } from './logger'

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
export function transformToI18n(
  records: Record<string, any>[],
  keyCol: string,
  valueCol: string,
  keyStyle: Options['keyStyle'],
  transformOptions: { replacePunctuationSpace?: boolean } = {},
): Record<string, any> {
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
          logger.warn(`[sheetI18n] Nested key is not a string, attempting to convert: ${key}`)
        }
        objectSet(i18nObject, String(key), value)
      }
      catch (error: any) {
        if (error instanceof TypeError && error.message.match(/^Cannot create property '.+' on string/)) {
          logger.error(`[sheetI18n] Conflict with nested key: '${key}'. A parent key might be a string. Consider using flat keyStyle or revising keys.`)
        }
        else {
          logger.error(`[sheetI18n] Error setting nested key '${key}': ${error.message}`)
        }
      }
    }
    else {
      i18nObject[String(key)] = value
    }
  })
  return i18nObject
}

export function filterCommentRows(csvString: string, commentsConfig: ResolvedOptions['comments']): string {
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

export function parseCsvData(
  csvString: string,
  delimiter: ResolvedOptions['delimiter'],
  filePath: string, // For logging
): { data: Record<string, any>[], meta: ParseMeta | undefined, errors: ParseError[] } {
  const result = Papa.parse<Record<string, any>>(csvString, {
    skipEmptyLines: true,
    header: true,
    delimiter: delimiter ?? undefined,
    dynamicTyping: false,
  })

  if (result.errors && result.errors.length > 0) {
    logger.error(`[sheetI18n] CSV Parsing errors in ${filePath}: ${result.errors.map(e => e.message).join(', ')}`)
  }
  return { data: result.data || [], meta: result.meta, errors: result.errors || [] }
}

export function filterRowsWithEmptyKeys(
  dataRows: Record<string, any>[],
  keyColumn: string,
  filePath: string, // For logging
): { filteredRows: Record<string, any>[], skippedCount: number } {
  let skippedCount = 0
  const filteredRows = dataRows.filter((row) => {
    if (!isEmptyCell(row[keyColumn])) {
      return true
    }
    skippedCount++
    return false
  })
  if (skippedCount > 0) {
    logger.info(`[sheetI18n] ${filePath}: ${skippedCount} rows with empty key skipped.`)
  }
  return { filteredRows, skippedCount }
}

// --- Special Key Parsers and Processors ---

export interface ParsedJsonCommand {
  id: string
  rawSelectors: string
  pathStr: string
  key: string
  selectors: string[][]
}

/**
 * Parses a key string for the $JSON; command.
 *
 * Syntax: `$JSON;[fileName];[selectors];[path];[key]`
 * - `fileName`: The base name for the output JSON file (e.g., `cloud` results in `cloud.json`).
 * - `selectors`: Comma-separated key:value pairs (e.g., `id:item1,type:widget`). These become properties in the output JSON objects.
 * - `path`: Dot-separated path for nesting the translation within the output JSON (e.g., `product.details`).
 * - `key`: The final key for the translation string (e.g., `title`).
 *
 * ---
 *
 * Example:
 *
 * Input keyCell: `$JSON;myProducts;id:prod123,category:electronics;info.specs;displayName`
 *
 * Output:
 * ```js
 * {
 *   id: 'myProducts',
 *   rawSelectors: 'id:prod123,category:electronics',
 *   pathStr: 'info.specs',
 *   key: 'displayName',
 *   selectors: [['id', 'prod123'], ['category', 'electronics']]
 * }
 * ```
 *
 * This would contribute to an output file like `myProducts.json`, with content structured like:
 * ```jsonc
 * [
 *   {
 *     "id": "prod123",
 *     "category": "electronics",
 *     "__selectorKeys": ["id", "category"], // Internal helper
 *     "info": {
 *       "specs": {
 *         "i18n": {
 *           "en": { "displayName": "English Value" },
 *           "fr": { "displayName": "French Value" }
 *         }
 *       }
 *     }
 *   },
 *   // ... other items sharing the same fileName and selectors
 * ]
 * ```
 *
 * @param keyCell The string from the key column.
 * @param filePath The path of the source spreadsheet file (for logging).
 * @returns A parsed command object or null if the format is invalid.
 */
export function parseJsonCommand(keyCell: string, filePath: string): ParsedJsonCommand | null {
  if (!keyCell.startsWith('$JSON;'))
    return null

  const parts = keyCell.replace('$JSON;', '').split(';')
  if (parts.length !== 4 || !parts.every(Boolean)) {
    logger.error(`[sheetI18n] ${filePath}: Invalid $JSON command format: ${keyCell}`)
    return null
  }
  const [id, rawSelectors, pathStr, key] = parts
  const selectors = rawSelectors.split(',').map((s: string) => s.split(':'))
  return { id, rawSelectors, pathStr, key, selectors }
}

export interface ParsedFileCommand {
  fileName: string
  extension: string
}

/**
 * Parses a key string for the $FILE; command.
 *
 * Syntax: `$FILE;[fileName];[extension]`
 * - `fileName`: The base name for the output file (e.g., `terms`).
 * - `extension`: The file extension (e.g., `md`, `txt`). Defaults to `txt`.
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
 * { fileName: 'readme', extension: 'txt' }
 * ```
 * This would generate files like `readme_en.txt`, `readme_fr.txt`, etc.
 *
 * @param keyCell The string from the key column.
 * @param filePath The path of the source spreadsheet file (for logging).
 * @returns A parsed command object or null if the format is invalid.
 */
export function parseFileCommand(keyCell: string, filePath: string): ParsedFileCommand | null {
  if (!keyCell.startsWith('$FILE;'))
    return null

  const parts = keyCell.replace('$FILE;', '').split(';')
  if (parts.length < 1 || parts.length > 2 || !parts[0]) {
    logger.error(`[sheetI18n] ${filePath}: Invalid $FILE command format: ${keyCell}`)
    return null
  }
  const [fileName, extension = 'txt'] = parts
  return { fileName, extension }
}

/**
 * Processes rows that match the $JSON; command format.
 *
 * It groups translations by the `id` and `rawSelectors` from the command,
 * creating an array of objects in the output JSON file.
 *
 * Each object in the array will contain the selector key-value pairs and the nested translations.
 *
 * @param dataRows Rows parsed from the spreadsheet.
 * @param filePath Path of the source file (for logging).
 * @param resolvedOptions The resolved processing options.
 * @param locales Detected locale codes from the spreadsheet headers.
 * @returns An object containing rows that were not processed (remainingRows)
 *          and an array of special file outputs (outputs).
 */
export function processJsonKeys(
  dataRows: Record<string, any>[],
  filePath: string,
  resolvedOptions: ResolvedOptions,
  locales: string[],
): { remainingRows: Record<string, any>[], outputs: SpecialFileProcessedOutput[] } {
  const outputs: SpecialFileProcessedOutput[] = []
  const jsonStore: Record<string, Record<string, any>> = {} // { id: { rawSelectors: data } }

  const remainingRows = dataRows.filter((row) => {
    const keyCell = String(row[resolvedOptions.keyColumn] || '')
    const command = parseJsonCommand(keyCell, filePath)

    if (!command) {
      // If it's not a $JSON key or invalid, keep it for further processing (or filter if invalid and strict)
      return !keyCell.startsWith('$JSON;') // Only keep if not an attempted (but invalid) $JSON key
    }

    if (!locales.length) {
      logger.warn(`[sheetI18n] ${filePath}: $JSON key found but no locales detected. Skipping row: ${keyCell}`)
      return false // This row is processed (skipped)
    }

    const { id, rawSelectors, pathStr, key, selectors } = command
    if (!jsonStore[id])
      jsonStore[id] = {}
    if (!jsonStore[id][rawSelectors]) {
      jsonStore[id][rawSelectors] = { __selectorKeys: selectors.map((v: string[]) => v[0]) }
    }

    const targetObject = jsonStore[id][rawSelectors]
    selectors.forEach((selectorPair: string[]) => {
      if (selectorPair.length >= 1) {
        const k = selectorPair[0]
        const v = selectorPair.length > 1 ? selectorPair[1] : ''
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
    return false // This row has been processed as a $JSON key
  })

  Object.entries(jsonStore).forEach(([id, selectorGroups]) => {
    const outputData = Object.values(selectorGroups)
    if (outputData.length > 0) {
      const outputName = `${id}.json`
      outputs.push({
        outputPath: resolveOutputPath({ outDir: resolvedOptions.outDir, preserveStructure: resolvedOptions.preserveStructure }, filePath, outputName),
        content: outputData,
        type: 'json',
      })
    }
  })

  if (outputs.length > 0)
    logger.info(`[sheetI18n] ${filePath}: Special $JSON keys processed.`)
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
export function processFileKeys(
  dataRows: Record<string, any>[],
  filePath: string,
  resolvedOptions: ResolvedOptions,
  locales: string[],
): { remainingRows: Record<string, any>[], outputs: SpecialFileProcessedOutput[] } {
  const outputs: SpecialFileProcessedOutput[] = []
  const filesContentStore: Record<string, string> = {}

  const remainingRows = dataRows.filter((row) => {
    const keyCell = String(row[resolvedOptions.keyColumn] || '')
    const command = parseFileCommand(keyCell, filePath)

    if (!command) {
      return !keyCell.startsWith('$FILE;')
    }

    if (!locales.length) {
      logger.warn(`[sheetI18n] ${filePath}: $FILE key found but no locales detected. Skipping row: ${keyCell}`)
      return false
    }

    const { fileName, extension } = command
    locales.forEach((locale) => {
      const value = row[locale]
      if (!isEmptyCell(value)) {
        const outputFileName = `${fileName}_${locale}.${extension}`
        filesContentStore[outputFileName] = resolvedOptions.replacePunctuationSpace ? replacePunctuationSpace(String(value)) : String(value)
      }
    })
    return false
  })

  Object.entries(filesContentStore).forEach(([outputFileName, content]) => {
    outputs.push({
      outputPath: resolveOutputPath({ outDir: resolvedOptions.outDir, preserveStructure: resolvedOptions.preserveStructure }, filePath, outputFileName),
      content,
      type: 'file',
    })
  })

  if (outputs.length > 0)
    logger.info(`[sheetI18n] ${filePath}: Special $FILE keys processed.`)
  return { remainingRows, outputs }
}

export function generateStandardI18nOutputs(
  dataRows: Record<string, any>[],
  resolvedOptions: ResolvedOptions,
  detectedLocales: string[],
  parsedPath: ParsedPath,
  filePath: string,
): ProcessedSheetData[] {
  const i18nOutputs: ProcessedSheetData[] = []
  const currentValCol = resolvedOptions.valueColumn ?? undefined

  if (currentValCol) {
    const i18nData = transformToI18n(
      dataRows,
      resolvedOptions.keyColumn,
      currentValCol,
      resolvedOptions.keyStyle,
      { replacePunctuationSpace: resolvedOptions.replacePunctuationSpace },
    )
    if (Object.keys(i18nData).length > 0) {
      const outputName = `${parsedPath.name}.json`
      i18nOutputs.push({
        locale: parsedPath.name,
        data: i18nData,
        outputPath: resolveOutputPath({ outDir: resolvedOptions.outDir, preserveStructure: resolvedOptions.preserveStructure }, filePath, outputName),
      })
    }
  }
  else {
    if (!detectedLocales.length) {
      logger.error(`[sheetI18n] No locales detected for ${filePath} and no valueColumn specified.`)
      return [] // Return empty if no locales and no valueColumn
    }
    detectedLocales.forEach((locale: string) => {
      const i18nData = transformToI18n(
        dataRows,
        resolvedOptions.keyColumn,
        locale,
        resolvedOptions.keyStyle,
        { replacePunctuationSpace: resolvedOptions.replacePunctuationSpace },
      )
      if (Object.keys(i18nData).length > 0) {
        const outputName = `${locale}.json`
        i18nOutputs.push({
          locale,
          data: i18nData,
          outputPath: resolveOutputPath({ outDir: resolvedOptions.outDir, preserveStructure: resolvedOptions.preserveStructure }, filePath, outputName),
        })
      }
    })
  }
  return i18nOutputs
}

export function resolveOutputPath(
  options: { outDir?: string | null, preserveStructure?: Options['preserveStructure'] },
  originalFilePath: string,
  outputName: string,
): string {
  const cwd = resolve()
  const parsedOriginalPath = parse(originalFilePath)
  const currentOutDir = options.outDir ?? undefined

  if (!currentOutDir) {
    return resolve(parsedOriginalPath.dir, outputName)
  }

  const relativeOriginalDir = dirname(relative(cwd, originalFilePath))

  switch (options.preserveStructure) {
    case true:
    case 'parent':
      return resolve(currentOutDir, relativeOriginalDir, outputName)
    case 'nested':
      return resolve(currentOutDir, relativeOriginalDir, parsedOriginalPath.name, outputName)
    case 'prefixed':
      return resolve(currentOutDir, relativeOriginalDir, `${parsedOriginalPath.name}_${outputName}`)
    default: // 'false' or undefined
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
