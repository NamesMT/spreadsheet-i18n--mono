<div align="center">

<h1>Spreadsheet Internationalization</h1>

<h3>Libraries and applications for internationalization with spreadsheets</h3>
<img src="./branding.svg" alt="Project's branding image" width="320"/>

</div>

# starter-monorepo

* [starter-monorepo](#starter-monorepo)
  * [Overview](#overview)
    * [Why spreadsheets for i18n?](#why-spreadsheets-for-i18n)
  * [What's inside?](#whats-inside)
    * [Apps and Packages](#apps-and-packages)
    * [Utilities](#utilities)
    * [Build](#build)
    * [Develop](#develop)
    * [Notes](#notes)
      * [`import` ordering](#import-ordering)
      * [Dev with SSL](#dev-with-ssl)
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

⏩ This template is powered by [Turborepo](https://turbo.build/repo).

### Apps and Packages

(Click the hyperlink of each app to see its README detail)

- [`spreadsheet-i18n`](./libs/spreadsheet-i18n/README.md): The core library of this project, containing the main magics that enables i18n management directly within spreadsheets.
<!-- - [`frontend`](./apps/frontend/README.md): a [Nuxt](https://nuxt.com/) app, compatible with v4 structure.
  - By default, the frontend `/api/*` routes is proxied to the `backendUrl`.
  - The `rpcApi` plugin will call the `/api/*` proxy if they're on the same domain but different ports (e.g: 127.0.0.1)
    - > this mimics a production environment where the static frontend and the backend lives on the same domain at /api, which is the most efficient configuration for Cloudfront + Lambda Function Url
    - If the `frontend` and `backend` are on different domains then the backend will be called directly without proxy.
    - This could be configured in frontend's [`app.config.ts`](./apps/frontend/app/app.config.ts)
- [`backend`](./apps/backend/README.md): a [Hono🔥](https://hono.dev/) app. -->
- [`@local/locales`](./locals/locales/README.md): a shared locales/i18n library powered by [spreadsheet-i18n](./libs/spreadsheet-i18n/README.md) itself!.
- `@local/common`: a shared library that can contain constants, functions, types.
- `@local/common-vue`: a shared library that can contain components, constants, functions, types for vue-based apps.
- `tsconfig`: `tsconfig.json`s used throughout the monorepo.

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:
+ 👌 TypeScript
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

To define local development environment variables of each app, either use `git update-index --skip-worktree .env.local` and use it directly, or create a copy of or rename `.env.local` to `.env.local.ignored`.
  - AI Agent will help you creating the `.env.local.ignored` files if you use the AI initialization prompt.

### Notes

#### `import` ordering

Imports should not be separated by empty lines, and should be sorted automatically by eslint.

#### Dev with SSL

The project comes with a `localcert` SSL at `locals/common/dev` to enable HTTPS for local development, generated with [mkcert](https://github.com/FiloSottile/mkcert), you can install mkcert, generate your own certificate and replace it, or install the `localcert.crt` to your trusted CA to remove the untrusted SSL warning.

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
