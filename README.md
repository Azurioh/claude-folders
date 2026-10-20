<div align="center">

<img src="docs/brand/icon-512.png" width="128" height="128" alt="Nest for Claude logo: folders in a bird's nest">

<h1>Nest for Claude</h1>

<p>Nested folders for your claude.ai conversations — organized per project, stored only in your browser.</p>

</div>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/Chrome_Web_Store-coming_soon-lightgrey?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Web Store: coming soon"></a>
  <a href="#install"><img src="https://img.shields.io/badge/Firefox_Add--ons-coming_soon-lightgrey?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-ons: coming soon"></a>
  <br>
  <a href="https://github.com/Azurioh/nest-for-claude/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Azurioh/nest-for-claude/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Azurioh/nest-for-claude?style=flat-square&color=161b22" alt="License: MIT"></a>
  <a href="tsconfig.json"><img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict"></a>
  <a href="wxt.config.ts"><img src="https://img.shields.io/badge/Manifest-V3-161b22?style=flat-square" alt="Manifest V3"></a>
  <a href="https://wxt.dev/"><img src="https://img.shields.io/badge/built%20with-WXT-161b22?style=flat-square" alt="Built with WXT"></a>
</p>

<p align="center">
  <img src="docs/store/2560x1600/1-nested-folders.png" width="800" alt="A claude.ai project page with a Marketing folder containing a Launch sub-folder and conversations">
</p>

> [!NOTE]
> Nest for Claude is an independent project. It is **not affiliated with, endorsed by or sponsored
> by Anthropic**. "Claude" is a trademark of Anthropic, PBC, used here only to describe what the
> extension works with.

## Why

claude.ai projects only offer a flat list of conversations, so long-running projects quickly
become hard to navigate. Nest for Claude is an open-source browser extension for Chrome and
Firefox (Manifest V3) that adds folders and sub-folders of conversations, per project, to the
claude.ai sidebar and project page. Everything stays in your browser: no account, no server, no
network requests.

## Features

- **Nested folders**: folders and sub-folders of conversations, as deep as needed, scoped to each
  claude.ai project.
- **In place**: folders are shown in the claude.ai sidebar and on the project page, and follow
  claude.ai's light and dark themes.
- **New session in a folder**: start a session from a folder; it is filed there as soon as the
  first message is sent.
- **Drag and drop**: move conversations and folders, or file conversations from the "Add
  conversations" panel.
