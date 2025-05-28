import type { Options } from '#src/types.js'
import * as coreFunctions from '#src/core.js'
import * as fsUtils from '#src/helpers/fs.js'
import { logger } from '#src/helpers/logger.js'
import { dirname, relative, resolve } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock logger
vi.mock('#src/helpers/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock fs helpers
vi.mock('#src/helpers/fs.js', async () => {
  const originalModule = await vi.importActual('#src/helpers/fs.js')
  return {
    ...originalModule,
    readCsvFile: vi.fn(),
    readXlsxFile: vi.fn(),
    outputFile: vi.fn(),
    outputWriteMerge: vi.fn(),
  }
})

// Mock tinyglobby
vi.mock('tinyglobby', () => ({
  glob: vi.fn(),
}))

const mockedFsUtils = vi.mocked(fsUtils)
const mockedLogger = vi.mocked(logger)
const mockedTinyGlobby = await import('tinyglobby').then(m => vi.mocked(m.glob))

describe('core Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processSheetContent', () => {
    it('should process basic CSV content', () => {
      const csvContent = `KEY,en,fr\nhello,Hello,Bonjour`
      const filePath = 'i18n.csv'
      const options: Options = {}
      const { i18nOutputs, specialOutputs } = coreFunctions.processSheetContent(csvContent, filePath, options)

      expect(i18nOutputs).toHaveLength(2)
      expect(i18nOutputs[0].locale).toBe('en')
      expect(i18nOutputs[0].data).toEqual({ hello: 'Hello' })
      expect(i18nOutputs[0].outputPath).toContain('en.json')
      expect(i18nOutputs[1].locale).toBe('fr')
      expect(i18nOutputs[1].data).toEqual({ hello: 'Bonjour' })
      expect(i18nOutputs[1].outputPath).toContain('fr.json')
      expect(specialOutputs).toHaveLength(0)
    })

    it('should handle valueColumn option', () => {
      const csvContent = `KEY,VALUE\ngreeting,Hi there`
      const filePath = 'data.csv'
      const options: Options = { valueColumn: 'VALUE' }
      const { i18nOutputs } = coreFunctions.processSheetContent(csvContent, filePath, options)

      expect(i18nOutputs).toHaveLength(1)
      expect(i18nOutputs[0].locale).toBe('data')
      expect(i18nOutputs[0].data).toEqual({ greeting: 'Hi there' })
      expect(i18nOutputs[0].outputPath).toContain('data.json')
    })

    it('should filter comments', () => {
      const csvContent = `KEY,en\n// This is a comment\nwelcome,Welcome`
      const filePath = 'i18n.csv'
      const options: Options = { comments: '//' }
      const { i18nOutputs } = coreFunctions.processSheetContent(csvContent, filePath, options)
      expect(i18nOutputs[0].data).toEqual({ welcome: 'Welcome' })
    })

    it('should handle nested keys', () => {
      const csvContent = `KEY,en\napp.title,My App`
      const filePath = 'i18n.csv'
      const options: Options = { keyStyle: 'nested' }
      const { i18nOutputs } = coreFunctions.processSheetContent(csvContent, filePath, options)
      expect(i18nOutputs[0].data).toEqual({ app: { title: 'My App' } })
    })

    // TODO: Add tests for $JSON and $FILE processors
  })

  describe('processSheetFile', () => {
    const testFilePath = resolve('test-data/i18n.csv')
    const testRootDir = resolve('test-data')

    beforeEach(() => {
      mockedFsUtils.readCsvFile.mockResolvedValue(`KEY,en\ntest.key,Test Value`)
    })

    it('should read CSV, process content, and output JSON files', async () => {
      const options: Options = {}
      await coreFunctions.processSheetFile(testFilePath, options, testRootDir)

      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(testFilePath)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledTimes(1)
      // Output path will be test-data/en.json because outDir is undefined
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(testRootDir, 'en.json'),
        JSON.stringify({ 'test.key': 'Test Value' }, null, 2),
        { encoding: 'utf8', mergeContent: 'json' },

      )
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Processing: ${relative(testRootDir, testFilePath)}`)
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Generated: ${relative(testRootDir, resolve(testRootDir, 'en.json'))}`)
    })

    it('should use outputFile when mergeOutput is false', async () => {
      const options: Options = { mergeOutput: false }
      await coreFunctions.processSheetFile(testFilePath, options, testRootDir)
      expect(mockedFsUtils.outputFile).toHaveBeenCalledTimes(1)
      expect(mockedFsUtils.outputFile).toHaveBeenCalledWith(
        resolve(testRootDir, 'en.json'),
        JSON.stringify({ 'test.key': 'Test Value' }, null, 2),
        { encoding: 'utf8' },
      )
    })

    it('should handle xlsx files if xlsx option is true', async () => {
      const xlsxFilePath = resolve('test-data/i18n.xlsx')
      mockedFsUtils.readXlsxFile.mockReturnValue(`KEY,en\nexcel.key,Excel Value`)
      const options: Options = { xlsx: true }
      await coreFunctions.processSheetFile(xlsxFilePath, options, testRootDir)

      expect(mockedFsUtils.readXlsxFile).toHaveBeenCalledWith(xlsxFilePath)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(testRootDir, 'en.json'),
        JSON.stringify({ 'excel.key': 'Excel Value' }, null, 2),
        { encoding: 'utf8', mergeContent: 'json' },
      )
    })

    it('should log error for unsupported file types', async () => {
      const unsupportedFilePath = resolve('test-data/i18n.txt')
      await coreFunctions.processSheetFile(unsupportedFilePath, {}, testRootDir)
      expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining(`[sheetI18n] Unexpected extension: ${unsupportedFilePath}`))
    })
  })

  describe('scanConvert', () => {
    beforeEach(() => {
      mockedTinyGlobby.mockReset()
      mockedFsUtils.readCsvFile.mockReset()
      mockedFsUtils.readXlsxFile.mockReset()
      mockedFsUtils.outputFile.mockReset()
      mockedFsUtils.outputWriteMerge.mockReset()
    })

    const defaultScanDir = resolve() // Default scan directory is CWD

    it('should scan and process files matching include glob', async () => {
      const file1Path = resolve(defaultScanDir, 'src/i18n.csv')
      const file2Path = resolve(defaultScanDir, 'modules/translation.csv')
      const files = [file1Path, file2Path]

      mockedTinyGlobby.mockResolvedValue(files)
      // Mock CSV content for each file
      mockedFsUtils.readCsvFile
        .mockResolvedValueOnce(`KEY,en\nkey1,Value1`) // For file1Path
        .mockResolvedValueOnce(`KEY,fr\nkey2,Valeur2`) // For file2Path

      const options: Options = { include: '**/*.csv' }
      await coreFunctions.scanConvert(options)

      expect(mockedTinyGlobby).toHaveBeenCalledWith(['**/*.csv'], expect.objectContaining({ cwd: defaultScanDir, ignore: [], absolute: true }))
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Scanning directory: ${defaultScanDir}`)
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Found ${files.length} files to process.`)

      // Check processing for file1Path
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file1Path)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'src/en.json'), // Default outDir, preserveStructure: false
        JSON.stringify({ key1: 'Value1' }, null, 2),
        { encoding: 'utf8', mergeContent: 'json' },
      )

      // Check processing for file2Path
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file2Path)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'modules/fr.json'), // Default outDir, preserveStructure: false
        JSON.stringify({ key2: 'Valeur2' }, null, 2),
        { encoding: 'utf8', mergeContent: 'json' },
      )
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Processing: ${relative(defaultScanDir, file1Path)}`)
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Generated: ${relative(defaultScanDir, resolve(defaultScanDir, 'src/en.json'))}`)
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Processing: ${relative(defaultScanDir, file2Path)}`)
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Generated: ${relative(defaultScanDir, resolve(defaultScanDir, 'modules/fr.json'))}`)
      expect(mockedLogger.info).toHaveBeenCalledWith('[sheetI18n] Scan and convert finished.')
    })

    it('should use scanDir and options like outDir and preserveStructure', async () => {
      const customScanDir = resolve('custom/path')
      const file1Path = resolve(customScanDir, 'data/projectA/i18n.csv')
      mockedTinyGlobby.mockResolvedValue([file1Path])
      mockedFsUtils.readCsvFile.mockResolvedValueOnce(`KEY,en\napp.title,My App`)

      const options: Options = {
        include: '**/projectA/i18n.csv',
        outDir: 'dist/locales',
        preserveStructure: true, // Will output to dist/locales/data/projectA/en.json
      }

      await coreFunctions.scanConvert(options, customScanDir)

      expect(mockedTinyGlobby).toHaveBeenCalledWith(['**/projectA/i18n.csv'], expect.objectContaining({ cwd: customScanDir }))
      expect(mockedLogger.info).toHaveBeenCalledWith(`[sheetI18n] Scanning directory: ${customScanDir}`)
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file1Path)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'dist/locales', relative(defaultScanDir, dirname(file1Path)), 'en.json'),
        JSON.stringify({ 'app.title': 'My App' }, null, 2),
        { encoding: 'utf8', mergeContent: 'json' },
      )
    })

    it('should filter files using include regexp and handle mergeOutput: false', async () => {
      const file1 = resolve(defaultScanDir, 'src/i18n.csv') // matches regex
      const file2 = resolve(defaultScanDir, 'src/data.json') // no match
      const file3 = resolve(defaultScanDir, 'locales/en/common.csv') // matches regex
      const filesFromGlob = [file1, file2, file3]

      mockedTinyGlobby.mockResolvedValue(filesFromGlob)
      mockedFsUtils.readCsvFile
        .mockResolvedValueOnce(`KEY,en\nkey.one,One`) // For file1
        .mockResolvedValueOnce(`KEY,en\ncommon.greeting,Hello`) // For file3

      const options: Options = {
        include: /i18n\.csv$|locales\/.+\.csv$/,
        mergeOutput: false, // Should use outputFile
      }
      await coreFunctions.scanConvert(options)

      expect(mockedTinyGlobby).toHaveBeenCalledWith(['**/*'], expect.objectContaining({ cwd: defaultScanDir }))
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file1)
      expect(mockedFsUtils.outputFile).toHaveBeenCalledWith( // Not outputWriteMerge
        resolve(defaultScanDir, 'src/en.json'),
        JSON.stringify({ 'key.one': 'One' }, null, 2),
        { encoding: 'utf8' },
      )
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file3)
      expect(mockedFsUtils.outputFile).toHaveBeenCalledWith( // Not outputWriteMerge
        resolve(defaultScanDir, 'locales/en/en.json'), // common.csv -> en.json
        JSON.stringify({ 'common.greeting': 'Hello' }, null, 2),
        { encoding: 'utf8' },
      )
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalledWith(file2)
      expect(mockedFsUtils.outputFile).toHaveBeenCalledTimes(2) // Called for file1 and file3
    })

    it('should filter files using exclude patterns (glob and regexp)', async () => {
      const fileToProcess = resolve(defaultScanDir, 'src/i18n.csv')
      const fileToExcludeByGlob = resolve(defaultScanDir, 'src/ignore_this.csv')
      const fileToExcludeByRegex = resolve(defaultScanDir, 'temp/temp_i18n.csv')

      // Simulate tinyglobby's behavior with ignore
      // @ts-expect-error ok to ignore
      mockedTinyGlobby.mockImplementation(async (globs, opts) => {
        let allFiles = [fileToProcess, fileToExcludeByGlob, fileToExcludeByRegex]
        if (opts?.ignore) {
          // Super simplified ignore logic for test
          allFiles = allFiles.filter(f => !opts.ignore?.some((ig: string) => f.includes(ig.replace('**/', ''))))
        }
        return allFiles.filter(f => (Array.isArray(globs) ? globs : [globs]).some(g => f.includes(g.replace('**/*.', ''))))
      })

      mockedFsUtils.readCsvFile.mockResolvedValueOnce(`KEY,en\nvalid,Valid Key`)

      const options: Options = {
        include: '**/*.csv',
        exclude: ['**/ignore_this.csv', /temp\//],
      }
      await coreFunctions.scanConvert(options)

      expect(mockedTinyGlobby).toHaveBeenCalledWith(
        ['**/*.csv'],
        expect.objectContaining({ ignore: ['**/ignore_this.csv'] }),
      )
      // Check that only fileToProcess was actually read and written
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledTimes(1)
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(fileToProcess)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledTimes(1)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'src/en.json'),
        JSON.stringify({ valid: 'Valid Key' }, null, 2),
        expect.anything(),
      )
      // Ensure others were not processed
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalledWith(fileToExcludeByGlob)
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalledWith(fileToExcludeByRegex)
    })

    it('should log warning and return if no include patterns are specified', async () => {
      const options: Options = { include: [] }
      await coreFunctions.scanConvert(options)

      expect(mockedLogger.warn).toHaveBeenCalledWith('[sheetI18n] No include patterns specified (neither globs nor RegExps). Nothing to process.')
      expect(mockedTinyGlobby).not.toHaveBeenCalled()
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalled()
    })

    it('should log info and return if no files match patterns after globbing', async () => {
      mockedTinyGlobby.mockResolvedValue([])
      const options: Options = { include: '*.csv' }
      await coreFunctions.scanConvert(options)

      expect(mockedLogger.info).toHaveBeenCalledWith('[sheetI18n] No files matched the specified patterns after all filters.')
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalled()
    })

    it('should log info and return if no files match after regex filter', async () => {
      const filesFromGlob = [resolve(defaultScanDir, 'src/other.txt'), resolve(defaultScanDir, 'docs/readme.md')]
      mockedTinyGlobby.mockResolvedValue(filesFromGlob) // Glob returns files, but they won't match regex
      const options: Options = { include: /\.csv$/ } // Only CSV files

      await coreFunctions.scanConvert(options)

      expect(mockedLogger.info).toHaveBeenCalledWith('[sheetI18n] No files matched the specified patterns after all filters.')
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalled()
    })

    it('should handle glob errors gracefully', async () => {
      const globError = new Error('Globbing failed')
      mockedTinyGlobby.mockRejectedValue(globError)
      const options: Options = { include: '*.csv' }
      await coreFunctions.scanConvert(options)

      expect(mockedLogger.error).toHaveBeenCalledWith(`[sheetI18n] Error during globbing: ${globError.message}`)
      expect(mockedFsUtils.readCsvFile).not.toHaveBeenCalled()
    })

    it('should correctly use default include pattern if options.include is undefined', async () => {
      const file1Path = resolve(defaultScanDir, 'src/i18n.csv') // Matches default regex
      const file2Path = resolve(defaultScanDir, 'src/i18n.tsv') // Matches default regex
      const file3Path = resolve(defaultScanDir, 'src/other.txt') // Does not match
      mockedTinyGlobby.mockResolvedValue([file1Path, file2Path, file3Path])

      mockedFsUtils.readCsvFile
        .mockResolvedValueOnce(`KEY,en\ndefault.key1,Default Value 1`) // For file1Path
        .mockResolvedValueOnce(`KEY,fr\ndefault.key2,Default Value 2`) // For file2Path

      const options: Options = {} // No include, so default is used
      await coreFunctions.scanConvert(options)

      // Default include is a regex, so glob searches all, then filters
      expect(mockedTinyGlobby).toHaveBeenCalledWith(['**/*'], expect.objectContaining({ cwd: defaultScanDir }))

      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file1Path)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'src/en.json'),
        JSON.stringify({ 'default.key1': 'Default Value 1' }, null, 2),
        expect.anything(),
      )
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledWith(file2Path)
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledWith(
        resolve(defaultScanDir, 'src/fr.json'),
        JSON.stringify({ 'default.key2': 'Default Value 2' }, null, 2),
        expect.anything(),
      )
      expect(mockedFsUtils.readCsvFile).toHaveBeenCalledTimes(2) // Only for .csv and .tsv
      expect(mockedFsUtils.outputWriteMerge).toHaveBeenCalledTimes(2)
    })
  })
})
