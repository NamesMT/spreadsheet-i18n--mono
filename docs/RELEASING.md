# Releasing

Per package, manual: **Actions → Release → Run workflow**. Only `release.yml` publishes — a pushed tag does nothing.

- Local pre-check before dispatching: `pnpm run release:check <package> [version]` (`scripts/release-target.mjs`).

## Dispatch inputs

| input | type | default | meaning |
| --- | --- | --- | --- |
| `package` | string | required | workspace package name, e.g. `spreadsheet-i18n` |
| `version` | string | empty | bare `1.2.3` or `1.2.3-rc.1`, no leading `v`; empty = bump from the commits |
| `publish` | boolean | `true` | publish to npm; forced off for a `"private": true` package |
| `dry-run` | boolean | `false` | stop before committing, pushing, releasing and publishing |

## Pipeline

```sh
pnpm install --frozen-lockfile
node scripts/release-target.mjs "$PACKAGE" "$VERSION"   # -> $GITHUB_OUTPUT: path=, publish=
pnpm run quickcheck                                     # turbo run quickcheck, whole workspace
npx -y repo-release@latest --pkg="$PACKAGE" [-r "$VERSION" | --bump] --release --push [--publish]
```

- Job: checkout `fetch-depth: 0`, pnpm, Node 24, `npm i -g npm@latest` (trusted publishing needs npm >= 11.5.1), then the steps above; `concurrency: release`, `cancel-in-progress: false`; permissions `contents: write` + `id-token: write`.
- `release-target.mjs`: resolves packages with `pnpm -r list --depth -1 --json` (unknown name → error listing them), strips one leading `v`, requires `\d+\.\d+\.\d+(-[0-9A-Z.-]+)?`, and requires the version to be greater than the one on disk. Emits `path=` and `publish=` (`false` when `"private": true`).
- An explicit `version` goes to `-r` only; only a missing version adds `--bump`. `--bump`/`--release` are what write `package.json` and touch git.
- `dry-run` with an empty `version` fails the job (repo-release would only prompt) — a dry run needs an explicit version.
- `--publish` is added only when the `publish` input is `true` **and** the resolved target is not private.
- repo-release then writes `<pkg>/CHANGELOG.md`, bumps `<pkg>/package.json`, commits, tags `<pkg>@<version>`, pushes, creates the GitHub release and publishes to npm; it commits as `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`.
- One run releases ONE package and the pipeline never builds the workspace. `dist/` is gitignored while `files: ["dist"]`, so a package needing a build must declare its own hook: the three libs use `"prepublishOnly": "pnpm run build"` (tsdown); `prepack` works too.

## Trusted publishers (npm)

- Publishing is OIDC, no token: npmjs.com → the package → Settings → Trusted Publisher → repository `NamesMT/spreadsheet-i18n--mono`, workflow `release.yml`. Set it once per published package.
- Not configured → the publish step fails; untick `publish` to still get the changelog, tag and GitHub release.
- Needed for `spreadsheet-i18n`, `unplugin-spreadsheet-i18n`, `ssic`; `@local/locales` and `@local/tsconfig` are `"private": true` and never publish.

## Release order

- `spreadsheet-i18n` first — no internal dependencies.
- Then `unplugin-spreadsheet-i18n` and `ssic`, in any order; each depends only on `spreadsheet-i18n: ^0.3.8`.
- Internal ranges are caret, not `workspace:*`: a core release stays compatible inside `^0.3.x`; a core major needs the dependents' ranges updated.