- **Appearance**: custom folder names, colors and emojis.
- **Toolbar menu** (enabled on claude.ai tabs only):
  - see how many projects, folders and filed conversations are stored;
  - hide filed conversations from claude.ai's lists (or just dim them);
  - backup and restore: export all your folders to a JSON file and import them back, with a full
    validation of the file and a confirmation before anything is replaced (on Firefox, backups
    open in a tab, see [#21](https://github.com/Azurioh/nest-for-claude/issues/21));
  - delete all data.
- **Languages**: English and French interface.
- **Local only**: no account, no server, no network requests, no analytics.

<table>
  <tr>
    <td><img src="docs/store/2560x1600/2-drag-drop.png" alt="Dragging a conversation onto a folder"></td>
    <td><img src="docs/store/2560x1600/3-make-it-yours.png" alt="Edit folder panel with emoji grid and colour swatches"></td>
  </tr>
  <tr>
    <td><img src="docs/store/2560x1600/4-new-session.png" alt="Starting a new session that will be filed in the Marketing folder"></td>
    <td><img src="docs/store/2560x1600/5-private.png" alt="Toolbar menu with stored data overview, display, backup and danger zone"></td>
  </tr>
</table>

## See it in action

https://github.com/user-attachments/assets/3915f090-7c6d-4de6-9696-ad6ee1746edf

## Install

Store listings (Chrome Web Store, Firefox Add-ons) are coming soon.

### From source

Requirements: [Node.js](https://nodejs.org/) (version in [`.nvmrc`](.nvmrc)) and
[pnpm](https://pnpm.io/) (version pinned in `package.json`, enable it with `corepack enable`).

```sh
git clone https://github.com/Azurioh/nest-for-claude.git
cd nest-for-claude
pnpm install
pnpm build          # Chrome  -> dist/chrome-mv3
pnpm build:firefox  # Firefox -> dist/firefox-mv3
```

- **Chrome**: open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and
  select `dist/chrome-mv3`.
- **Firefox**: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and
  select `dist/firefox-mv3/manifest.json`.

## Usage

1. Open a project on [claude.ai](https://claude.ai). A folders section appears above the project
   page's "Recents" list and at the top of the expanded project in the sidebar.
2. Click **New folder** to create a folder. Hover or focus a folder row to reveal its actions: new
   session in this folder (`+`), new sub-folder, add conversations, edit (name, emoji, color) and
   delete.
3. Drag a conversation onto a folder to file it, or drag a folder onto another one to nest it. Drop
   onto a section header to move a folder to the top level or take a conversation out of its
   folder.
4. Click the extension's toolbar icon on a claude.ai tab to see stored counts, toggle hiding of
   filed conversations, export or import a backup, or delete all data.

## How it works

```mermaid
flowchart LR
  page[claude.ai page] --> cs[Content script]
  cs --> dom[shared/claude-dom<br/>DOM adapter]
  cs --> ui[folders/ui<br/>sections and panels]
  ui --> dom
  ui --> domain[folders/domain<br/>pure tree operations]
  ui --> storage[folders/storage<br/>repository]
  storage --> local[(browser.storage.local)]
  popup[Toolbar popup] --> backup[folders/backup<br/>JSON export / import]
  backup --> storage
  bg[Background] -.->|enables action on claude.ai only| popup
```

- The content script runs on `https://claude.ai/*`. `shared/claude-dom` is the only code that
  knows claude.ai's DOM (selectors, sidebar and "Recents" detection, title extraction), tested
  against HTML fixtures.
- The UI loads the folder tree of each displayed project from storage, renders it next to
  claude.ai's own lists, and sends user actions through a pure domain operation, then a save.
  Floating panels render in a Shadow DOM so claude.ai's styles and the extension's do not collide.
- Storage uses one `browser.storage.local` key per project, versioned and validated on load; other
  tabs re-render on changes.

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Privacy and permissions

- Data is stored only in your browser (`browser.storage.local`): folder names, colors, emojis, and
  the IDs and titles of the conversations you file.
- No network requests, no analytics, no third parties.
- Permissions: `storage` and access to `https://claude.ai/*` only.

Export, restore or delete your data from the menu of the extension's toolbar icon. Full details:
[PRIVACY.md](PRIVACY.md).

## Project structure

```
src/
  entrypoints/              # background, claude.ai content script, toolbar popup, Firefox backup page
  features/folders/
    domain/                 # pure TS folder tree operations and ports, no DOM, no browser APIs
    storage/                # repository over browser.storage, versioned schema and validation
    ids/                    # folder id provider (crypto.randomUUID)
    backup/                 # backup file format: serialization, Zod validation, size-checked reading
    ui/                     # folder sections, drag and drop and floating panels on claude.ai
    popup/                  # toolbar popup and backup page
  features/toolbar-action/  # keeps the toolbar action enabled on claude.ai tabs only
  shared/claude-dom/        # the only code that knows claude.ai's DOM
  locales/                  # en.yml, fr.yml
tests/                      # Vitest suites mirroring src/, plus sanitized claude.ai HTML fixtures
docs/                       # architecture, store listing, brand and store assets
```

## Development

```sh
pnpm install
pnpm dev            # Chrome with hot reload
pnpm dev:firefox    # Firefox with hot reload
pnpm lint           # Biome
pnpm typecheck      # wxt prepare + tsc --noEmit
pnpm test           # Vitest
pnpm check          # lint + typecheck + tests
```

Development builds are named **Nest for Claude (dev)** so they are easy to tell apart from a store
install. See [CONTRIBUTING.md](CONTRIBUTING.md) for all scripts and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organized.

### Firefox sources archive (AMO reviewers)

```sh
pnpm install
pnpm zip:firefox
```

This produces the extension zip and a sources zip in `dist/`; the build output is identical to
`pnpm build:firefox`.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Alan Cunin
