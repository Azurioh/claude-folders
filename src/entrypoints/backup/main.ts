import '@/features/folders/popup/popup.css';
import { i18n } from '#i18n';
import { browser } from '#imports';
import { startBackupPage } from '@/features/folders/popup/backup-page';
import { downloadJsonFile } from '@/features/folders/popup/file-download';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';

const ROOT_ID = 'nfc-backup';

/**
 * Backup page entrypoint (Firefox build only), opened in a tab from the popup: export and
 * import run here because Firefox closes the popup when a file dialog opens.
 */
const root = document.getElementById(ROOT_ID);
if (root !== null) {
  const locale = browser.i18n.getUILanguage();
  document.documentElement.lang = locale;
  document.title = i18n.t('backupPageTitle');
  startBackupPage({
    document,
    root,
    store: new BrowserFoldersSnapshotStore(),
    locale,
    now: () => new Date(),
    saveFile: (file) => {
      downloadJsonFile({ document, file });
    },
  });
}
