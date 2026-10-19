import { i18n } from '#i18n';
import type { ConversationCandidate } from '@/features/folders/ui/conversation-candidates';
import { createElement } from '@/features/folders/ui/element';
import type { PanelContent, PanelRender } from '@/features/folders/ui/floating-panel';
import { createIcon } from '@/features/folders/ui/icons';
import { createPanelHint, createTextInput } from '@/features/folders/ui/panel-controls';

const FILTER_FIELD_ID = 'nfc-adder-filter';
const ITEM_ICON_SIZE = 14;

function matches(params: { candidate: ConversationCandidate; query: string }): boolean {
  return params.candidate.title.toLocaleLowerCase().includes(params.query);
}

/**
 * The "add conversations" picker: a filter field over the candidates, each one a button filing
 * it. The list is rebuilt after every filing, so the filed conversation disappears from it.
 */
class ConversationAdder {
  private readonly document: Document;
  private readonly candidates: () => readonly ConversationCandidate[];
  private readonly onFile: (candidate: ConversationCandidate) => void;
  private readonly filter: HTMLInputElement;
  private readonly list: HTMLElement;
  private readonly empty: HTMLElement;

  constructor(params: {
    document: Document;
    candidates: () => readonly ConversationCandidate[];
    onFile: (candidate: ConversationCandidate) => void;
  }) {
    const { document } = params;
    this.document = document;
    this.candidates = params.candidates;
    this.onFile = params.onFile;
    this.filter = createTextInput({ document, id: FILTER_FIELD_ID, value: '', className: '' });
    this.filter.type = 'search';
    this.filter.placeholder = i18n.t('filterPlaceholder');
    this.filter.setAttribute('aria-label', i18n.t('fieldFilter'));
    this.filter.addEventListener('input', () => {
      this.fill();
    });
    this.list = createElement({ document, tag: 'div', className: 'nfc-adder-list' });
    this.empty = createElement({
      document,
      tag: 'div',
      className: 'nfc-panel-empty',
      attributes: { role: 'status' },
    });
  }

  build(): PanelContent {
    this.fill();
    return {
      body: [
        this.filter,
        this.list,
        this.empty,
        createPanelHint({ document: this.document, text: i18n.t('adderHint') }),
      ],
      initialFocus: this.filter,
    };
  }

  private fill(): void {
    const query = this.filter.value.trim().toLocaleLowerCase();
    const shown = this.candidates().filter((candidate) => matches({ candidate, query }));
    this.list.replaceChildren(...shown.map((candidate) => this.item(candidate)));
    this.list.hidden = shown.length === 0;
    this.empty.textContent = shown.length === 0 ? i18n.t('adderEmpty') : '';
  }

  private item(candidate: ConversationCandidate): HTMLButtonElement {
    const { document } = this;
    const button = createElement({
      document,
      tag: 'button',
      className: 'nfc-adder-item',
      attributes: { type: 'button' },
      children: [
        createIcon({ document, name: 'plus', size: ITEM_ICON_SIZE, className: 'nfc-adder-icon' }),
        createElement({
          document,
          tag: 'span',
          className: 'nfc-adder-title',
          children: [candidate.title],
        }),
      ],
    });
    button.addEventListener('click', () => {
      this.file({ candidate, button });
    });
    return button;
  }

  private file(params: { candidate: ConversationCandidate; button: HTMLButtonElement }): void {
    const index = [...this.list.children].indexOf(params.button);
    this.onFile(params.candidate);
    this.fill();
    const next = this.list.children.item(Math.min(index, this.list.children.length - 1));
    if (next instanceof HTMLElement) {
      next.focus();
    } else {
      this.filter.focus();
    }
  }
}

/**
 * Builds the content of the "add conversations" panel, the way to file conversations without
 * drag and drop: a filter field (focused), the candidates as buttons (a click files one and
 * removes it from the list), an empty state and a hint saying where candidates come from.
 * @param params.document - The owner document.
 * @param params.candidates - Reads the current candidates; called again after every filing.
 * @param params.onFile - Files a candidate.
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function conversationAdderPanel(params: {
  document: Document;
  candidates: () => readonly ConversationCandidate[];
  onFile: (candidate: ConversationCandidate) => void;
}): PanelRender {
  const adder = new ConversationAdder(params);
  return () => adder.build();
}
