import { i18n } from '#i18n';
import { countSnapshot } from '@/features/folders/domain/folders-snapshot';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import type { BackupSection } from '@/features/folders/popup/backup-section';
import { createActions, createSection } from '@/features/folders/popup/popup-controls';
import { storedSummaryText } from '@/features/folders/popup/snapshot-counts.text';
import { createElement } from '@/features/folders/ui/element';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

/**
 * Builds the "Backup" section of the Firefox popup: the stored counts and a button opening the
 * backup page in a tab. Firefox closes an action popup as soon as a file dialog (open or save)
 * takes focus, which loses the picked file and can cancel a download, so export and import run
 * in a regular tab there.
 * @param params.document - The owner document.
 * @param params.store - Whole-storage access, for the counts.
 * @param params.openBackupPage - Opens the backup page in a new tab.
 * @returns The section and its counts refresher.
 */
export function backupLinkSection(params: {
  document: Document;
  store: FoldersSnapshotStore;
  openBackupPage: () => void;
}): BackupSection {
  const { document, store } = params;
  const summary = createElement({ document, tag: 'p', className: 'nfc-summary' });
  const open = createPanelButton({
    document,
    label: i18n.t('buttonOpenBackupPage'),
    variant: 'primary',
    onPress: params.openBackupPage,
  });
  const refreshCounts = async () => {
    summary.textContent = storedSummaryText(countSnapshot(await store.read()));
  };
  void refreshCounts();
  return {
    element: createSection({
      document,
      id: 'nfc-backup-title',
      title: i18n.t('sectionBackupTitle'),
      description: i18n.t('backupTabHint'),
      danger: false,
      children: [summary, createActions({ document, children: [open] })],
    }),
    refreshCounts,
  };
}
