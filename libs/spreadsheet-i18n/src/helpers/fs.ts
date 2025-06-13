import type { WriteFileOptions } from 'node:fs'
import { Buffer } from 'node:buffer'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { readFile as xlsxReadFile, utils as xlsxUtils } from '@e965/xlsx'
import { consola } from 'consola'
import { defu } from 'defu'
import Papa from 'papaparse'
import { dirname } from 'pathe'

/**
 * Reads a CSV/DSV file and returns its content as a string.
 */
export async function readCsvFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8')
  }
  catch (error: any) {
    consola.error(`[sheetI18n] Error reading CSV file ${filePath}: ${error.message}`)
    throw error
  }
}

/**
 * Reads an XLSX file, merges all sheets, and converts the content to a CSV string.
 */
export function readXlsxFile(filePath: string): string {
  try {
    const workbook = xlsxReadFile(filePath)
    let jsonData: Record<string, any>[] = []
    for (const sheet of Object.values(workbook.Sheets)) {
      jsonData = jsonData.concat(xlsxUtils.sheet_to_json(sheet))
    }
    return xlsxUtils.sheet_to_csv(xlsxUtils.json_to_sheet(jsonData), { FS: Papa.RECORD_SEP, RS: '\r\n' })
  }
  catch (error: any) {
    consola.error(`[sheetI18n] Error reading XLSX file ${filePath}: ${error.message}`)
    throw error
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  }
  catch {
    return false
  }
}

/**
 * Writes data to a file (parent dirs are created automatically)
 *
 * Optionally merges content if the file already exists.
 */
export async function outputFile(
  filepath: string,
  data: string | NodeJS.ArrayBufferView,
  options?: WriteFileOptions & { mergeContent?: boolean | 'json' },
): Promise<void> {
  try {
    const dir = dirname(filepath)
    // Optimistically creates dir
    await mkdir(dir, { recursive: true })

    let finalData = data
    if (options?.mergeContent && await fileExists(filepath)) {
      if (filepath.endsWith('.json') && (options.mergeContent === 'json' || options.mergeContent === true)) {
        if (typeof data !== 'string') {
          throw new TypeError('For JSON merge, `data` must be a JSON stringified object.')
        }
        const existingData = await readFile(filepath, 'utf-8')
        finalData = JSON.stringify(defu(JSON.parse(data as string), JSON.parse(existingData)), null, 2)
      }
      else if (options.mergeContent === true) {
        const existingBuffer = await readFile(filepath)
        const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data as Buffer
        finalData = Buffer.concat([existingBuffer, dataBuffer])
      }
    }
    await writeFile(filepath, finalData, options)
  }
  catch (error: any) {
    consola.error(`[sheetI18n] Error writing file ${filepath}: ${error.message}`)
    throw error
  }
}

const mergeWriteState: Record<string, boolean> = {}

/**
 * Wrapper for `outputFile` that performs a normal write on the first call
 * for a given filepath, and then uses `mergeContent: true` for subsequent calls.
 */
export async function outputWriteMerge(
  filepath: string,
  data: string | NodeJS.ArrayBufferView,
  options?: Exclude<WriteFileOptions, BufferEncoding> & { mergeContent?: boolean | 'json' },
): Promise<void> {
  const performMerge = mergeWriteState[filepath] === true
  mergeWriteState[filepath] = true

  const writeOptions = {
    ...options,
    mergeContent: performMerge ? (options?.mergeContent ?? true) : false,
  }

  if (filepath.endsWith('.json') && writeOptions.mergeContent === true) {
    writeOptions.mergeContent = 'json'
  }

  await outputFile(filepath, data, writeOptions)
}
