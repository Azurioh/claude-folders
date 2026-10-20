import '@/features/folders/popup/popup.css';
import { browser } from '#imports';
import { downloadJsonFile } from '@/features/folders/popup/file-download';
import { type PopupBackupMode, startPopupMenu } from '@/features/folders/popup/popup-menu';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';

const ROOT_ID = 'nfc-popup';
const BACKUP_PAGE_PATH = '/backup.html';

/**
 * Firefox closes an action popup when a file dialog opens (the picked file is lost, a download
 * can be cancelled), so it backs up in a tab; Chrome keeps the popup open and backs up inline.
 */
function backupMode(): PopupBackupMode {
  if (import.meta.env.FIREFOX) {
    return {
      kind: 'tab',
      openBackupPage: () => {
        void browser.tabs.create({ url: browser.runtime.getURL(BACKUP_PAGE_PATH) });
        window.close();
      },
    };
  }
  return {
    kind: 'inline',
    saveFile: (file) => {
      downloadJsonFile({ document, file });
    },
  };
}

/**
 * Action popup entrypoint, shown when the toolbar icon is clicked: the composition root of the
 * menu. It wires the browser storage adapters, the manifest version, the interface language and
 * the backup mode of this browser into the menu.
 */
const root = document.getElementById(ROOT_ID);
if (root !== null) {
  const locale = browser.i18n.getUILanguage();
  document.documentElement.lang = locale;
  startPopupMenu({
    document,
    root,
    store: new BrowserFoldersSnapshotStore(),
    hideFiled: new BrowserHideFiledSetting(),
    extensionVersion: browser.runtime.getManifest().version,
    locale,
    now: () => new Date(),
    backup: backupMode(),
  });
}
