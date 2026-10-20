import { i18n } from '#i18n';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { showInlineConfirmation } from '@/features/folders/popup/inline-confirmation';
import {
  createSection,
  createSectionHeading,
  createStatus,
  setStatus,
} from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

const CONFIRMATION_ID = 'nfc-delete-all-question';
const TITLE_ID = 'nfc-danger-title';

async function deleteAll(params: {
  store: FoldersSnapshotStore;
  status: HTMLElement;
  onDeleted: () => void;
}): Promise<void> {
  const { status } = params;
  try {
    await params.store.clear();
    setStatus({ status, text: i18n.t('deleteAllDone'), tone: 'info' });
    params.onDeleted();
  } catch {
    setStatus({ status, text: i18n.t('deleteAllFailed'), tone: 'error' });
  }
}

/**
 * Builds the "Danger zone" section, kept quiet at the bottom of the menu: deleting every
 * project's folders and the settings, after an inline confirmation whose Cancel button is focused.
 * @param params.document - The owner document.
 * @param params.store - Whole-storage access.
 * @param params.onDeleted - Called once the data is deleted.
 * @returns The section element.
 */
export function dangerZoneSection(params: {
  document: Document;
  store: FoldersSnapshotStore;
  onDeleted: () => void;
}): HTMLElement {
  const { document, store, onDeleted } = params;
  const status = createStatus(document);
  const confirmationArea = createElement({ document, tag: 'div', className: 'nfc-import-area' });
  const deleteButton = createPanelButton({
    document,
    label: i18n.t('buttonDeleteAll'),
    variant: 'danger',
    onPress: () => {
      setStatus({ status, text: '', tone: 'info' });
      showInlineConfirmation({
        document,
        container: confirmationArea,
        id: CONFIRMATION_ID,
        question: i18n.t('deleteAllConfirm'),
        details: [],
        confirmLabel: i18n.t('buttonDelete'),
        returnFocus: deleteButton,
        onConfirm: () => deleteAll({ store, status, onDeleted }),
      });
    },
  });
  return createSection({
    document,
    id: TITLE_ID,
    className: 'nfc-card-danger',
    children: [
      createElement({
        document,
        tag: 'div',
        className: 'nfc-danger-row',
        children: [
          createSectionHeading({
            document,
            id: TITLE_ID,
            title: i18n.t('sectionDangerTitle'),
            description: i18n.t('deleteAllDescription'),
          }),
          deleteButton,
        ],
      }),
      confirmationArea,
      status,
    ],
  });
}
