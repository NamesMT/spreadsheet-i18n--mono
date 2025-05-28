import type { ParseConfig } from 'papaparse'

export type FilterPattern = ReadonlyArray<string | RegExp> | string | RegExp | null

export interface Options {
  /**
   * Glob patterns, regex, or string to include files for processing.
   * @default /(?:\/|\\|^)i18n\.(?:[cdt]sv)$/
   */
  include?: FilterPattern

  /**
   * Glob patterns, regex, or string to exclude files from processing.
   * @default undefined
   */
  exclude?: FilterPattern

  /**
   * Output directory for the processed files.
   * If undefined, files are output in the same directory as the source.
   * @default undefined
   */
  outDir?: string

  /**
   * Defines the key style for the output JSON.
   * 'flat': Keys are at the root level.
   * 'nested': Keys are nested based on dot notation.
   * @default 'flat'
   */
  keyStyle?: 'flat' | 'nested'

  /**
   * Enables support for spreadsheet formats (.xls, .xlsx, .xlsm, .xlsb, .ods, .fods).
   * Multi-sheet workbooks are supported; all sheets will be merged.
   * @default false
   */
  xlsx?: boolean

  /**
   * The name of the column to be used as the key/identifier for translations.
   * @default 'KEY'
   */
  keyColumn?: string

  /**
   * If defined, this column's values will be used for translations,
   * and the output filename will match the input filename (e.g., `data.csv` -> `data.json`).
   * If undefined, columns matching `localesMatcher` will be treated as separate locale files
   * (e.g., a column 'en' in `i18n.csv` becomes `en.json`).
   * @default undefined
   */
  valueColumn?: string

  /**
   * Regular expression to identify locale columns when `valueColumn` is not defined.
   * @default /^\w{2}(?:-\w{2,4})?$/
   */
  localesMatcher?: RegExp

  /**
   * Custom delimiter for DSV (Delimiter Separated Values) files.
   * If undefined, PapaParse will auto-detect the delimiter.
   * @default undefined
   */
  delimiter?: ParseConfig['delimiter']

  /**
   * String(s) indicating a comment line. Lines starting with this string will be skipped.
   * Set to `false` to disable comment skipping.
   * @default '//'
   */
  comments?: false | string | string[]

  /**
   * If true, merges JSON output if multiple processed files result in the same output path.
   * @default true
   */
  mergeOutput?: boolean

  /**
   * Specifies the output directory structure when `outDir` is used.
   * - `false`: Outputs all files directly into `outDir`. (e.g., `/path/to/source/a/i18n.csv` -> `<outDir>/en.json`)
   * - `true` or `'parent'`: Preserves the parent directory structure. (e.g., `/path/to/source/a/i18n.csv` -> `<outDir>/a/en.json`)
   * - `'nested'`: Creates a subdirectory named after the input file. (e.g., `/path/to/source/a/i18n.csv` -> `<outDir>/a/i18n/en.json`)
   * - `'prefixed'`: Prefixes the output file with the input filename. (e.g., `/path/to/source/a/i18n.csv` -> `<outDir>/a/i18n_en.json`)
   * @default false
   */
  preserveStructure?: boolean | 'parent' | 'nested' | 'prefixed'

  /**
   * Replaces spaces followed by "high" punctuation (e.g., !, :, ?) with a non-breaking space.
   * Useful for languages like French.
   * Punctuations: !$%:;?+-
   * @default true
   */
  replacePunctuationSpace?: boolean

  /**
   * Enables special processing for keys starting with `$JSON;`.
   * Syntax: `$JSON;[fileName];[selectors];[path];[key]`
   * Example: `$JSON;cloud;id:what;a.nested.path;display`
   * This will generate a `[fileName]_[locale].json` (e.g. cloud_en.json)
   * @default false
   */
  jsonProcessor?: boolean

  /**
   * If true, keys processed by `jsonProcessor` are excluded from normal processing.
   * Effective only if `jsonProcessor` is enabled.
   * @default true
   */
  jsonProcessorClean?: boolean

  /**
   * Enables special processing for keys starting with `$FILE;`.
   * Syntax: `$FILE;[fileName];[extension]` (extension defaults to 'txt')
   * Example: `$FILE;terms;md`
   * This will generate a `[fileName]_[locale].[extension]` (e.g. terms_en.md)
   * @default false
   */
  fileProcessor?: boolean

  /**
   * If true, keys processed by `fileProcessor` are excluded from normal processing.
   * Effective only if `fileProcessor` is enabled.
   * @default true
   */
  fileProcessorClean?: boolean
}

export interface ProcessedSheetData {
  locale: string
  data: Record<string, any>
  outputPath: string
}

export interface SpecialFileProcessedOutput {
  outputPath: string
  content: string | Record<string, any>[] // JSON array for jsonProcessor, string for fileProcessor
  type: 'json' | 'file'
}
