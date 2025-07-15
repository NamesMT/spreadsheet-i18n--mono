<div align="center">

<h1>Spreadsheet Command-Line Internalization Tool</h1>

<h3>Easily convert CSV/XLSX/ODS to JSON from your terminal</h3>

</div>

# sscli ![TypeScript heart icon](https://img.shields.io/badge/♡-%23007ACC.svg?logo=typescript&logoColor=white)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![Bundlejs][bundlejs-src]][bundlejs-href]
[![TypeDoc][TypeDoc-src]][TypeDoc-href]

* [sscli ](#sscli-)
  * [Overview](#overview)
  * [Features](#features)
  * [Usage](#usage)
  * [License](#license)

## Overview

**sscli** is a command-line wrapper for [**`spreadsheet-i18n`**](https://github.com/NamesMT/spreadsheet-i18n--mono/blob/main/libs/spreadsheet-i18n/README.md) which contains the magics that enables i18n workflows with spreadsheets.

## Features

+ Supports CSV, TSV, DSV, Excel/Spreadsheets (XLS[XMB], [F]ODS), powered by [SheetJS](https://sheetjs.com/) and [papaparse](https://www.papaparse.com/)
+ File-to-file convert: `en.csv -> en.json`
+ File-to-multiple convert: `i18n.csv -> en.json, vi.json, fr.json,...`
+ Output merging: `i18n_a.csv + i18n_b.csv -> en.json`
+ Preserve structure: `a/i18n.csv -> a/en.json | a/i18n/en.json | a/i18n_en.json`
+ File generation: `i18n_files.csv -> cloud_en.json, cloud_fr.json, template_en.html, template_fr.html`
+ And more!

## Usage

```sh
npx sscli -i locales/i18nSheet.csv -o dist/locales/
```

## License

[![License][license-src]][license-href]

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/sscli?labelColor=18181B&color=F0DB4F
[npm-version-href]: https://npmjs.com/package/sscli
[npm-downloads-src]: https://img.shields.io/npm/dm/sscli?labelColor=18181B&color=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/sscli
[codecov-src]: https://img.shields.io/codecov/c/gh/namesmt/spreadsheet-i18n--mono/main?labelColor=18181B&color=F0DB4F&flag=sscli
[codecov-href]: https://codecov.io/gh/namesmt/spreadsheet-i18n--mono
[license-src]: https://img.shields.io/github/license/namesmt/sscli.svg?labelColor=18181B&color=F0DB4F
[license-href]: https://github.com/namesmt/sscli/blob/main/LICENSE
[bundlejs-src]: https://img.shields.io/bundlejs/size/sscli?labelColor=18181B&color=F0DB4F
[bundlejs-href]: https://bundlejs.com/?q=sscli
[jsDocs-src]: https://img.shields.io/badge/Check_out-jsDocs.io---?labelColor=18181B&color=F0DB4F
[jsDocs-href]: https://www.jsdocs.io/package/sscli
[TypeDoc-src]: https://img.shields.io/badge/Check_out-TypeDoc---?labelColor=18181B&color=F0DB4F
[TypeDoc-href]: https://namesmt.github.io/sscli/
