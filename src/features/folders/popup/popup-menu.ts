import { i18n } from '#i18n';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { backupLinkSection } from '@/features/folders/popup/backup-link-section';
import { type BackupSection, backupSection } from '@/features/folders/popup/backup-section';
import { dangerZoneSection } from '@/features/folders/popup/danger-zone-section';
import { collectDiagnostic } from '@/features/folders/popup/diagnostic-collector';
import { type DiagnosticCopy, diagnosticCopy } from '@/features/folders/popup/diagnostic-copy';
import { displaySection, type HideFiledControl } from '@/features/folders/popup/display-section';
import type { DownloadedFile } from '@/features/folders/popup/file-download';
import { createHeader } from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';

const REPOSITORY_URL = 'https://github.com/Azurioh/nest-for-claude';
const TITLE_ID = 'nfc-popup-title';

/**
 * Where export and import run: inline in the popup (Chrome), or on the backup page opened in a
 * tab (Firefox, which closes the popup when a file dialog opens).
 */
export type PopupBackupMode =
  | { readonly kind: 'inline'; readonly saveFile: (file: DownloadedFile) => void }
  | { readonly kind: 'tab'; readonly openBackupPage: () => void };

/** A started popup. */
export type PopupMenu = {
  /** Stops every storage watch. */
  stop(): void;
};

type PopupMenuParams = {
  document: Document;
  root: HTMLElement;
  store: FoldersSnapshotStore;
  hideFiled: HideFiledControl;
  pageDiagnostic: () => Promise<DomDiagnostic | null>;
  extensionVersion: string;
  userAgent: string;
  locale: string;
  now: () => Date;
  backup: PopupBackupMode;
  copyText: (text: string) => Promise<void>;
};

function createBackupSection(params: {
  menu: PopupMenuParams;
  onImported: () => void;
}): BackupSection {
  const { menu } = params;
  if (menu.backup.kind === 'tab') {
    return backupLinkSection({
      document: menu.document,
      store: menu.store,
      openBackupPage: menu.backup.openBackupPage,
    });
  }
  return backupSection({
    document: menu.document,
    store: menu.store,
    locale: menu.locale,
    now: menu.now,
    saveFile: menu.backup.saveFile,
    acceptDrops: false,
    onImported: params.onImported,
  });
}

function footer(params: { document: Document; diagnostic: DiagnosticCopy }): HTMLElement {
  const { document } = params;
  return createElement({
    document,
    tag: 'footer',
    className: 'nfc-footer',
    children: [
      params.diagnostic.element,
      createElement({
        document,
        tag: 'div',
        className: 'nfc-footer-links',
        children: [
          createElement({
            document,
            tag: 'a',
            className: 'nfc-link',
            attributes: { href: REPOSITORY_URL, target: '_blank', rel: 'noopener noreferrer' },
            children: [i18n.t('footerSource')],
          }),
          createElement({
            document,
            tag: 'p',
            className: 'nfc-fineprint',
            children: [i18n.t('footerNotAffiliated')],
          }),
        ],
      }),
    ],
  });
}

/**
 * Renders the toolbar popup: header (name, version), "Display", "Backup" and "Danger zone"
 * sections, and a footer with "Copy diagnostic" and the links. Focus starts on the menu itself,
 * so the first Tab reaches the first control and nothing is toggled by accident. Every browser
 * API is injected, so the popup runs against fakes in tests.
 * @param params.document - The popup document.
 * @param params.root - The element the popup renders into; its content is replaced.
 * @param params.store - Whole-storage access (backup, deletion, counts).
 * @param params.hideFiled - The display setting.
 * @param params.pageDiagnostic - Asks an open claude.ai tab for its page diagnostic.
 * @param params.extensionVersion - The manifest version.
 * @param params.userAgent - `navigator.userAgent`.
 * @param params.locale - The interface language, for dates.
 * @param params.now - The clock dating exports.
 * @param params.backup - Where export and import run.
 * @param params.copyText - Writes text to the clipboard.
 * @returns The popup, to stop its storage watches.
 */
export function startPopupMenu(params: PopupMenuParams): PopupMenu {
  const { document, store } = params;
  const display = displaySection({ document, setting: params.hideFiled });
  const diagnostic = diagnosticCopy({
    document,
    collect: () => collectDiagnostic(params),
    copyText: params.copyText,
  });
  const backup = createBackupSection({
    menu: params,
    onImported: () => {
      void diagnostic.refresh();
    },
  });
  const dangerZone = dangerZoneSection({
    document,
    store,
    onDeleted: () => {
      void backup.refreshCounts();
      void diagnostic.refresh();
    },
  });
  const main = createElement({
    document,
    tag: 'main',
    className: 'nfc-main',
    attributes: { tabindex: '-1', 'aria-labelledby': TITLE_ID },
    children: [display.element, backup.element, dangerZone],
  });
  const header = createHeader({
    document,
    titleId: TITLE_ID,
    title: i18n.t('extName'),
    subtitle: i18n.t('popupVersion', [params.extensionVersion]),
  });
  params.root.replaceChildren(header, main, footer({ document, diagnostic }));
  main.focus();
  return { stop: display.stop };
}
