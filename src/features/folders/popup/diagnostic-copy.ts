import { i18n } from '#i18n';
import { createStatus, setStatus } from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';
import { createPanelButton } from '@/features/folders/ui/panel-controls';

const FALLBACK_ID = 'nfc-diagnostic-fallback';
const FALLBACK_ROWS = '8';

/** The "Copy diagnostic" control. */
export type DiagnosticCopy = {
  readonly element: HTMLElement;
  /** Collects the diagnostic again, after the stored data changed. */
  refresh(): Promise<void>;
};

async function copy(params: {
  text: string;
  status: HTMLElement;
  fallback: HTMLTextAreaElement;
  copyText: (text: string) => Promise<void>;
}): Promise<void> {
  const { status, fallback } = params;
  try {
    await params.copyText(params.text);
    fallback.hidden = true;
    setStatus({ status, text: i18n.t('diagnosticCopied'), tone: 'info' });
  } catch {
    fallback.value = params.text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    setStatus({ status, text: i18n.t('copyFailed'), tone: 'error' });
  }
}

/**
 * Builds the "Copy diagnostic" button and its status. The diagnostic is collected when the popup
 * opens (and again on `refresh`), so a click copies it right away, while the click still counts
 * as a user action for the clipboard. When copying fails, the text is shown selected in a
 * read-only field for a manual copy.
 * @param params.document - The owner document.
 * @param params.collect - Builds the diagnostic text.
 * @param params.copyText - Writes text to the clipboard.
 * @returns The control and its refresher.
 */
export function diagnosticCopy(params: {
  document: Document;
  collect: () => Promise<string>;
  copyText: (text: string) => Promise<void>;
}): DiagnosticCopy {
  const { document } = params;
  let text = '';
  const status = createStatus(document);
  const fallback = createElement({
    document,
    tag: 'textarea',
    className: 'nfc-diagnostic',
    attributes: {
      id: FALLBACK_ID,
      rows: FALLBACK_ROWS,
      spellcheck: 'false',
      'aria-label': i18n.t('buttonCopyDiagnostic'),
    },
  });
  fallback.readOnly = true;
  fallback.hidden = true;
  const button = createPanelButton({
    document,
    label: i18n.t('buttonCopyDiagnostic'),
    variant: 'secondary',
    onPress: () => {
      void copy({ text, status, fallback, copyText: params.copyText });
    },
  });
  button.disabled = true;
  const refresh = async () => {
    text = await params.collect();
    button.disabled = false;
  };
  void refresh();
  return {
    element: createElement({
      document,
      tag: 'div',
      className: 'nfc-diagnostic-copy',
      children: [button, status, fallback],
    }),
    refresh,
  };
}
