import type { ResolvedOptions } from '#src/core.js'
import { logger } from '#src/helpers/logger.js'
import {
  filterCommentRows,
  filterRowsWithEmptyKeys,
  generateStandardI18nOutputs,
  isEmptyCell,
  normalizePatterns,
  parseCsvData,
  parseFileCommand,
  parseJiiCommand,
  processFileKeys,
  processJiiKeys,
  replacePunctuationSpace,
  resolveOutputPath,
  transformToI18n,
} from '#src/helpers/utils.js'
import { parse, resolve } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('#src/helpers/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockDefaultOptions = {
  include: /(?:[/\\]|^)i18n\.[cdt]sv$/,
  keyStyle: 'flat',
  keyColumn: 'KEY',
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
  outDir: undefined,
  valueColumn: undefined,
  delimiter: undefined,
} as ResolvedOptions

describe('helper Utilities - utils.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('replacePunctuationSpace', () => {
    it('should replace space before high punctuation', () => {
      expect(replacePunctuationSpace('Hello ! How are you ?')).toBe('Hello\xA0! How are you\xA0?')
      expect(replacePunctuationSpace('Amount : 50 %')).toBe('Amount\xA0: 50\xA0%')
    })
    it('should not change string without relevant punctuation', () => {
      expect(replacePunctuationSpace('Hello world.')).toBe('Hello world.')
    })
    it('should return non-string types as is', () => {
      expect(replacePunctuationSpace(null as any)).toBeNull()
      expect(replacePunctuationSpace(123 as any)).toBe(123)
    })
  })

  describe('isEmptyCell', () => {
    it('should identify null, undefined, empty string as empty', () => {
      expect(isEmptyCell(null)).toBe(true)
      expect(isEmptyCell(undefined)).toBe(true)
      expect(isEmptyCell('')).toBe(true)
    })
    it('should identify double quotes as empty if quoteChar is default', () => {
      expect(isEmptyCell('""')).toBe(true)
    })
    it('should identify custom double quote char as empty', () => {
      expect(isEmptyCell('\'\'', '\'')).toBe(true)
    })
    it('should identify non-empty strings as not empty', () => {
      expect(isEmptyCell('hello')).toBe(false)
      expect(isEmptyCell(' ')).toBe(false) // space is content
    })
  })

  describe('transformToI18n', () => {
    const records = [
      { KEY: 'greeting', en: 'Hello', fr: 'Bonjour' },
      { KEY: 'farewell', en: 'Goodbye', fr: 'Au revoir' },
      { KEY: 'emptyVal', en: '', fr: 'Non vide' },
      { KEY: '', en: 'No key', fr: 'Pas de cle' },
    ]
    it('should transform flat records', () => {
      const result = transformToI18n({ records, keyCol: 'KEY', valueCol: 'en', keyStyle: 'flat', transformOptions: { replacePunctuationSpace: false } })
      expect(result).toEqual({ greeting: 'Hello', farewell: 'Goodbye' })
    })
    it('should transform nested records', () => {
      const nestedRecords = [{ KEY: 'app.user.name', en: 'John Doe' }]
      const result = transformToI18n({ records: nestedRecords, keyCol: 'KEY', valueCol: 'en', keyStyle: 'nested', transformOptions: { replacePunctuationSpace: false } })
      expect(result).toEqual({ app: { user: { name: 'John Doe' } } })
    })
    it('should apply replacePunctuationSpace if enabled', () => {
      const puncRecords = [{ KEY: 'text', en: 'Note :' }]
      const result = transformToI18n({ records: puncRecords, keyCol: 'KEY', valueCol: 'en', keyStyle: 'flat', transformOptions: { replacePunctuationSpace: true } })
      expect(result).toEqual({ text: 'Note\xA0:' })
    })
    it('should log error for conflicting nested keys', () => {
      const conflictRecords = [
        { KEY: 'app.name', en: 'My App' },
        { KEY: 'app.name.short', en: 'App' }, // conflict: app.name is string
      ]
      transformToI18n({ records: conflictRecords, keyCol: 'KEY', valueCol: 'en', keyStyle: 'nested' })
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Conflict with nested key: \'app.name.short\''))
    })
  })

  describe('filterCommentRows', () => {
    it('should filter single line comment', () => {
      const csv = '//comment\nkey,value\n#another,comment'
      // filterCommentRows normalizes to \r\n
      expect(filterCommentRows({ csvString: csv, commentsConfig: '//' })).toBe('key,value\r\n#another,comment')
    })
    it('should return an empty string if all lines are comments', () => {
      const csv = '//comment1\n#comment2'
      expect(filterCommentRows({ csvString: csv, commentsConfig: ['//', '#'] })).toBe('')
    })
    it('should filter multiple comment patterns', () => {
      const csv = '//comment1\n#comment2\nkey,value'
      expect(filterCommentRows({ csvString: csv, commentsConfig: ['//', '#'] })).toBe('key,value')
    })
    it('should not filter if commentsConfig is false', () => {
      const csv = '//comment\nkey,value'
      expect(filterCommentRows({ csvString: csv, commentsConfig: false })).toBe(csv)
    })
    it('should handle comments with quotes', () => {
      const csv = '"//comment"\nkey,value'
      expect(filterCommentRows({ csvString: csv, commentsConfig: '//' })).toBe('key,value')
    })
  })

  describe('parseCsvData', () => {
    it('should parse valid CSV string', () => {
      const csv = 'KEY,en,fr\ngreeting,Hello,Bonjour'
      const { data, meta, errors } = parseCsvData({ csvString: csv, delimiter: undefined, logName: 'test.csv' })
      expect(errors).toEqual([])
      expect(meta?.fields).toEqual(['KEY', 'en', 'fr'])
      expect(data).toEqual([{ KEY: 'greeting', en: 'Hello', fr: 'Bonjour' }])
    })
    it('should handle custom delimiter', () => {
      const csv = 'KEY;en;fr\ngreeting;Hello;Bonjour'
      const { data } = parseCsvData({ csvString: csv, delimiter: ';', logName: 'test.csv' })
      expect(data).toEqual([{ KEY: 'greeting', en: 'Hello', fr: 'Bonjour' }])
    })
    it('should log errors for malformed CSV', () => {
      // Malformed: inconsistent number of fields
      const csv = 'KEY,en\ngreeting,Hello,BonjourExtraField'
      parseCsvData({ csvString: csv, delimiter: undefined, logName: 'malformed.csv' })
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CSV parsing errors in malformed.csv:'))
    })
  })

  describe('filterRowsWithEmptyKeys', () => {
    const data = [
      { ID: 'k1', val: 'v1' },
      { ID: '', val: 'v2' },
      { ID: 'k3', val: 'v3' },
      { ID: null, val: 'v4' },
    ]
    it('should filter rows with empty or null keys', () => {
      const { filteredRows, skippedCount } = filterRowsWithEmptyKeys({ dataRows: data, keyColumn: 'ID', logName: 'test.csv' })
      expect(skippedCount).toBe(2)
      expect(filteredRows).toEqual([{ ID: 'k1', val: 'v1' }, { ID: 'k3', val: 'v3' }])
      expect(logger.info).toHaveBeenCalledWith('[sheetI18n] test.csv: 2 rows with empty key skipped.')
    })
  })

  describe('parseJiiCommand', () => {
    it('should parse valid $JII command', () => {
      const cmd = '$JII;myFile;id:item1,cat:A;path.to.key;name'
      const result = parseJiiCommand(cmd)
      expect(result).toEqual({
        id: 'myFile',
        rawPrimaries: 'id:item1,cat:A',
        pathStr: 'path.to.key',
        key: 'name',
        primaries: [['id', 'item1'], ['cat', 'A']],
      })
    })
    it('should return null for invalid format', () => {
      expect(() => parseJiiCommand('$JII;too;few;parts')).toThrowError('Invalid format')
    })
    it('should return null if not $JII command', () => {
      expect(parseJiiCommand('REGULAR_KEY')).toBeUndefined()
    })
  })

  describe('processJiiKeys', () => {
    const rows = [
      { KEY: '$JII;cloud;id:s1;config;name', en: 'Service 1 EN', fr: 'Service 1 FR' },
      { KEY: '$JII;cloud;id:s1;config;desc', en: 'Desc 1 EN', fr: 'Desc 1 FR' },
      { KEY: '$JII;cloud;id:s2;meta;title', en: 'Service 2 EN' },
      { KEY: 'regular.key', en: 'Regular Value' },
    ]
    const locales = ['en', 'fr']
    const filePath = 'test.csv'

    it('should process $JII keys and group them', () => {
      const options = { ...mockDefaultOptions, jiiProcessor: true, jiiProcessorClean: true, outDir: 'dist' }
      const { remainingRows, outputs } = processJiiKeys({ dataRows: rows, filePath, resolvedOptions: options, locales })

      expect(remainingRows).toEqual([{ KEY: 'regular.key', en: 'Regular Value' }])
      expect(outputs).toHaveLength(1)
      expect(outputs[0].type).toBe('json')
      expect(outputs[0].outputPath).toContain('dist/cloud.json')
      const content = outputs[0].content as Record<string, any>[]
      expect(content).toHaveLength(2) // Two groups: id:s1 and id:s2

      const s1 = content.find(item => item.id === 's1')
      expect(s1?.config.i18n.en.name).toBe('Service 1 EN')
      expect(s1?.config.i18n.fr.name).toBe('Service 1 FR')
      expect(s1?.config.i18n.en.desc).toBe('Desc 1 EN')
      expect(s1?.config.i18n.fr.desc).toBe('Desc 1 FR')

      const s2 = content.find(item => item.id === 's2')
      expect(s2?.meta.i18n.en.title).toBe('Service 2 EN')
      expect(s2?.meta.i18n.fr).toBeUndefined() // No FR value for s2 title
    })
  })

  describe('parseFileCommand', () => {
    it('should parse valid $FILE command with extension', () => {
      expect(parseFileCommand('$FILE;terms;md')).toEqual({ fileName: 'terms', extension: 'md' })
    })
    it('should parse valid $FILE command without extension', () => {
      expect(parseFileCommand('$FILE;readme')).toEqual({ fileName: 'readme', extension: undefined })
    })
    it('should return null for invalid format', () => {
      expect(() => parseFileCommand('$FILE;')).toThrowError('Invalid format') // Empty filename
      expect(() => parseFileCommand('$FILE;name;ext;extra')).toThrowError('Invalid format') // Too many parts
    })
  })

  describe('processFileKeys', () => {
    const rows = [
      { KEY: '$FILE;readme;md', en: 'Readme EN', fr: 'Readme FR' },
      { KEY: '$FILE;notes', en: 'Notes EN Only' },
      { KEY: 'normalKey', en: 'Normal' },
    ]
    const locales = ['en', 'fr']
    const filePath = 'test.csv'

    it('should process $FILE keys and create outputs', () => {
      const options = { ...mockDefaultOptions, fileProcessor: true, fileProcessorClean: true, outDir: 'output' }
      const { remainingRows, outputs } = processFileKeys({ dataRows: rows, filePath, resolvedOptions: options, locales })

      expect(remainingRows).toEqual([{ KEY: 'normalKey', en: 'Normal' }])
      expect(outputs).toHaveLength(3) // readme_en.md, readme_fr.md, notes_en.txt

      const readmeEn = outputs.find(o => o.outputPath.endsWith('readme_en.md'))
      expect(readmeEn?.content).toBe('Readme EN')
      expect(readmeEn?.type).toBe('file')

      const readmeFr = outputs.find(o => o.outputPath.endsWith('readme_fr.md'))
      expect(readmeFr?.content).toBe('Readme FR')

      const notesEn = outputs.find(o => o.outputPath.endsWith('notes_en'))
      expect(notesEn?.content).toBe('Notes EN Only')
    })
  })

  describe('generateStandardI18nOutputs', () => {
    const dataRows = [{ KEY: 'app.name', en: 'My App', de: 'Meine App' }]
    const detectedLocales = ['en', 'de']
    const parsedPath = parse('/path/to/source/i18n.csv')
    const filePath = '/path/to/source/i18n.csv'

    it('should generate outputs for each detected locale', () => {
      const options = { ...mockDefaultOptions, outDir: 'locales' }
      const outputs = generateStandardI18nOutputs({ dataRows, resolvedOptions: options, detectedLocales, parsedPath, filePath })
      expect(outputs).toHaveLength(2)
      expect(outputs[0].locale).toBe('en')
      expect(outputs[0].data).toEqual({ 'app.name': 'My App' })
      expect(outputs[0].outputPath).toBe(resolve('locales/en.json'))
      expect(outputs[1].locale).toBe('de')
      expect(outputs[1].data).toEqual({ 'app.name': 'Meine App' })
      expect(outputs[1].outputPath).toBe(resolve('locales/de.json'))
    })

    it('should use valueColumn if provided', () => {
      const rowsWithValueCol = [{ KEY: 'app.name', VALUE: 'My App Value' }]
      const options = { ...mockDefaultOptions, valueColumn: 'VALUE', outDir: 'locales' }
      const outputs = generateStandardI18nOutputs({ dataRows: rowsWithValueCol, resolvedOptions: options, detectedLocales: [], parsedPath, filePath })
      expect(outputs).toHaveLength(1)
      expect(outputs[0].locale).toBe('i18n') // uses filename as locale
      expect(outputs[0].data).toEqual({ 'app.name': 'My App Value' })
      expect(outputs[0].outputPath).toBe(resolve('locales/i18n.json'))
    })
  })

  describe('normalizePatterns', () => {
    it('should return empty arrays for null or undefined input', () => {
      expect(normalizePatterns(null)).toEqual({ globs: [], regexps: [] })
      expect(normalizePatterns(undefined)).toEqual({ globs: [], regexps: [] })
    })
    it('should separate globs and regexps from an array', () => {
      const pattern = ['**/*.js', /test\.ts$/, '*.vue']
      const result = normalizePatterns(pattern)
      expect(result.globs).toEqual(['**/*.js', '*.vue'])
      expect(result.regexps).toEqual([/test\.ts$/])
    })
    it('should handle single string or regexp', () => {
      expect(normalizePatterns('**/*.ts')).toEqual({ globs: ['**/*.ts'], regexps: [] })
      expect(normalizePatterns(/index\.js$/)).toEqual({ globs: [], regexps: [/index\.js$/] })
    })
  })

  describe('resolveOutputPath', () => {
    const originalFilePath = resolve('path/to/source/file.csv') // /home/mine/spreadsheet-i18n--mono/path/to/source/file.csv
    const outputName = 'en.json'
    const cwd = resolve() // /home/mine/spreadsheet-i18n--mono

    it('should resolve next to original file if outDir is not provided', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: undefined, preserveStructure: false }, originalFilePath, outputName, cwd })
      expect(result).toBe(resolve(parse(originalFilePath).dir, outputName)) // /home/mine/spreadsheet-i18n--mono/path/to/source/en.json
    })

    it('should resolve in outDir if outDir is provided and preserveStructure is false', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: false }, originalFilePath, outputName, cwd })
      expect(result).toBe(resolve(cwd, 'dist/locales', outputName)) // /home/mine/spreadsheet-i18n--mono/dist/locales/en.json
    })

    it('should preserve full structure if preserveStructure is true', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: true }, originalFilePath, outputName, cwd })
      // relative(cwd, originalFilePath) is 'path/to/source/file.csv'
      // dirname(...) is 'path/to/source'
      expect(result).toBe(resolve(cwd, 'dist/locales', 'path/to/source', outputName)) // /home/mine/spreadsheet-i18n--mono/dist/locales/path/to/source/en.json
    })

    it('should preserve parent structure if preserveStructure is "parent"', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: 'parent' }, originalFilePath, outputName, cwd })
      expect(result).toBe(resolve(cwd, 'dist/locales', 'path/to/source', outputName)) // Same as true
    })

    it('should create nested structure if preserveStructure is "nested"', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: 'nested' }, originalFilePath, outputName, cwd })
      // parse(originalFilePath).name is 'file'
      expect(result).toBe(resolve(cwd, 'dist/locales', 'path/to/source', 'file', outputName)) // /home/mine/spreadsheet-i18n--mono/dist/locales/path/to/source/file/en.json
    })

    it('should prefix output name if preserveStructure is "prefixed"', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: 'prefixed' }, originalFilePath, outputName, cwd })
      // parse(originalFilePath).name is 'file'
      expect(result).toBe(resolve(cwd, 'dist/locales', 'path/to/source', `file_${outputName}`)) // /home/mine/spreadsheet-i18n--mono/dist/locales/path/to/source/file_en.json
    })

    it('should handle originalFilePath being in the current working directory', () => {
      const localFilePath = resolve('local_i18n.csv') // /home/mine/spreadsheet-i18n--mono/local_i18n.csv
      const result = resolveOutputPath({ outDirOptions: { outDir: 'output', preserveStructure: true }, originalFilePath: localFilePath, outputName: 'fr.json', cwd })
      // relative(cwd, localFilePath) is 'local_i18n.csv'
      // dirname(...) is '.'
      expect(result).toBe(resolve(cwd, 'output', '.', 'fr.json')) // /home/mine/spreadsheet-i18n--mono/output/fr.json
    })

    it('should handle originalFilePath being in the current working directory with preserveStructure="nested"', () => {
      const localFilePath = resolve('local_i18n.csv')
      const result = resolveOutputPath({ outDirOptions: { outDir: 'output', preserveStructure: 'nested' }, originalFilePath: localFilePath, outputName: 'de.json', cwd })
      expect(result).toBe(resolve(cwd, 'output', '.', 'local_i18n', 'de.json')) // /home/mine/spreadsheet-i18n--mono/output/local_i18n/de.json
    })

    it('should handle outDir being null (same as undefined)', () => {
      const result = resolveOutputPath({ outDirOptions: { outDir: null, preserveStructure: false }, originalFilePath, outputName, cwd })
      expect(result).toBe(resolve(parse(originalFilePath).dir, outputName))
    })

    it('should handle a custom cwd being set', () => {
      const customCwd = resolve('path/to')
      const result = resolveOutputPath({ outDirOptions: { outDir: 'dist/locales', preserveStructure: true }, originalFilePath, outputName, cwd: customCwd })
      // relative(cwd, originalFilePath) is 'source/file.csv'
      // dirname(...) is 'source'
      expect(result).toBe(resolve(cwd, 'dist/locales', 'source', outputName)) // /home/mine/spreadsheet-i18n--mono/dist/locales/source/en.json
    })
  })
})
