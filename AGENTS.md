# AGENTS.md

Orientation for agents in this monorepo. Deeper sources of truth: [`README.md`](./README.md) and the
per-package READMEs in [`libs/*`](./libs) and [`locals/locales`](./locals/locales).

## Docs

Three tiers, so a reader loads only what the task needs:

1. **`AGENTS.md`** (this file) — orientation and the rules that prevent defects. Read every session.
2. **`.agentDocs/`** — depth that would bloat this file: module rationale, traps with their causes,
   compatibility rules. Read on demand.
3. **`docs/` / `README.md`** — for a person using the packages, not for an agent.

**There is no `.agentDocs/` here yet and none is needed at this size.** Create one when a section
above outgrows a screen or two: move the *reasoning* out and keep the *rule* here with a pointer to
it — nobody reads a file they do not open.

- [`docs/RELEASING.md`](./docs/RELEASING.md) — per-package release workflow: inputs, pipeline order, trusted publishers, release order.
- [`docs/I18N-PIPELINE.md`](./docs/I18N-PIPELINE.md) — sheet → JSON → locales → build-time plugin, with the cwd gotchas.

## Commands

```sh
pnpm install          # @local/locales regenerates its JSON from src/sheets on postinstall
pnpm run quickcheck   # lint + test:types across the workspace: run before saying "done"
pnpm run build        # build every package (tsdown -> dist/)
pnpm run dev          # turbo dev loop (only @local/locales has a dev task)
pnpm run i18n         # localize the sheets via lingo.dev (needs LINGODOTDEV_API_KEY in .env)
```

Per package (`-F <name>`):
```sh
pnpm run quickcheck                           # lint + test:types across the workspace
pnpm -F <lib> check                           # lint + test:types + vitest run --coverage
pnpm -F spreadsheet-i18n test run --coverage  # exactly what CI's codecov job runs
pnpm -F <lib> test                            # Vitest watch; CI must call `test run`
pnpm -F ssic cli -- --help                    # run the CLI from source, unbuilt
```

## Structure

- `libs/*` — published: `spreadsheet-i18n` (core: CSV/TSV/DSV/XLSX/ODS → JSON, file/dir/glob
  scanning; the only Codecov workflow), `unplugin-spreadsheet-i18n` ([unplugin](https://unplugin.unjs.io/)
  wrapper with an entry each for `vite`, `rollup`, `webpack`, `esbuild`, `nuxt`, `rspack`, `farm`,
  `astro`) and `ssic` (CLI, `"bin": { "ssic": "dist/cli-entry.mjs" }`, wraps `spreadsheet-i18n`).
- `locals/*` — private shared code, never published: `locales` (i18n source of truth: CSVs under
  `src/sheets/`, JSON generated into `dist/` by `entry.ts`) and `tsconfig` (`base.json`, `vue.json`).
- `.github/workflows/` — `quickcheck.yml` (callable `pnpm run quickcheck`),
  `test-&-codecov_spreadsheet-i18n.yml` (push/PR under `libs/spreadsheet-i18n/**`, runs the coverage
  command) and `release.yml` (manual, per package); `release-target.mjs` backs the release.

## Conventions

- pnpm workspace + Turborepo; `pnpm-workspace.yaml` sets `overrides`/`allowBuilds` and has no catalog — versions are pinned per `package.json`.
- Node `>=20.13.1` at the root and `engines.node >= 20` where declared; CI runs Node 22, the release workflow Node 24. ESM only.
- tsdown builds (`dist/`, gitignored); Vitest tests; `@antfu/eslint-config` owns formatting, and `lint-staged` runs `eslint --fix` on commit — run `pnpm run lint` before claiming clean.

## How to work here

- Check who calls it before you change it — the packages consume each other — and say when impact is unclear rather than guessing.
- Never overwrite or delete a large section you haven't understood.
- Don't invent requirements — surface what looks needed.
- Report the risk, not only the change: correctness, security, operational, integration.
- **Fix the root cause, not the instance.** The same bug under different names — a copied helper, a rule stated twice, a guard bypassed by a second path — is one class: fix it once, in scope.
- **Verify before claiming, and say what you checked.** A green test proves only what it asserts — **break the thing it guards and watch it fail.** If it still passes, either the test is decoration or a different guard is running; find out which. Where a stub cannot answer the question, drive the real thing. Mark anything unverified as unverified.
- Missing recall of this project: read this file, `docs/` and `git log` before acting.

## Conciseness

Prune verbose, keep correctness — code, comments, docs alike. Code: a comment only for non-obvious intent. Docs: one idea per sentence; cut anything that wouldn't change what a reader does. Delete history `git log` already holds — keep the rule, not the story. Never drop a caveat to save a line.

## User-facing docs

`README.md`, `docs/*.md` and the per-package `libs/*/README.md` are for a person. Keep the first read concise; put depth in `<details>` spoilers — the per-bundler setups in [`libs/unplugin-spreadsheet-i18n/README.md`](./libs/unplugin-spreadsheet-i18n/README.md) are the model — and add visuals where they help; no media pipeline exists yet. Docs ship with the change, in the same commit.

## Releasing

- Manual, per package, version-first: **Actions → Release → Run workflow** — one run releases ONE package; only this workflow publishes (a pushed tag does nothing). Validate locally with `pnpm run release:check <pkg> [version]`.
- Inputs, pipeline order, trusted-publisher setup and release order: [`docs/RELEASING.md`](./docs/RELEASING.md).

## Gotchas

- `dist/` is gitignored but may already exist — a stale copy is not a build result.
- `ssic` has no `test/`, so its `check` gate runs no tests even though `vitest.config.ts` includes `test/**`.
- `shamefully-hoist=true` in `.npmrc` is intentional; do not "fix" it.
- Conventional commits (`feat:`, `fix:`, `chore:`, …) — the changelogs derive from them.
