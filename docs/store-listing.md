# Store listing

Copy for the Chrome Web Store and Firefox Add-ons (AMO). Keep it in sync with `src/locales/*.yml`
(`extName`, `extDescription`) and `PRIVACY.md`.

## Shared fields

| Field | Value |
| --- | --- |
| Name | Nest for Claude |
| Chrome category | Productivity › Workflow & planning |
| AMO category | Other |
| Homepage | https://github.com/Azurioh/nest-for-claude |
| Support | https://github.com/Azurioh/nest-for-claude/issues |
| Privacy policy | https://github.com/Azurioh/nest-for-claude/blob/main/PRIVACY.md |
| License | MIT |

## English

### Short description

Chrome limit: 132 characters. AMO summary limit: 250 characters.

> Organize your claude.ai conversations into nested folders per project. Stored locally, no network requests.

### Full description

> Nest for Claude adds nested folders to your claude.ai projects, so long-running projects stay tidy.
>
> **Organize**
> - Create folders and sub-folders inside each project, as deep as you need.
> - Drag and drop conversations and folders, or file them from the "Add conversations" panel.
> - Give each folder a name, an emoji and a colour.
> - Optionally hide filed conversations from the Recents list.
>
> **Fits in**
> - Folders appear on the project page and in the sidebar.
> - Follows claude.ai's light and dark themes instantly.
> - Available in English and French.
>
> **Private by design**
> - Everything is stored in your browser (`storage.local`). No account, no server, no analytics.
> - The extension only runs on claude.ai and makes no network requests.
> - Export your folders to a JSON file and import them back at any time.
>
> Free and open source (MIT): https://github.com/Azurioh/nest-for-claude
>
> Nest for Claude is an independent project, not affiliated with or endorsed by Anthropic.

## Français

### Description courte

> Organisez vos conversations claude.ai en dossiers imbriqués par projet. Stockage local, aucune requête réseau.

### Description complète

> Nest for Claude ajoute des dossiers imbriqués à vos projets claude.ai, pour garder les projets au long cours bien rangés.
>
> **Organiser**
> - Créez des dossiers et sous-dossiers dans chaque projet, sans limite de profondeur.
> - Glissez-déposez conversations et dossiers, ou rangez-les depuis le panneau « Ajouter des conversations ».
> - Donnez à chaque dossier un nom, un emoji et une couleur.
> - Masquez si vous le souhaitez les conversations rangées de la liste Récents.
>
> **S'intègre naturellement**
> - Les dossiers apparaissent sur la page du projet et dans la barre latérale.
> - Suit instantanément les thèmes clair et sombre de claude.ai.
> - Disponible en français et en anglais.
>
> **Respect de la vie privée**
> - Tout est stocké dans votre navigateur (`storage.local`). Aucun compte, aucun serveur, aucune statistique.
> - L'extension ne s'exécute que sur claude.ai et n'effectue aucune requête réseau.
> - Exportez vos dossiers dans un fichier JSON et réimportez-les à tout moment.
>
> Gratuit et open source (MIT) : https://github.com/Azurioh/nest-for-claude
>
> Nest for Claude est un projet indépendant, sans lien avec Anthropic et non approuvé par Anthropic.

## Chrome Web Store: privacy tab

### Single purpose

> Organize claude.ai conversations into nested folders inside each project.

### Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's folders, folder assignments and display setting locally in the browser. |
| Host `https://claude.ai/*` | Displays the folder tree inside claude.ai project pages and the sidebar, and reads conversation titles and links shown on the page to file them. |

Remote code: **No**, all code is bundled in the package.

### Data usage

Collected data: **none**. Tick the three certifications:

- Data is not sold or transferred to third parties.
- Data is not used or transferred for purposes unrelated to the single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

## Firefox Add-ons

- Data collection: **none** (matches `data_collection_permissions: required: ['none']` in the
  manifest).
- Source code: the build is minified, so AMO requires the sources. Upload the zip from
  `pnpm zip:firefox` (`dist/*-sources.zip`) and give the build steps in "Notes to reviewer":
  Node 24, pnpm 11, `pnpm install --frozen-lockfile`, `pnpm build:firefox`; the output is in
  `dist/firefox-mv3`.

## Assets

| Asset | Size | Source |
| --- | --- | --- |
| Store icon | 128×128 | `public/icon-128.png` |
| Screenshots (Chrome: 1–5, AMO: any) | 1280×800 | Captured from the extension, light and dark themes |
| Chrome small promo tile | 440×280 | Logo on brand background |
