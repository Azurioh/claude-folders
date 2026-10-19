# AGENTS.md

Rules for AI coding agents working on Nest for Claude (WXT browser extension, Chrome + Firefox, MV3).
Details: `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`.

## Commands

- Install: `pnpm install` (pnpm only; never npm/yarn)
- Dev: `pnpm dev` / `pnpm dev:firefox`
- Verify before claiming done: `pnpm check` (lint + typecheck + test), then `pnpm build` and
  `pnpm build:firefox`. Zero errors, zero warnings.
- Format: `pnpm format`
- Add dependencies with `pnpm add -E` (exact, latest stable); never hand-edit `package.json` deps.

## Architecture boundaries

- `src/entrypoints/`: WXT entrypoints only; wire modules, no business logic.
- `src/features/folders/domain/`: pure TypeScript. Imports nothing from `storage`, `ui`,
  `shared/claude-dom`, WXT, `browser` or the DOM.
- `src/features/folders/storage/`: repository over `browser.storage.local`; versioned schema,
  pure migration functions.
- `src/features/folders/ui/`: rendering only.
- `src/shared/claude-dom/`: the ONLY code that knows claude.ai's DOM (selectors, detection, title
  extraction). DOM breakages are fixed here and nowhere else.
- No cross-feature imports; shared code goes to `src/shared/`.
- Imports use the `@/` alias; never `../../`.
- Do not create empty folders or placeholder files.

## Hard rules

- Never add a permission, host permission or network request without an issue discussing it first.
  Current permissions: `storage`, host `https://claude.ai/*`.
- Data stays in `browser.storage.local`. No analytics, telemetry or third-party services.
- No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function` or remote code.
  Build DOM with `createElement` + `textContent`.
- CSS classes added by the extension are prefixed `nfc-`. Floating panels render in a Shadow DOM.
- Every `if`/`else` is braced. No `while (true)`; loop exit conditions live in the loop header.
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); no `any`, no
  non-null assertions to silence the compiler.
- No `TODO`, placeholders, dead code or speculative code.
- Never use Anthropic logos; the project is not affiliated with Anthropic.

## Testing

- Vitest (`pnpm test`). Tests live in `tests/` as `*.test.ts`, mirroring `src/`
  (`src/features/folders/domain/x.ts` → `tests/features/folders/domain/x.test.ts`); import the
  code under test through the `@/` alias.
- `domain`: unit tests for every tree operation.
- `storage`: tests for every migration, using WXT's `fakeBrowser`.
- `shared/claude-dom`: tests against sanitized HTML fixtures of claude.ai stored under
  `tests/fixtures/`; a DOM fix always updates or adds a fixture.
- No fake tests: a test must exercise real code.

## i18n

- Every user-facing string is a key in `src/locales/en.yml` AND `src/locales/fr.yml`.
- Read strings with `i18n.t('key')` from `#i18n`; never hardcode UI text.

## Commits and PRs

- Conventional Commits: `<type>: <description>`, type in
  `feat|fix|refactor|docs|test|chore|perf|ci`. English only.
- Trunk-based: short branch -> PR -> `main`. Releases are tags created by release-please.
- Do not commit or push unless asked.
