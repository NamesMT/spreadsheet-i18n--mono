<div align="center">

<h1>Spreadsheet Internationalization</h1>

<h3>Libraries and applications for internationalization with spreadsheets</h3>
<img src="./branding.svg" alt="Project's branding image" width="320"/>

</div>

# spreadsheet-i18n--mono

* [spreadsheet-i18n--mono](#spreadsheet-i18n--mono)
  * [Overview](#overview)
    * [Why spreadsheets for i18n?](#why-spreadsheets-for-i18n)
  * [What's inside?](#whats-inside)
    * [Overview of the tech](#overview-of-the-tech)
    * [Apps and Libraries](#apps-and-libraries)
      * [`spreadsheet-i18n`: The core library](#spreadsheet-i18n-the-core-library)
      * [`unplugin-spreadsheet-i18n`: Unplugin support](#unplugin-spreadsheet-i18n-unplugin-support)
      * [`ssic`: CLI wrapper](#ssic-cli-wrapper)
    * [Local packages](#local-packages)
    * [Utilities](#utilities)
    * [Build](#build)
    * [Develop](#develop)
    * [Notes](#notes)
      * [`import` ordering](#import-ordering)
    * [Remote Caching](#remote-caching)
  * [Useful Links](#useful-links)

## Overview

This monorepo aims to develop a suite of libraries and applications designed to revolutionize internationalization (i18n) workflows. The core objective is to make i18n tasks more enjoyable, structurally elegant, highly efficient, and exceptionally collaborative, particularly for team members without a coding background. This will be achieved by enabling i18n management directly within datasheets/spreadsheets.

### Why spreadsheets for i18n?

Traditional i18n often involves navigating complex file formats (like JSON or YAML), which can be error-prone and intimidating for non-developers. Spreadsheets, on the other hand, offer a familiar and intuitive interface with powerful features that can significantly enhance the i18n process:

* **Rich Formatting & Organization:** Features like cell coloring, comments, notes, and multiple sheets/tabs allow for clear structuring and communication of translation data, which is invaluable in large-scale projects.
* **Ease of Collaboration:** Spreadsheets are universally accessible. Different teams (e.g., translators, content creators, product managers) can easily open, find, and edit translations without needing to understand specific programming syntaxes.
* **Natural Workflow:** For many, working within a spreadsheet is a more natural and straightforward way to manage textual data compared to code-centric approaches.
* **Improved Tracking and Comparison:** Again, most current i18n workflows deal with multiple JSON/YAML files, which is very hard to keep track of, both for humans and AIs. Uniforming translations under a datasheet format like CSV, which have columns support, makes it easy for both humans and AI to compare translations across different languages and quickly identify missing translations.

## What's inside?

### Overview of the tech

⏩ This template is powered by [Turborepo](https://turbo.build/repo).

💯 JS is always [**TypeScript**](https://www.typescriptlang.org/) where possible.

### Apps and Libraries

#### [`spreadsheet-i18n`](./libs/spreadsheet-i18n): The core library

* Containing the main magics that enables i18n management directly within spreadsheets.

#### [`unplugin-spreadsheet-i18n`](./libs/unplugin-spreadsheet-i18n): [Unplugin](https://unplugin.unjs.io/) support

* Unplugin wrapper to integrate with any project easily!

#### [`ssic`](./libs/ssic): CLI wrapper

* CLI wrapper so that you can easily convert CSV/XLSX/ODS to JSON from your terminal.

### Local packages

+ [`@local/locales`](./locals/locales): a shared central locales/i18n data library powered by [**spreadsheet-i18n**](https://github.com/NamesMT/spreadsheet-i18n--mono).
  + 🌐✨🤖 **AUTOMATIC** localization with AI, powered by [**lingo.dev**](https://lingo.dev/), just `pnpm run i18n`.
  + 🔄️ Hot-reload and automatic-reload supported, changes are reflected in apps (`frontend`, `backend`) instantly.
+ `tsconfig`: `tsconfig.json`s used throughout the monorepo.

### Utilities

This Turborepo has some additional tools already setup for you:
+ 🧐 ESLint + stylistic formatting rules ([antfu](https://github.com/antfu/eslint-config))
+ 📚 A few more goodies like:
  + [lint-staged](https://github.com/lint-staged/lint-staged) pre-commit hook
  + 🤖 Initialization prompt for AI Agents to modify the monorepo according to your needs.
    * To start, open the chat with your AI Agent, and include the [`INIT_PROMPT.md`](./INIT_PROMPT.md) file in your prompt.

### Build

To build all apps and packages, run the following command:  
`pnpm run build`

### Develop

To develop all apps and packages, run the following command:  
`pnpm run dev`

For local development environment variables / secrets, create a copy of `.env.dev` to `.env.dev.local`.

### Notes

#### `import` ordering

Imports should not be separated by empty lines, and should be sorted automatically by eslint.

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
