# AGENTS.md

Orientation for agents in this monorepo. Deeper sources of truth: [`README.md`](./README.md) and the
per-package READMEs in [`libs/*`](./libs) and [`locals/locales`](./locals/locales).

## Docs

Where knowledge lives, and when to reach for each:

| tier | what it holds | when you use it |
| --- | --- | --- |
| `AGENTS.md` — this file | orientation and the rules that prevent defects | read every session; write when a rule is learned the hard way |
| `.agentDocs/` | depth: module rationale, traps with their causes, compatibility | read on demand, before touching that area; write when a rule needs its reasoning kept |
| `docs/` | how-to and reference for a person using this package | read when the task is user-facing; write in the same commit as the change |
| `README.md` | the first read, for a person | write alongside `docs/` |

- **One home per fact.** State the rule here, keep the reasoning in `.agentDocs/` and link it — never both.
- **A dead pointer is a bug.** If the target is gone, delete the pointer rather than leave it.
- Move depth behind a pointer once a section outgrows a screen or two; keep the rule inline.

| file | what it covers |
| --- | --- |
| [`docs/RELEASING.md`](./docs/RELEASING.md) | per-package release workflow: inputs, pipeline order, trusted publishers, release order |
| [`docs/I18N-PIPELINE.md`](./docs/I18N-PIPELINE.md) | sheet → JSON → locales → build-time plugin, with the cwd gotchas |

## Commands

Root scripts — all are `turbo run <task>` unless noted, so they fan out across the workspace:

```sh
pnpm install            # @local/locales regenerates its JSON from src/sheets on postinstall
pnpm run quickcheck     # turbo run quickcheck: lint + test:types everywhere — fast, no tests
pnpm run check          # turbo run check: quickcheck plus every package's tests: CI, deploy and release use this
pnpm run build          # turbo run build (tsdown -> each package's dist/)
pnpm run dev            # turbo run dev:prepare then dev (only @local/locales has a dev task)
pnpm run i18n           # localize the sheets via lingo.dev (needs LINGODOTDEV_API_KEY in .env)
pnpm run release:check <pkg> [version]   # scripts/release-target.mjs — validates the release target
```

One package at a time, with `-F`:

```sh
pnpm -F <pkg> quickcheck                       # that package's lint + test:types
pnpm -F <pkg> check                            # lint + test:types + vitest run --coverage (the full gate)
pnpm -F <pkg> test                             # Vitest watch mode
pnpm -F spreadsheet-i18n test run --coverage   # exactly what CI's codecov job runs
pnpm -F ssic cli -- --help                     # run the CLI from source, unbuilt
```

The workspace packages are `spreadsheet-i18n`, `unplugin-spreadsheet-i18n`, `ssic`, `@local/locales`
and `@local/tsconfig` — pass those names to `-F`.

## Structure

Paths are relative to this repo's root; three packages have their own `src/`, so they are always prefixed.

- `libs/spreadsheet-i18n` — the published core: `libs/spreadsheet-i18n/src/index.ts` re-exports
  `libs/spreadsheet-i18n/src/core.ts`, `libs/spreadsheet-i18n/src/helpers/*` and
  `libs/spreadsheet-i18n/src/types.ts` (CSV/TSV/DSV/XLSX/ODS → JSON, file/dir/glob scanning); tsdown
  entry `libs/spreadsheet-i18n/src/index.ts`, `exports` → `dist/index.mjs`. The only package with a
  Codecov workflow.
- `libs/unplugin-spreadsheet-i18n` — the [unplugin](https://unplugin.unjs.io/) wrapper: one entry per
  bundler (`libs/unplugin-spreadsheet-i18n/src/{vite,rollup,webpack,esbuild,nuxt,rspack,farm,astro}.ts`)
  plus `libs/unplugin-spreadsheet-i18n/src/index.ts` and `libs/unplugin-spreadsheet-i18n/src/types.ts`;
  tsdown entry `libs/unplugin-spreadsheet-i18n/src/*.ts`, and `exports` maps each of those to its own
  `dist/*.mjs`.
- `libs/ssic` — the CLI: `libs/ssic/src/cli-entry.ts` only, behind `"bin": { "ssic": "dist/cli-entry.mjs" }`;
  tsdown entry `libs/ssic/src/cli-entry.ts` with `dts: false`, and no `exports` map.
- `locals/locales` (`@local/locales`) — private, never published: `entry.ts` runs on `postinstall`
  and `dev`, writing `locals/locales/src/sheets/` (the i18n source of truth) through `locals/locales/src/index.ts` + `locals/locales/src/composer.ts`
  into generated JSON in `dist/`.
- `locals/tsconfig` (`@local/tsconfig`) — private shared TypeScript bases: `base.json` and `vue.json`.
- `.github/workflows/` — `quickcheck.yml` (keeps its name; callable, runs `pnpm run check`),
  `test-&-codecov_spreadsheet-i18n.yml` (push/PR under `libs/spreadsheet-i18n/**`, runs the coverage
  command) and `release.yml` (manual, per package); `scripts/release-target.mjs` backs the release.

## Conventions

- pnpm workspace + Turborepo; `pnpm-workspace.yaml` sets `overrides`/`allowBuilds` and has no catalog — versions are pinned per `package.json`.
- Node `>=20.13.1` at the root and `engines.node >= 20` where declared; CI runs Node 22, the release workflow Node 24. ESM only.
- tsdown builds (`dist/`, gitignored); Vitest tests; `@antfu/eslint-config` owns formatting, and `lint-staged` runs `eslint --fix` on commit — run `pnpm run lint` before claiming clean.

## How to work here

- **Check the callers before you change anything.** Grep who uses it and which tests name it. If the
  impact is unclear, say so — do not guess.
- **Never overwrite or delete a large section you have not understood.** Read it, or say what you could
  not determine and ask.
- **Do not invent requirements.** Build what was asked; surface what else you notice and let it be
  decided.
- **Fix the class, not the instance.** A copied helper, a rule stated twice, a guard bypassed by a
  second path is one problem: one implementation, one guard. That is the work, not a follow-up to ask
  for. Stay inside the task rather than refactoring the world.
- **Verify before claiming, and say what you checked.** A passing test is not evidence it pins
  anything — **break the thing it guards and watch it fail.** If it still passes, either the test is
  decoration or a different guard is running; find out which. Where a stub cannot answer the question,
  drive the real thing.
- **Never write an identifier from memory.** A commit hash, path, line number or version must be quoted
  from the source; a plausible-looking invented one is worse than none.
- **A stated blocker is a hypothesis, not a fact.** Re-test "cannot install X" / "tool unavailable"
  before inheriting it, and never report a failure your own flag forced.
- **Report the risk with the change** — correctness, security, operational and integration; plus what
  you could not verify and every assumption you made. An unverified claim marked as such beats a
  confident one that is wrong.
- **Missing recall of this repo?** Read this file, `.agentDocs/` and `git log` before acting, then ask
  1–3 focused questions rather than guessing at intent.
- The packages consume each other — check the dependents, not just the callers.

## Conciseness

**Prune verbose, keep correctness** — code, comments, docs alike.

- Code: a comment only for non-obvious *intent*, never to restate the line, and never long. A block
  arguing for its own change is a commit message.
- Docs: one idea per sentence. Cut anything that would not change what a reader does.
- Delete history `git log` already holds — keep the *rule* that came out of it, not the story.
- **Never drop a caveat to save a line.** Concise means no filler, not fewer facts.

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
