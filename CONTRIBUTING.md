# Contributing to Nest for Claude

Thanks for helping! This guide covers setup, the workflow and the rules the code follows.
By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Requirements: Node.js (version in [`.nvmrc`](.nvmrc), `nvm use` picks it up) and pnpm (version
pinned in `package.json`; run `corepack enable` once).

```sh
git clone https://github.com/Azurioh/nest-for-claude.git
cd nest-for-claude
pnpm install   # also runs `wxt prepare` and installs the lefthook git hooks
pnpm dev       # opens Chrome with the extension loaded and hot reload
```

## Scripts

| Script               | What it does                                                      |
| -------------------- | ----------------------------------------------------------------- |
| `pnpm dev`           | Dev build for Chrome with hot reload (named "Nest for Claude (dev)") |
| `pnpm dev:firefox`   | Same, for Firefox                                                 |
| `pnpm build`         | Production build for Chrome in `.output/chrome-mv3`               |
| `pnpm build:firefox` | Production build for Firefox in `.output/firefox-mv3`             |
| `pnpm zip`           | Store zip for Chrome                                              |
| `pnpm zip:firefox`   | Store zip for Firefox plus the sources zip required by AMO        |
| `pnpm typecheck`     | `wxt prepare` then `tsc --noEmit`                                 |
| `pnpm lint`          | Biome lint + format check                                         |
| `pnpm format`        | Biome format (writes files)                                       |
| `pnpm test`          | Vitest unit tests                                                 |
| `pnpm check`         | `lint` + `typecheck` + `test` — must pass before every PR         |

A pre-commit hook (lefthook) runs `biome check` on staged files.

## Branches, commits and pull requests

The project is trunk-based:

1. Branch from `main` with a short-lived branch (`feat/nested-drag-drop`, `fix/sidebar-detection`).
2. Keep the branch small and focused; open a pull request to `main` early.
3. CI must be green (lint, typecheck, tests, Chrome and Firefox builds).
4. The PR is squash-merged; its title becomes the commit on `main`.

Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/):
`<type>: <description>`, with `type` one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`,
`perf`, `ci`. A CI check validates PR titles.

Releases are automated with [release-please](https://github.com/googleapis/release-please): it
keeps a release PR up to date from the commits on `main`; merging it tags the version, writes the
changelog and attaches the Chrome, Firefox and sources zips to the GitHub release.

## Architecture rules

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short:

- `features/folders/domain` is pure TypeScript: no DOM, no `browser`, no imports from `storage`,
  `ui` or `shared/claude-dom`.
- Only `shared/claude-dom` knows claude.ai's markup.
- No cross-feature imports; shared code goes to `shared/`.
- Use the `@/` alias, never `../../`.
- No `innerHTML`, `eval` or remote code. CSS classes are prefixed `nfc-`. Floating panels use a
  Shadow DOM.
- Every `if`/`else` has braces; no `while (true)` loops.
- Domain and `claude-dom` changes come with unit tests.
- No new permissions, host permissions or network requests without an issue discussing it first.

## When claude.ai's DOM changes

claude.ai changes its markup from time to time and that is the most common way the extension
breaks. To fix it:

1. Save the relevant part of the new page as an HTML fixture next to the existing ones in
   `src/shared/claude-dom` (strip any personal content: conversation titles, names, emails).
2. Add or update the failing test so it reproduces the breakage against the new fixture.
3. Fix the selectors or detection logic **only in `src/shared/claude-dom`**. If a fix seems to need
   changes elsewhere, open an issue first: it usually means a DOM detail leaked out of that module.
4. Keep the old fixture if the old markup can still be served, so both stay supported.

## Translations

Every user-facing string is a key in `src/locales/en.yml` **and** `src/locales/fr.yml`. When you add
or change a string, update both files in the same PR. New languages are welcome: add
`src/locales/<lang>.yml` with every key.

## Reporting bugs and security issues

Use the issue templates. Security vulnerabilities go through
[private reporting](SECURITY.md), never a public issue.
