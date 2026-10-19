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
3. `features/folders/storage` loads the stored folder tree for that project (migrated to the current
   schema if needed, then validated).
4. `features/folders/domain` computes the tree to display (nesting, ordering, which conversations
   are filed).
5. `features/folders/ui` renders the folder sections next to claude.ai's own lists. Floating panels
   (editors, menus) are rendered in a Shadow DOM so claude.ai's styles and ours do not collide.
6. User actions go back through `domain` (pure update) then `storage` (persist), and the UI
   re-renders.

The extension makes no network requests at any step.

## claude.ai DOM adapter

`shared/claude-dom` exposes pure functions over a root `ParentNode` and a `pathname` (they never
read the global `document` or `location`, so tests feed them parsed fixtures): ids of links and of
the current page, conversation titles, conversation rows, the project page's "Recents" block, the
expanded sidebar projects, and a diagnostic of what was found. Every selector and pattern is in
`selectors.ts`.

### Anchors

Anchors are structural, never Tailwind class names (they churn on every claude.ai release) and
never layout APIs (`getBoundingClientRect`, `offsetHeight`: fragile, and absent from test DOMs).

- **Conversation / project ids**: `a[href*="/chat/"]`, `a[href*="/project/"]` plus a UUID
  pattern. URLs are claude.ai's public routes, the most stable contract. Ids are lowercased;
  non-UUID hrefs (`/chat/new`) are ignored.
- **The extension's own UI**: `OWN_UI_SELECTOR` (`.nfc-section`). Our own conversation links and
  headings must never be mistaken for claude.ai's.
- **Project page "Recents"**: the `main` landmark, then the first element whose own text is a
  Recents label (EN/FR). `main` separates the content from the sidebar (an `aside`); it replaces the
  legacy "rightmost heading" layout rule.
- **Its list**: the closest ancestor of the heading holding conversation links (currently the
  `section` around the `h2` and its table). The climb is bounded and never leaves `main`.
- **Sidebar project**: a `[data-group-list]` block (its value is the project id) holding the project
  link. Independent of row styling.
- **Expanded sidebar project**: a `ul` inside that block. The nested conversation list only exists
  while the project is expanded.
- **Conversation row**: a bounded climb from the link that stops at an `li`, at the extension's UI
  and below any ancestor holding another conversation or a project link. Works for the `li` rows of
  projects, the `div` rows of the sidebar Recents and the `tr` rows of the project page Recents
  without naming any of them.
- **Conversation title**: the text nodes of `[data-row-label]` (sidebar rows), else of the link,
  else of its row when the link is an empty overlay (project page Recents table). Text inside
  `time`, `button` and `aria-hidden` elements is skipped, the rest is joined with spaces since
  `innerText` is absent from test DOMs, and a trailing "Scheduled" badge and relative time (EN/FR)
  are stripped.

`data-testid` values (`sidebar`, `sidebar-projects`, `sidebar-recents`) exist too but are not
needed by the rules above; tests use them to scope assertions.

## Storage

`domain/folders.repository.ts` declares the `FoldersRepository` port (`load`, `save`, `watch`);
`storage/browser-folders.repository.ts` implements it with WXT's storage API
(`wxt/utils/storage`) over `browser.storage.local`.

### Key layout

| Key (`browser.storage.local`) | Value                                                   |
| ----------------------------- | ------------------------------------------------------- |
| `projects:<projectId>`        | the `ProjectFolders` tree of one claude.ai project      |
| `settings:hideFiled`          | boolean, hide filed conversations (default `true`)      |
| `<key>$`                      | WXT metadata of `<key>`, holding the schema version `v` |

- One key per project, so tabs editing different projects never overwrite each other. Every tab
  watches the key of its project (`storage.onChanged`) and re-renders on changes from other tabs.
- `projectId` must be a UUID (claude.ai project id). It is lowercased before building the key, so
  `ABC…` and `abc…` share one key; anything else is rejected with `InvalidProjectIdError` before
  storage is touched.

### Versioning

- Every item is defined with `storage.defineItem` and `version: 1`. The version is recorded in the
  item's metadata on first write.
- A schema change bumps the item's `version` and adds a `migrations[N]` entry: a pure function from
  the vN-1 shape to the vN shape, unit tested with stored samples of the old shape. WXT runs pending
  migrations in order when the item is defined and writes the result back.
- WXT refuses to migrate data from a newer, unknown version (downgrade) and logs an error; such data
  is then only read through validation (see below).

### Validation

- Nothing read from storage is trusted: `storage/stored-project.parser.ts` validates every field of
  the current schema with Zod (`zod/mini`, chosen for content-script bundle size): own keys only,
  `parentId` `null` or a string, folder `id` equal to its key, optional `emoji`/`color` strings,
  boolean flags. Unknown fields are dropped. Id-keyed records are walked by their own entries and
  rebuilt with `Object.fromEntries` instead of `z.record`, which skips `__proto__` keys, so ids
  such as `__proto__` stay plain entries.
- Missing data reads as an empty project. Invalid data also reads as an empty project, logs one
  `console.warn` prefixed with `[nest-for-claude]`, and is left untouched in storage: reads never
  write back. It is replaced only when the user next changes that project.

## Rendering rules

- No `innerHTML`, `eval` or remotely loaded code: DOM is built with `document.createElement` and
  `textContent`.
- Every CSS class the extension adds is prefixed with `nfc-`.
- Floating panels live in a Shadow DOM.

## Internationalization

UI strings come from `src/locales/<lang>.yml` through `@wxt-dev/i18n` (a typed wrapper over the
native `browser.i18n` API, which also localizes the manifest). English is the default locale;
every key must exist in both `en.yml` and `fr.yml`.
