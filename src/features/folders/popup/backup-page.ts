import { i18n } from '#i18n';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { backupSection } from '@/features/folders/popup/backup-section';
import type { DownloadedFile } from '@/features/folders/popup/file-download';
import { createHeader } from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';

/**
 * Renders the backup page, opened in a tab from the Firefox popup: only the backup section
 * (counts, export, import from a picked or dropped file with its inline confirmation).
 * @param params.document - The page document.
 * @param params.root - The element the page renders into; its content is replaced.
 * @param params.store - Whole-storage access.
 * @param params.locale - The interface language, for dates.
 * @param params.now - The clock dating exports.
 * @param params.saveFile - Hands an exported file to the user.
 */
export function startBackupPage(params: {
  document: Document;
  root: HTMLElement;
  store: FoldersSnapshotStore;
  locale: string;
  now: () => Date;
  saveFile: (file: DownloadedFile) => void;
}): void {
  const { document } = params;
  const backup = backupSection({
    document,
    store: params.store,
    locale: params.locale,
    now: params.now,
    saveFile: params.saveFile,
    acceptDrops: true,
    onImported: () => undefined,
  });
  params.root.replaceChildren(
    createHeader({
      document,
      titleId: 'nfc-backup-page-title',
      title: i18n.t('backupPageTitle'),
      subtitle: i18n.t('backupPageDescription'),
    }),
    createElement({ document, tag: 'main', className: 'nfc-main', children: [backup.element] }),
  );
}
