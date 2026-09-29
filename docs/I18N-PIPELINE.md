# i18n pipeline

## Sheet → JSON (`spreadsheet-i18n`)

- Entry points: `scanConvert(options, cwd)` (scan) and `processSheetFile({ filePath, options, filter, cwd })` (one file), both in `libs/spreadsheet-i18n/src/core.ts`.
- Scanned extensions: `.csv`/`.dsv`/`.tsv`; `.xls/.xlsx/.xlsm/.xlsb/.ods/.fods` only with `xlsx: true`. Multi-sheet workbooks are concatenated into one table.
- Default `include` is `/(?:[/\\]|^)i18n\.[cdt]sv$/` — the file must be named `i18n.csv|tsv|dsv` unless you pass your own.
- Lines starting with `comments` (default `//`) are dropped before parsing; the split is on `\r\n` only, so a lone-`\n` sheet is one line — a comment on its line 1 drops the whole file.
- The `keyColumn` header (default `KEY`) holds keys; every other header matching `localesMatcher` (default `/^\w{2}(?:-\w{2,4})?$/`) is a locale column — a two-letter non-locale header such as `id` also matches. Rows with an empty key are skipped.
- `valueColumn` unset (default) → one `<locale>.json` per locale column; set → one `<inputName>.json` from that column.
- `keyStyle: 'nested'` (default `flat`) expands dotted keys; `replacePunctuationSpace: true` (default) turns a space before `!$%:;?+-` into a non-breaking space (French).
- Opt-in `$JII;` keys → `<id>.json`, an array of primary-keyed objects with nested `i18n.<locale>.<key>`; opt-in `$FILE;` keys → `<fileName>_<locale>[.ext]` text files. The `*Clean` flags (default true) drop consumed rows from normal output.
- Write: 2-space JSON, empty objects skipped with a warning; `mergeOutput: true` (default) merges into an already-written path, freshly generated values winning and existing-only keys kept.

## Build-time integration (`unplugin-spreadsheet-i18n`)

- `buildStart` calls `scanConvert(options, cwd)`; Vite additionally calls `processSheetFile` from `handleHotUpdate`.
- `cwd` starts as `resolve()` (`process.cwd()`) and Vite's `configResolved` replaces it with `config.root`.
- The HMR filter is Vite's `createFilter(options?.include, options?.exclude)`; with both unset it matches every changed file, so editing a non-sheet file still reaches `processSheetFile` and logs `Unexpected extension`.
- Options come from `spreadsheet-i18n`; `nuxt.ts` registers the Vite and Webpack plugins, `astro.ts` pushes the Vite plugin, the rest are `createXPlugin(unpluginFactory)` one-liners.

## cwd / path rules

- `scanConvert`/`processSheetFile` default `cwd` to `resolve()`; string globs resolve against `cwd`, but RegExps are tested against the path **relative to `cwd`** (differs from the old `unplugin-sheet-i18n`; covered by `libs/spreadsheet-i18n/test/_realUse/scanConvertCwd`).
- `outDir` is resolved against `process.cwd()`, not the `cwd` argument: in `locals/locales/entry.ts` the relative `'dist'` only lands beside the package because pnpm runs the script from that package directory.
- With no `outDir`, JSON is written next to its source sheet; `preserveStructure` only applies when `outDir` is set.

## Locales bucket (`locals/locales`)

- Source of truth: `locals/locales/src/sheets/i18n.csv`, headers `KEY,Description,en,es,fr,ru,vi,zh-CN` (`Description` is not a locale).
- `entry.ts`: `scanConvert({ outDir: 'dist', preserveStructure: true }, 'src/sheets')` → `locals/locales/dist/<locale>.json` (gitignored, built by `postinstall` on `pnpm install`, watched by `pnpm run dev`).
- `i18n.json` buckets `locals/locales/src/sheets/i18n.csv` with source `en` and targets `es,fr,ru,vi,zh-CN`; `pnpm run i18n` (`pnpm dlx lingo.dev run`) writes the translations back into that same CSV.
- Consumers read the JSON through `petite-vue-i18n` (`src/index.ts`: `legacy: false`, `locale`/`fallbackLocale` `en`; `src/composer.ts` clones a composer to translate locales in parallel).
