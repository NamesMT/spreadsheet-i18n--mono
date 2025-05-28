# unplugin-spreadsheet-i18n

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![Bundlejs][bundlejs-src]][bundlejs-href]
[![TypeDoc][TypeDoc-src]][TypeDoc-href]

* [unplugin-spreadsheet-i18n](#unplugin-spreadsheet-i18n)
  * [Overview](#overview)
  * [Features](#features)
  * [Usage](#usage)
    * [Install package](#install-package)
    * [Setup](#setup)
  * [License](#license)

## Overview

**unplugin-spreadsheet-i18n** is an unplugin wrapper of [**`spreadsheet-i18n`**](https://github.com/NamesMT/spreadsheet-i18n--mono/blob/main/libs/spreadsheet-i18n/README.md) which contains the magics that enables i18n workflows with spreadsheets.

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
npm install unplugin-spreadsheet-i18n

# bun
bun add unplugin-spreadsheet-i18n

# pnpm (recommended)
pnpm install unplugin-spreadsheet-i18n
```

### Setup

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import SheetI18n from 'unplugin-spreadsheet-i18n/vite'

export default defineConfig({
  plugins: [
    SheetI18n({ /* options */ }),
  ],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import SheetI18n from 'unplugin-spreadsheet-i18n/rollup'

export default {
  plugins: [
    SheetI18n({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-spreadsheet-i18n/webpack')({ /* options */ })
  ]
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

```ts
// nuxt.config.js
export default defineNuxtConfig({
  modules: [
    ['unplugin-spreadsheet-i18n/nuxt', { /* options */ }],
  ],
})
```

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-spreadsheet-i18n/webpack')({ /* options */ }),
    ],
  },
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import SheetI18n from 'unplugin-spreadsheet-i18n/esbuild'

build({
  plugins: [SheetI18n()],
})
```

<br></details>

## License

[![License][license-src]][license-href]

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unplugin-spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[npm-version-href]: https://npmjs.com/package/unplugin-spreadsheet-i18n
[npm-downloads-src]: https://img.shields.io/npm/dm/unplugin-spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/unplugin-spreadsheet-i18n
[codecov-src]: https://img.shields.io/codecov/c/gh/namesmt/unplugin-spreadsheet-i18n--mono/main?labelColor=18181B&color=F0DB4F&flag=unplugin-spreadsheet-i18n
[codecov-href]: https://codecov.io/gh/namesmt/unplugin-spreadsheet-i18n--mono
[license-src]: https://img.shields.io/github/license/namesmt/unplugin-spreadsheet-i18n.svg?labelColor=18181B&color=F0DB4F
[license-href]: https://github.com/namesmt/unplugin-spreadsheet-i18n/blob/main/LICENSE
[bundlejs-src]: https://img.shields.io/bundlejs/size/unplugin-spreadsheet-i18n?labelColor=18181B&color=F0DB4F
[bundlejs-href]: https://bundlejs.com/?q=unplugin-spreadsheet-i18n
[TypeDoc-src]: https://img.shields.io/badge/Check_out-TypeDoc---?labelColor=18181B&color=F0DB4F
[TypeDoc-href]: https://namesmt.github.io/unplugin-spreadsheet-i18n/
