import { i18n } from '#i18n';
import { createElement } from '@/features/folders/ui/element';
import type { PanelRender } from '@/features/folders/ui/floating-panel';
import { createPanelButton, createPanelButtons } from '@/features/folders/ui/panel-controls';

/**
 * Builds the content of the panel confirming a folder deletion. Cancel is focused, so pressing
 * Enter right away deletes nothing; Delete has the destructive look.
 * @param params.document - The owner document.
 * @param params.folderName - The name of the folder to delete.
 * @param params.onConfirm - Deletes the folder.
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function deleteFolderPanel(params: {
  document: Document;
  folderName: string;
  onConfirm: () => void;
}): PanelRender {
  const { document, folderName, onConfirm } = params;
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
          children: [i18n.t('deleteFolderConfirm', [folderName])],
        }),
        createPanelButtons({ document, buttons: [cancel, confirm] }),
      ],
      initialFocus: cancel,
    };
  };
}
