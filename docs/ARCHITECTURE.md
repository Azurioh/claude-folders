# Architecture

Nest for Claude is a [WXT](https://wxt.dev/) extension written in strict TypeScript. It targets
Chrome and Firefox with Manifest V3 from a single code base.

## Layout

```
src/
  entrypoints/            # WXT entrypoints (content script, options page)
  locales/                # en.yml, fr.yml (@wxt-dev/i18n)
  features/folders/
    domain/               # pure TS: folder tree operations, no DOM, no browser APIs — unit tested
    storage/              # repository over browser.storage, versioned schema + migrations
    ui/                   # rendering of folder sections and editors
  shared/
    claude-dom/           # the ONLY code that knows claude.ai's DOM: selectors, sidebar/Recents
                          # detection, title extraction — tested against HTML fixtures
tests/                    # Vitest suites mirroring src/ (e.g. tests/features/folders/domain/)
  fixtures/               # sanitized claude.ai HTML fixtures for shared/claude-dom tests
```

Tests live outside `src/` so WXT never bundles them; they import the code under test through the
`@/` alias.

Folders are created when they get their first real file; no empty or placeholder folders are
committed.

## Why this shape

**claude.ai's DOM changes are the number one risk.** The site is not an API: class names, markup
and routes can change at any time and break the extension. Every assumption about that DOM lives in
`shared/claude-dom`, behind small functions (find the sidebar, find the Recents list, read a
conversation title...). When claude.ai changes, the fix is local to that module and to its HTML
fixtures in `tests/fixtures/`, and the rest of the code does not move.

The other layers follow the same idea: keep the logic that matters (the folder tree) pure and
testable, and push browser APIs and DOM work to the edges.

## Dependency rules

Dependencies point inward:

```
entrypoints  ->  features/folders/ui  ->  features/folders/storage  ->  features/folders/domain
                         |                                                   ^
                         +----------------> shared/claude-dom                |
                         +---------------------------------------------------+
```

- `domain` imports nothing from `storage`, `ui`, `shared/claude-dom`, WXT or `browser`.
- `storage` depends on `domain` (types, migrations' target shapes) and on `browser.storage`.
- `ui` composes `domain`, `storage` and `shared/claude-dom`; it is the only layer that renders.
- `entrypoints` only wire things together.
- No cross-feature imports: code used by more than one feature goes to `shared/`.
- Imports use the `@/` alias (`@/features/folders/domain/...`), never `../../`.

## Data flow

1. The content script starts on `https://claude.ai/*`.
2. `shared/claude-dom` locates the sidebar and project page, and extracts the current project and
   the visible conversations (IDs and titles).
3. `features/folders/storage` loads the stored folder tree for that project and migrates it to the
   current schema if needed.
4. `features/folders/domain` computes the tree to display (nesting, ordering, which conversations
   are filed).
5. `features/folders/ui` renders the folder sections next to claude.ai's own lists. Floating panels
   (editors, menus) are rendered in a Shadow DOM so claude.ai's styles and ours do not collide.
6. User actions go back through `domain` (pure update) then `storage` (persist), and the UI
   re-renders.

The extension makes no network requests at any step.

## Storage schema versioning

- All data lives in `browser.storage.local` under a single versioned document that carries a
  `schemaVersion` number.
- Each schema change adds a migration `vN -> vN+1`: a pure function from the old shape to the new
  one, unit tested with stored samples of the old shape.
- On load, the repository applies every pending migration in order, then writes the result back.
  Data from a newer, unknown version is never overwritten.

## Rendering rules

- No `innerHTML`, `eval` or remotely loaded code: DOM is built with `document.createElement` and
  `textContent`.
- Every CSS class the extension adds is prefixed with `nfc-`.
- Floating panels live in a Shadow DOM.

## Internationalization

UI strings come from `src/locales/<lang>.yml` through `@wxt-dev/i18n` (a typed wrapper over the
native `browser.i18n` API, which also localizes the manifest). English is the default locale;
every key must exist in both `en.yml` and `fr.yml`.
