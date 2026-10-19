import { i18n } from '#i18n';
import { createActions } from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

const ESCAPE_KEY = 'Escape';

/**
 * Shows an inline confirmation in a container, instead of a native `confirm`: a question, an
 * optional detail, Cancel and a destructive confirm button. Cancel is focused, so pressing Enter
 * right away changes nothing; Cancel and Escape close it. Either way the container is emptied
 * and focus goes back to `returnFocus` once done.
 * @param params.document - The owner document.
 * @param params.container - Where the confirmation renders; its content is replaced.
 * @param params.id - Id of the question, naming the confirmation group.
 * @param params.question - The question, e.g. "Delete all data?".
 * @param params.details - Extra lines shown before the question.
 * @param params.confirmLabel - The text of the confirm button.
 * @param params.returnFocus - The control focused once the confirmation closes.
 * @param params.onConfirm - Runs the confirmed action; the buttons stay disabled until it settles.
 */
export function showInlineConfirmation(params: {
  document: Document;
  container: HTMLElement;
  id: string;
  question: string;
  details: readonly string[];
  confirmLabel: string;
  returnFocus: HTMLElement;
  onConfirm: () => Promise<void>;
}): void {
  const { document, container, returnFocus } = params;
  const close = () => {
    container.replaceChildren();
    returnFocus.focus();
  };
  const cancel = createPanelButton({
    document,
    label: i18n.t('buttonCancel'),
    variant: 'secondary',
    onPress: close,
  });
  const confirm = createPanelButton({
    document,
    label: params.confirmLabel,
    variant: 'danger',
    onPress: () => {
      cancel.disabled = true;
      confirm.disabled = true;
      void params.onConfirm().finally(close);
    },
  });
  const group = createElement({
    document,
    tag: 'div',
    className: 'nfc-confirmation',
    attributes: { role: 'group', 'aria-labelledby': params.id },
    children: [
      ...params.details.map((detail) =>
        createElement({ document, tag: 'p', className: 'nfc-muted', children: [detail] }),
      ),
      createElement({
        document,
        tag: 'p',
        className: 'nfc-confirmation-question',
        attributes: { id: params.id },
        children: [params.question],
      }),
      createActions({ document, children: [cancel, confirm] }),
    ],
  });
  group.addEventListener('keydown', (event) => {
    if (event.key === ESCAPE_KEY && !cancel.disabled) {
      event.preventDefault();
      close();
    }
  });
  container.replaceChildren(group);
  cancel.focus();
}
