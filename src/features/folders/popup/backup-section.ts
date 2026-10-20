import { i18n } from '#i18n';
import { backupFileName, serializeBackup } from '@/features/folders/backup/backup-file';
import type { ParsedBackup } from '@/features/folders/backup/backup-file.parser';
import { readBackupFile } from '@/features/folders/backup/backup-file.reader';
import { countSnapshot } from '@/features/folders/domain/folders-snapshot';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { backupErrorText } from '@/features/folders/popup/backup-error.text';
import type { DownloadedFile } from '@/features/folders/popup/file-download';
import { showInlineConfirmation } from '@/features/folders/popup/inline-confirmation';
import {
  BUTTON_ICON_SIZE,
  createSection,
  createSectionHeading,
  createStatus,
  setStatus,
} from '@/features/folders/popup/popup-controls';
import { countsText, storedSummaryText } from '@/features/folders/popup/snapshot-counts.text';
import { createElement } from '@/features/folders/ui/element';
import { createIcon } from '@/features/folders/ui/icons';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

const ACCEPTED_FILE_TYPES = '.json,application/json';
const FILES_DRAG_TYPE = 'Files';
const CONFIRMATION_ID = 'nfc-import-question';
const TITLE_ID = 'nfc-backup-title';
const EXPORTED_AT_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

type BackupSectionParams = {
  document: Document;
  store: FoldersSnapshotStore;
  locale: string;
  now: () => Date;
  saveFile: (file: DownloadedFile) => void;
  acceptDrops: boolean;
  onImported: () => void;
};

type BackupParts = {
  readonly params: BackupSectionParams;
  readonly status: HTMLElement;
  readonly importArea: HTMLElement;
  readonly importButton: HTMLButtonElement;
};

async function exportBackup(parts: BackupParts): Promise<void> {
  const { params, status } = parts;
  try {
    const snapshot = await params.store.read();
    const exportedAt = params.now();
    const fileName = backupFileName(exportedAt);
    params.saveFile({ fileName, content: serializeBackup({ snapshot, exportedAt }) });
    setStatus({
      status,
      text: i18n.t('exportDone', [...countsText(countSnapshot(snapshot)), fileName]),
      tone: 'info',
    });
  } catch {
    setStatus({ status, text: i18n.t('exportFailed'), tone: 'error' });
  }
}

async function replaceWithBackup(params: {
  parts: BackupParts;
  backup: ParsedBackup;
}): Promise<void> {
  const { parts, backup } = params;
  try {
    await parts.params.store.replace(backup.snapshot);
    const counts = countSnapshot(await parts.params.store.read());
    setStatus({
      status: parts.status,
      text: i18n.t('importDone', countsText(counts)),
      tone: 'info',
    });
    parts.params.onImported();
  } catch {
    setStatus({ status: parts.status, text: i18n.t('importFailed'), tone: 'error' });
  }
}

async function confirmImport(params: { parts: BackupParts; backup: ParsedBackup }): Promise<void> {
  const { parts, backup } = params;
  const current = countSnapshot(await parts.params.store.read());
  const exportedAt = new Intl.DateTimeFormat(parts.params.locale, EXPORTED_AT_FORMAT).format(
    backup.exportedAt,
  );
  showInlineConfirmation({
    document: parts.params.document,
    container: parts.importArea,
    id: CONFIRMATION_ID,
    question: i18n.t('importConfirm'),
    details: [
      i18n.t('importSummary', [exportedAt, ...countsText(countSnapshot(backup.snapshot))]),
      storedSummaryText(current),
    ],
    confirmLabel: i18n.t('buttonReplace'),
    returnFocus: parts.importButton,
    onConfirm: () => replaceWithBackup({ parts, backup }),
  });
}

async function importFile(params: { parts: BackupParts; file: File }): Promise<void> {
  const { parts } = params;
  setStatus({ status: parts.status, text: '', tone: 'info' });
  parts.importArea.replaceChildren();
  const result = await readBackupFile(params.file);
  if (result.ok) {
    await confirmImport({ parts, backup: result.backup });
    return;
  }
  parts.importArea.replaceChildren(
    createElement({
      document: parts.params.document,
      tag: 'p',
      className: 'nfc-error',
      attributes: { role: 'alert' },
      children: [backupErrorText(result.error)],
    }),
  );
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(FILES_DRAG_TYPE) ?? false;
}

