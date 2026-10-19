import { i18n } from '#i18n';
import type { DeletionImpact } from '@/features/folders/domain/folders.queries';
import { createElement } from '@/features/folders/ui/element';
import type { PanelRender } from '@/features/folders/ui/floating-panel';
import { createPanelButton, createPanelButtons } from '@/features/folders/ui/panel-controls';

function confirmationText(params: { folderName: string; impact: DeletionImpact }): string {
  const { subfolders, conversations } = params.impact;
  const question = i18n.t('deleteFolderConfirm', subfolders, [
    params.folderName,
    String(subfolders),
  ]);
  if (conversations === 0) {
    return question;
  }
  return `${question} ${i18n.t('deleteFolderUnfiledConversations', conversations)}`;
}

/**
 * Builds the content of the panel confirming a folder deletion. The text names the sub-folders
 * deleted with the folder and the conversations going back to claude.ai's lists. Cancel is
 * focused, so pressing Enter right away deletes nothing; Delete has the destructive look.
 * @param params.document - The owner document.
 * @param params.folderName - The name of the folder to delete.
 * @param params.impact - What the deletion removes along with the folder.
 * @param params.onConfirm - Deletes the folder.
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function deleteFolderPanel(params: {
  document: Document;
  folderName: string;
  impact: DeletionImpact;
  onConfirm: () => void;
}): PanelRender {
  const { document, folderName, impact, onConfirm } = params;
  return (controls) => {
    const cancel = createPanelButton({
      document,
      label: i18n.t('buttonCancel'),
      variant: 'secondary',
      onPress: () => {
        controls.close();
      },
    });
    const confirm = createPanelButton({
      document,
      label: i18n.t('buttonDelete'),
      variant: 'danger',
      onPress: () => {
        onConfirm();
        controls.close();
      },
    });
    return {
      body: [
        createElement({
          document,
          tag: 'p',
          className: 'nfc-panel-text',
          children: [confirmationText({ folderName, impact })],
        }),
        createPanelButtons({ document, buttons: [cancel, confirm] }),
      ],
      initialFocus: cancel,
    };
  };
}
