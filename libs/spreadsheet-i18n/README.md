# spreadsheet-i18n

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![Bundlejs][bundlejs-src]][bundlejs-href]
[![TypeDoc][TypeDoc-src]][TypeDoc-href]

* [spreadsheet-i18n](#spreadsheet-i18n)
  * [Overview](#overview)
  * [Features](#features)
  * [Usage](#usage)
    * [Install package](#install-package)
    * [Import and use](#import-and-use)
  * [License](#license)

## Overview

**spreadsheet-i18n** is the core library of the [**`spreadsheet-i18n--mono`**](https://github.com/NamesMT/spreadsheet-i18n--mono) monorepo, containing the main magics that enables i18n workflows with spreadsheets.

## Features

+ Supports CSV, TSV, DSV, Excel/Spreadsheets (XLS[XMB], ODT), powered by [SheetJS](https://sheetjs.com/) and [papaparse](https://www.papaparse.com/)
+ File-to-file convert: `en.csv -> en.json`
+ File-to-multiple convert: `i18n.csv -> en.json, vi.json, fr.json,...`
+ Output merging: `i18n_a.csv + i18n_b.csv -> en.json`
+ Preserve structure: `a/i18n.csv -> a/en.json | a/i18n/en.json | a/i18n_en.json`
+ File generation: `i18n_files.csv -> cloud_en.json, cloud_fr.json, template_en.html, template_fr.html`
+ And more!

## Usage

### Install package

```sh
# npm
npm install spreadsheet-i18n

# bun
bun add spreadsheet-i18n

# pnpm (recommended)
pnpm install spreadsheet-i18n
```

### Import and use

```ts
// ESM
import type { Options } from 'spreadsheet-i18n'
import { scanConvert } from 'spreadsheet-i18n'

const options: Options = {
  xlsx: true,
  comments: '#',
  outDir: undefined // output to same directory as its raw files
}
const scanDir = 'locales' // Optionally set a start point for scanning
await scanConvert(options, scanDir)
```

## License

[![License][license-src]][license-href]

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[npm-version-href]: https://npmjs.com/package/spreadsheet-i18n
[npm-downloads-src]: https://img.shields.io/npm/dm/spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/spreadsheet-i18n
[codecov-src]: https://img.shields.io/codecov/c/gh/namesmt/spreadsheet-i18n--mono/main?labelColor=18181B&color=F0DB4F&flag=spreadsheet-i18n
[codecov-href]: https://codecov.io/gh/namesmt/spreadsheet-i18n--mono
[license-src]: https://img.shields.io/github/license/namesmt/spreadsheet-i18n.svg?labelColor=18181B&color=F0DB4F
[license-href]: https://github.com/namesmt/spreadsheet-i18n/blob/main/LICENSE
[bundlejs-src]: https://img.shields.io/bundlejs/size/spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[bundlejs-href]: https://bundlejs.com/?q=spreadsheet-i18n
[TypeDoc-src]: https://img.shields.io/badge/Check_out-TypeDoc---?labelColor=18181B&color=F0DB4F
[TypeDoc-href]: https://namesmt.github.io/spreadsheet-i18n/