function listenToDrops(params: { zone: HTMLElement; onFile: (file: File) => void }): void {
  const { zone, onFile } = params;
  zone.addEventListener('dragover', (event) => {
    if (hasFiles(event)) {
      event.preventDefault();
      zone.classList.add('nfc-drop-zone-over');
    }
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('nfc-drop-zone-over');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('nfc-drop-zone-over');
    const file = event.dataTransfer?.files[0];
    if (file !== undefined) {
      onFile(file);
    }
  });
}

function importControls(params: {
  document: Document;
  acceptDrops: boolean;
  children: readonly Node[];
  onFile: (file: File) => void;
}): HTMLElement {
  const { document } = params;
  if (!params.acceptDrops) {
    return createElement({
      document,
      tag: 'div',
      className: 'nfc-import',
      children: params.children,
    });
  }
  const zone = createElement({
    document,
    tag: 'div',
    className: 'nfc-drop-zone',
    children: [
      ...params.children,
      createElement({
        document,
        tag: 'p',
        className: 'nfc-muted',
        children: [i18n.t('importDropHint')],
      }),
    ],
  });
  listenToDrops({ zone, onFile: params.onFile });
  return zone;
}

function iconButton(params: {
  document: Document;
  icon: 'download' | 'upload';
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}): HTMLButtonElement {
  const { document, icon, ...button } = params;
  const element = createPanelButton({ document, ...button });
  element.prepend(createIcon({ document, name: icon, size: BUTTON_ICON_SIZE, className: '' }));
  return element;
}

/**
 * Builds the "Backup" section: export to a dated JSON file (the primary action), and import from
 * a picked (or dropped) file, validated in full and applied only after an inline confirmation.
 * @param params.document - The owner document.
 * @param params.store - Whole-storage access.
 * @param params.locale - The interface language, for the export date of a backup.
 * @param params.now - The clock dating exports.
 * @param params.saveFile - Hands the exported file to the user.
 * @param params.acceptDrops - Whether a backup file can also be dropped on the section (a full
 * page); in the toolbar popup, dragging a file from elsewhere would close it first.
 * @param params.onImported - Called once a backup replaced the stored data.
 * @returns The section element.
 */
export function backupSection(params: BackupSectionParams): HTMLElement {
  const { document } = params;
  const status = createStatus(document);
  const importArea = createElement({ document, tag: 'div', className: 'nfc-import-area' });
  const fileInput = createElement({
    document,
    tag: 'input',
    className: 'nfc-visually-hidden',
    attributes: {
      type: 'file',
      accept: ACCEPTED_FILE_TYPES,
      tabindex: '-1',
      'aria-hidden': 'true',
    },
  });
  const importButton = iconButton({
    document,
    icon: 'upload',
    label: i18n.t('buttonImportBackup'),
    variant: 'secondary',
    onPress: () => {
      fileInput.click();
    },
  });
  const parts: BackupParts = { params, status, importArea, importButton };
  const exportButton = iconButton({
    document,
    icon: 'download',
    label: i18n.t('buttonExportBackup'),
    variant: 'primary',
    onPress: () => {
      void exportBackup(parts);
    },
  });
  const onFile = (file: File) => {
    void importFile({ parts, file });
  };
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file !== undefined) {
      onFile(file);
    }
  });
  const controls = importControls({
    document,
    acceptDrops: params.acceptDrops,
    children: [
      createElement({
        document,
        tag: 'div',
        className: 'nfc-actions nfc-actions-split',
        children: [exportButton, importButton],
      }),
      fileInput,
    ],
    onFile,
  });
  return createSection({
    document,
    id: TITLE_ID,
    className: '',
    children: [
      createSectionHeading({
        document,
        id: TITLE_ID,
        title: i18n.t('sectionBackupTitle'),
        description: i18n.t('backupDescription'),
      }),
      controls,
      importArea,
      status,
    ],
  });
}
