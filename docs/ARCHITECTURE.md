# Architecture

Nest for Claude is a [WXT](https://wxt.dev/) extension written in strict TypeScript. It targets
Chrome and Firefox with Manifest V3 from a single code base.

## Layout

```
src/
  entrypoints/            # WXT entrypoints (content script, action popup, Firefox backup page)
  locales/                # en.yml, fr.yml (@wxt-dev/i18n)
  features/folders/
    domain/               # pure TS: folder tree operations and ports, no DOM, no browser APIs
    storage/              # repository over browser.storage, versioned schema + migrations
    ids/                  # folder id provider (crypto.randomUUID)
    backup/               # backup file format: serialization, Zod validation, size-checked reading
    ui/                   # rendering of folder sections and floating panels on claude.ai
    popup/                # rendering of the toolbar popup and of the backup page
  shared/
    claude-dom/           # the ONLY code that knows claude.ai's DOM: selectors, sidebar/Recents
                          # detection, title extraction — tested against HTML fixtures
    page-diagnostic/      # popup <-> content script message for the page diagnostic
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
     |                   |                                                   ^
     |                   +----------------> shared/claude-dom                |
     |                   +---------------------------------------------------+
     +-----------> features/folders/ids  ------------------------------------+
     |
     +-----------> features/folders/popup -> features/folders/backup -> storage, domain
     |                   |
     +-----------> shared/page-diagnostic  ->  shared/claude-dom (types)
```

- `domain` imports nothing from `storage`, `ui`, `shared/claude-dom`, WXT or `browser`.
- `storage` depends on `domain` (types, migrations' target shapes) and on `browser.storage`.
- `ids` implements the `FolderIdProvider` port of `domain` with `crypto.randomUUID()`; nothing
  else calls `crypto.randomUUID()`. The UI only knows the port, so tests inject a sequential fake.
- `ui` composes `domain`, `storage` and `shared/claude-dom`; it renders on claude.ai.
- `backup` depends on `domain` (snapshot types) and on `storage`'s validators (project parser,
  project id), so a backup file is checked exactly as stored data is.
- `popup` renders the toolbar popup and the backup page; it only knows the
  `FoldersSnapshotStore` port, the setting and injected browser functions (clipboard, download,
  page diagnostic, opening the backup page).
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

### Whole-storage snapshot (backup and deletion)

`domain/folders-snapshot.ts` defines `FoldersSnapshot` (every project's tree plus `hideFiled`) and
`countSnapshot`; `domain/folders-snapshot.store.ts` declares the `FoldersSnapshotStore` port
(`read`, `replace`, `clear`). `storage/browser-folders-snapshot.store.ts` implements it **through**
`BrowserFoldersRepository` and `BrowserHideFiledSetting`, never with raw keys from callers:

- `read`: the stored project ids (`BrowserFoldersRepository.listProjectIds`, only exact
  `projects:<lowercase uuid>` keys), each loaded and validated by the repository (invalid data reads
  as an empty project), plus the setting.
- `replace`: saves every project of the snapshot and the setting (so WXT records `{ v: 1 }` in
  each key's metadata), then removes the stored projects absent from it, value and metadata.
- `clear`: removes every project and the setting, values and metadata.

The setting's item is defined per operation so that a save after `remove` records the schema
version again (a WXT item definition records it on its first write only).

## Toolbar popup

There is no options page: settings live in the action popup (`entrypoints/popup/`, WXT's `popup`
entrypoint, i.e. `action.default_popup`), shown when the toolbar icon is clicked. Its entrypoint is
the composition root: it wires `BrowserFoldersSnapshotStore`, `BrowserHideFiledSetting`,
`browser.runtime.getManifest().version`, `navigator.userAgent`, the clipboard, the page diagnostic
request and the backup mode of the browser into `startPopupMenu` (`features/folders/popup/`).
The popup is 340px wide and scrolls inside a 580px max height; focus starts on the menu (`main`,
`tabindex="-1"`), so the first Tab reaches the first control. Sections:

- **Display**: an `input type="checkbox" role="switch"` bound to `settings:hideFiled` (on: hidden,
  off: dimmed), watching it so changes from other tabs show up.
- **Backup**: the stored counts; **Export** downloads `nest-for-claude-backup-YYYY-MM-DD.json`
  (`{ format: 'nest-for-claude-backup', version: 1, exportedAt, projects, settings: { hideFiled } }`,
  `backup/backup-file.ts`) through a temporary object URL and a `download` link; **Import** (file
  picker) checks the size (`BACKUP_MAX_BYTES`, 5 MB) before reading, parses the text as `unknown`
  and validates all of it (`backup/backup-file.parser.ts`: format, version, ISO date, settings,
  every project with the stored-project parser, UUID project ids lowercased, no duplicates). An
  invalid file shows an inline `role="alert"` naming the wrong part (projects by position, never
  the file's content) and writes nothing. A valid one shows its summary and an inline confirmation
  ("Replace all current folders with this backup?", Cancel focused, Escape cancels) before
  `FoldersSnapshotStore.replace`.
- **Danger zone**: "Delete all data" with the same inline confirmation, then
  `FoldersSnapshotStore.clear`.
- **Footer**: **Copy diagnostic** and the links (source code, "Not affiliated with Anthropic").
  The diagnostic (`popup/diagnostic-report.ts`, always in English for the maintainers: extension
  version, browser name and major version from `browser-label.ts`, stored counts, `hideFiled`, the
  page diagnostic of an open claude.ai tab) is collected when the popup opens and after data
  changes, so the click writes it to `navigator.clipboard` while it still counts as a user action.
  On failure the text is shown selected in a read-only field.

### Firefox: backups in a tab

Firefox hides an action popup as soon as a native dialog takes focus: a file picker (the popup and
the picked file are lost; Mozilla bug 1884731 and Discourse reports) or a "Save as" dialog (the
popup's object URL is revoked and the download fails). Chrome keeps the popup open. So the Firefox
build (`import.meta.env.FIREFOX`) replaces the Backup section with an **Export or import…** button
that opens `backup.html` with `browser.tabs.create` (no permission needed) and closes the popup.
That unlisted page (`entrypoints/backup/`, `<meta name="manifest.include" content="['firefox']">`,
so absent from the Chrome build) renders only the Backup section (`startBackupPage`), where a
backup file can also be dropped on the zone. Using `browser.downloads` from the background would
need the `downloads` permission, which the extension does not request.

No native `alert`/`confirm`/`prompt`; status messages use `role="status"` live regions. Colors are
CSS custom properties redefined under `prefers-color-scheme: dark`.

### Page diagnostic messaging

`shared/page-diagnostic/` carries the diagnostic between the popup and the content script,
without any new permission:

- The popup calls `browser.tabs.query({ url: 'https://claude.ai/*' })`. Matching on `url`
  needs the `tabs` permission **or** host permissions for the page; the extension has the latter.
  The active tab is asked first with `browser.tabs.sendMessage`; tabs without the content script
  (opened before install) or with an invalid answer are skipped. No answer: the report says no
  claude.ai tab was found.
- The content script answers with `answerPageDiagnosticRequests`, only for messages from this
  extension (`sender.id`), with `diagnose` from `shared/claude-dom`: counts of conversation and
  project links, expanded sidebar projects, whether the project page Recents block was found, and
  the page kind (`project`, `chat`, `other`). The answer is validated with Zod on the popup side
  and unknown fields are dropped, so no id or title can reach the report.

## Folders UI

`entrypoints/claude.content.ts` is the composition root: it builds `BrowserFoldersRepository`,
`BrowserHideFiledSetting` and `RandomUuidFolderIdProvider`, mounts the panel layer (below),
starts the UI with `startFoldersUi` (with `Date.now` as its clock, which dates remembered drags),
calls `sync()` on WXT's `wxt:locationchange` (claude.ai navigates client-side), answers the
popup's page diagnostic requests (see above) and stops both on `ctx.onInvalidated`. The section CSS (`ui/folders.css`) is
imported there, so WXT injects it into the page through the manifest; the panel CSS
(`ui/floating-panel.css`) is imported with `?inline` and injected only inside the panel layer's
shadow root.

`features/folders/ui/`:

- **Controller** (`folders-ui.controller.ts`): on every sync, asks `shared/claude-dom` for the
  expanded sidebar projects and the project page "Recents" block, and keeps one `.nfc-section` per
  anchor: first child of the sidebar project list, and just before the "Recents" heading (whose
  classes the header copies). Mounts are keyed by section and project, so repeated syncs never
  duplicate them; a mount whose anchor is gone is removed. Syncs run on DOM mutations (one
  `MutationObserver`, debounced), on navigation and on storage changes; no polling.
- **Store** (`project-folders.store.ts`): loads and watches each displayed project through the
  `FoldersRepository` port; user actions go through `apply`: a pure domain operation, then a save
  (it returns whether the operation was accepted). It lives in `ui/` because it is the UI's view
  of storage (cache, watches, change callback); the domain stays synchronous and free of ports'
  async plumbing, and there is no separate application layer.
- **Views** (`folders-section.view.ts`, `folder-tree.view.ts`): pure rendering from a
  `ProjectFolders` with `childrenOf` and `countConversations`. A section is rendered again only
  when its inputs (tree, current conversation, heading classes) change, which also keeps the
  observer from reacting to our own DOM writes; keyboard focus is restored across re-renders.
- **Row actions** (`row-actions.ts`): each row is wrapped in an `.nfc-item` with its action
  buttons as siblings (a row is a button or a link, which cannot hold buttons). Folder rows offer
  new sub-folder, add conversations, move to, edit and delete; conversation rows move to, rename
  (the title shown in the folder only) and remove from folder; the sidebar header has a "New folder" icon button and
  the project page header a "New folder" text button. Actions are shown on row `:hover` and
  `:focus-within` (they stay focusable while transparent) and always under `@media (hover: none)`;
  the count hides while they show. Each has an i18n accessible name and a 44px target on coarse
  pointers; their clicks never reach the row (no toggle, no navigation).
- **Folder actions** (`folder-actions.ts`): turns the action handlers into panels and domain
  operations (`createFolder` with an id from the `FolderIdProvider`, `renameFolder`,
  `setFolderAppearance`, `deleteFolder`, `renameConversation`, `unfileConversation`,
  `fileConversation` + `openFolder`). Rejected operations (blank names) are ignored, never thrown.
- **Floating panels** (`floating-panel.ts`): one reusable non-modal `role="dialog"`, named by its
  visible title, one open at a time. It renders in the **panel layer**: a container inside a
  shadow root created with WXT's `createShadowRootUi` (`isolateEvents` keeps keystrokes typed in a
  panel from reaching claude.ai's shortcuts). It is placed 6px under its anchor, flipped above
  when it would overflow the viewport and clamped 8px inside it (`panel-position.ts`, pure); its
  background is the first opaque ancestor's of the anchor and its text color and font the
  anchor's (`panel-theme.ts`), so it follows claude.ai's theme. Focus moves to its first control
  on open; Escape and completing the panel close it and give focus back to the control that
  opened it (found again by focus key, since sections re-render; with fallbacks such as the parent
  folder after a delete); a pointer press outside closes it and leaves focus where the user
  pressed. Panels: create folder and rename conversation (`text-field.panel.ts`), folder editor
  with live name, emoji field and grid, palette with `aria-pressed` (`folder-editor.panel.ts`),
  delete confirmation with Cancel focused (`delete-folder.panel.ts`; deleting a folder also
  deletes its sub-folders at any depth and unfiles their conversations, which show again in
  claude.ai's lists, and the text counts both with `deletionImpact`), the conversation adder
  (`conversation-adder.panel.ts`) and the move panel (`move-destination.panel.ts`).
- **Drag and drop** (`folder-drag-drop.ts`): sources are our folder and conversation rows and
  claude.ai's conversation links; targets are folder rows (move or file into that folder) and the
  section headers (a folder goes to the top level, a conversation leaves its folder). The views
  only mark sources and targets with `data-nfc-drag-*` / `data-nfc-drop` attributes
  (`drag-markers.ts`). Every handler (`dragstart`, `dragenter`, `dragover`, `drop`, `dragend`) is
  registered once on the window in the **capture phase**: claude.ai's own drag handlers would
  otherwise swallow the events, and the dragged native conversation has to be read at `dragstart`,
  before claude.ai touches `dataTransfer`. What is dragged is remembered there for at most 60 s
  (in case `dragend` never comes), because drag data cannot be read before `drop`: `dragover`
  calls `preventDefault` only when the target accepts the payload, so a refused drop shows the
  "not allowed" cursor. On `drop` the drag data wins when readable (our rows carry
  `application/x-nfc-folder` / `application/x-nfc-conversation` with their project and id, which
  Firefox also needs to start the drag; a native link carries its URL), the remembered drag being
  the fallback. Rules (`drop-operation.ts`): our rows only move within their own project; a
  folder dropped into itself or a descendant is refused by the domain (`invalid-move`), never
  thrown. **Project membership**: a native conversation is accepted only when it belongs to the
  target's project, i.e. it is shown in the native lists where that project's sections are
  mounted (as for the adder) or already filed in it; the legacy script filed a conversation of
  another project dropped here, which mixed projects. It is titled from its native row
  (`conversationTitle`), unless already filed (its title is kept). Moves reveal the destination
  (it and its ancestors open, `tree-moves.ts`). Feedback: sections that accept the current drag
  get `data-nfc-dragging` (dashed outline on their header) and the hovered accepting target the
  `nfc-over` class (tint and inset border, no animation), both cleared on `drop`, `dragend` and
  `stop()`. Native conversation links of the mounted lists are made draggable (claude.ai sets
  `draggable="false"`) by `native-draggables.ts`, which restores the original attribute.
- **Move panel** (`move-actions.ts`, `move-destinations.ts`): the keyboard and single-pointer
  alternative to dragging (WCAG 2.5.7). "Move to…" on a folder or a filed conversation opens a
  panel listing the valid destinations, filterable like the adder: the top level ("No folder" for
  a conversation, which unfiles it) and every folder in tree order labelled with its path, minus
  the folder itself and its descendants; the current location is marked with text, an icon and
  `aria-current`. Choosing one applies the same moves as a drop and gives focus back to the moved
  row (the former folder when a conversation is unfiled); Escape gives it back to the button.
- **Adder candidates** (`conversation-candidates.ts`): the conversations claude.ai shows in the
  native lists where the project's sections are mounted (sidebar project list, project page
  Recents), not yet filed in the project, deduplicated, titled with `conversationTitle`. This is
  the way to file conversations without drag and drop.
- **Marks** (`filed-marks.ts`): in the native lists next to a section, filed conversations get
  `data-nfc-hidden` on their row (setting `hideFiled` on) or `data-nfc-filed` on their link (off).
- `native-row-look.ts` copies the native row look into `--nfc-*` custom properties; it reads
  layout, so it is the only UI code that needs a rendered page and does nothing in test DOMs. The
  text color is copied, not inherited: the native link sets its own secondary color while the list
  inherits the page's primary one. The copy is made once per mount, then again (at the next
  debounced sync) whenever the theme may have changed: a `prefers-color-scheme` change, or a change
  of a theme attribute (`THEME_ROOT_ATTRIBUTES`: `data-mode`, `data-theme`, `class`, `style`) on
  `<html>` or `<body>`. An open floating panel keeps the colors it opened with until reopened.

`stop()` closes the open panel, removes the drag listeners and feedback, disconnects the
observers, stops listening to the color scheme, cancels the pending sync, ends every storage watch, removes the sections and every
attribute set on claude.ai's nodes and restores the native links' `draggable`; WXT removes the
panel layer when the context is invalidated.

## Rendering rules

- No `innerHTML`, `eval` or remotely loaded code: DOM is built with `document.createElement` and
  `textContent`.
- Every CSS class the extension adds is prefixed with `nfc-`.
- Floating panels live in a Shadow DOM.

## Internationalization

UI strings come from `src/locales/<lang>.yml` through `@wxt-dev/i18n` (a typed wrapper over the
native `browser.i18n` API, which also localizes the manifest). English is the default locale;
every key must exist in both `en.yml` and `fr.yml`.
