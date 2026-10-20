import { i18n } from '#i18n';
import {
  BUTTON_ICON_SIZE,
  createActions,
  createSection,
  createSectionHeading,
} from '@/features/folders/popup/popup-controls';
import { createIcon } from '@/features/folders/ui/icons';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

const TITLE_ID = 'nfc-backup-title';

/**
 * Builds the "Backup" section of the Firefox popup: a button opening the backup page in a tab.
 * Firefox closes an action popup as soon as a file dialog (open or save) takes focus, which loses
 * the picked file and can cancel a download, so export and import run in a regular tab there.
 * @param params.document - The owner document.
 * @param params.openBackupPage - Opens the backup page in a new tab.
 * @returns The section element.
 */
export function backupLinkSection(params: {
  document: Document;
  openBackupPage: () => void;
}): HTMLElement {
  const { document } = params;
  const open = createPanelButton({
    document,
    label: i18n.t('buttonOpenBackupPage'),
    variant: 'primary',
    onPress: params.openBackupPage,
  });
  open.append(createIcon({ document, name: 'external', size: BUTTON_ICON_SIZE, className: '' }));
  return createSection({
    document,
    id: TITLE_ID,
    className: '',
    children: [
      createSectionHeading({
        document,
        id: TITLE_ID,
        title: i18n.t('sectionBackupTitle'),
        description: i18n.t('backupTabHint'),
      }),
      createActions({ document, children: [open] }),
    ],
  });
}
