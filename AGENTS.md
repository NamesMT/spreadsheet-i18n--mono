# AGENTS.md

Orientation for agents in this monorepo. Deeper sources of truth: [`README.md`](./README.md) and the
per-package READMEs in [`libs/*`](./libs) and [`locals/locales`](./locals/locales).

## Fast start

```sh
pnpm install          # @local/locales regenerates its JSON from src/sheets on postinstall
pnpm run quickcheck   # lint + test:types across the workspace: run before saying "done"
pnpm run build        # build every package (tsdown -> dist/)
pnpm run dev          # turbo dev loop (only @local/locales has a dev task)
pnpm run i18n         # localize the sheets via lingo.dev (needs LINGODOTDEV_API_KEY in .env)
```

## Layout

- `libs/*` — published: `spreadsheet-i18n` (core: CSV/TSV/DSV/XLSX/ODS → JSON, file/dir/glob
  scanning; the only Codecov workflow), `unplugin-spreadsheet-i18n` ([unplugin](https://unplugin.unjs.io/)
  wrapper with an entry each for `vite`, `rollup`, `webpack`, `esbuild`, `nuxt`, `rspack`, `farm`,
  `astro`) and `ssic` (CLI, `"bin": { "ssic": "dist/cli-entry.mjs" }`, wraps `spreadsheet-i18n`).
- `locals/*` — private shared code, never published: `locales` (i18n source of truth: CSVs under
  `src/sheets/`, JSON generated into `dist/` by `entry.ts`) and `tsconfig` (`base.json`, `vue.json`).
- `.github/workflows/` — `quickcheck.yml` (callable `pnpm run quickcheck`),
  `test-&-codecov_spreadsheet-i18n.yml` (push/PR under `libs/spreadsheet-i18n/**`, runs the coverage
  command) and `release.yml` (manual, per package); `release-target.mjs` backs the release.

## Tooling

- pnpm workspace + Turborepo; `pnpm-workspace.yaml` sets `overrides`/`allowBuilds` and has no catalog — versions are pinned per `package.json`.
- Node `>=20.13.1` at the root and `engines.node >= 20` where declared; CI runs Node 22, the release workflow Node 24. ESM only.
- tsdown builds (`dist/`, gitignored); Vitest tests; `@antfu/eslint-config` owns formatting, and `lint-staged` runs `eslint --fix` on commit — run `pnpm run lint` before claiming clean.

## Commands

```sh
pnpm run quickcheck                           # lint + test:types across the workspace
pnpm -F <lib> check                           # lint + test:types + vitest run --coverage
pnpm -F spreadsheet-i18n test run --coverage  # exactly what CI's codecov job runs
pnpm -F <lib> test                            # Vitest watch; CI must call `test run`
pnpm -F ssic cli -- --help                    # run the CLI from source, unbuilt
```

## Releases

- Manual and version-first: dispatch **Actions → Release → Run workflow** with a package name and optional version (validate locally with `pnpm run release:check <pkg> [version]`); only this workflow publishes — a pushed tag does nothing.
- `release-target.mjs` validates the version, `quickcheck` runs, then [`repo-release`](https://github.com/namesmt/repo-release) writes `CHANGELOG.md`, bumps `package.json`, commits, tags `<package>@<version>`, pushes, creates the GitHub release and publishes to npm (each lib builds via its own `prepublishOnly`; the pipeline never builds the workspace).
- dry-run requires an explicit version and prints the changelog only — no commit, tag, push or publish.
- `"private": true` packages (`@local/locales`, `@local/tsconfig`) skip publish; the three `libs/*` ones each need a trusted publisher on npmjs.com naming this repo and `release.yml`.

## Gotchas

- `dist/` is gitignored but may already exist — a stale copy is not a build result.
- `ssic` has no `test/`, so its `check` gate runs no tests even though `vitest.config.ts` includes `test/**`.
- `shamefully-hoist=true` in `.npmrc` is intentional; do not "fix" it.
- Conventional commits (`feat:`, `fix:`, `chore:`, …) — the changelogs derive from them.
