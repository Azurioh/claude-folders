import { i18n } from '#i18n';
import { createElement } from '@/features/folders/ui/element';

const ENTER_KEY = 'Enter';

/** Look of a panel button: the main action, a secondary one, or a destructive one. */
export type PanelButtonVariant = 'primary' | 'secondary' | 'danger';

/**
 * Builds a text input of a panel.
 * @param params.document - The owner document.
 * @param params.id - The input id, referenced by its label; unique within the open panel.
 * @param params.value - The initial value.
 * @param params.className - Classes added after `nfc-input`.
 * @returns The input.
 */
export function createTextInput(params: {
  document: Document;
  id: string;
  value: string;
  className: string;
}): HTMLInputElement {
  const { document, id, value, className } = params;
  const input = createElement({
    document,
    tag: 'input',
    className: `nfc-input ${className}`.trim(),
    attributes: { id, type: 'text', autocomplete: 'off', spellcheck: 'false' },
  });
  input.value = value;
  return input;
}

/**
 * Builds the search field filtering the list of a picker panel; its label is only announced, the
 * placeholder says what it does.
 * @param params.document - The owner document.
 * @param params.id - The input id; unique within the open panel.
 * @param params.label - The accessible name, e.g. "Filter conversations".
 * @returns The input.
 */
export function createFilterField(params: {
  document: Document;
  id: string;
  label: string;
}): HTMLInputElement {
  const { document, id, label } = params;
  const input = createTextInput({ document, id, value: '', className: '' });
  input.type = 'search';
  input.placeholder = i18n.t('filterPlaceholder');
  input.setAttribute('aria-label', label);
  return input;
}

/**
 * Reads the query typed in a filter field, ready to match lowercased text.
 * @param input - The filter field.
 * @returns The trimmed, lowercased query.
 */
export function filterQueryOf(input: HTMLInputElement): string {
  return input.value.trim().toLocaleLowerCase();
}

/**
 * Builds the visible label of a panel control.
 * @param params.document - The owner document.
 * @param params.text - The label text.
 * @param params.forId - The id of the labelled input, or `null` for a label naming a group.
 * @param params.id - The label's own id, for `aria-labelledby`, or `null`.
 * @returns The label element.
 */
export function createPanelLabel(params: {
  document: Document;
  text: string;
  forId: string | null;
  id: string | null;
}): HTMLElement {
  const { document, text, forId, id } = params;
  const label = createElement({
    document,
    tag: forId === null ? 'div' : 'label',
    className: 'nfc-panel-label',
    children: [text],
  });
  if (forId !== null) {
    label.setAttribute('for', forId);
  }
  if (id !== null) {
    label.id = id;
  }
  return label;
}

/**
 * Builds a small explanation shown at the bottom of a panel.
 * @param params.document - The owner document.
 * @param params.text - The explanation.
 * @returns The hint element.
 */
export function createPanelHint(params: { document: Document; text: string }): HTMLElement {
  return createElement({
    document: params.document,
    tag: 'div',
    className: 'nfc-panel-hint',
    children: [params.text],
  });
}

/**
 * Builds a labelled button of a panel.
 * @param params.document - The owner document.
 * @param params.label - The button text.
 * @param params.variant - Its look.
 * @param params.onPress - Called on click.
 * @returns The button.
 */
export function createPanelButton(params: {
  document: Document;
  label: string;
  variant: PanelButtonVariant;
  onPress: () => void;
}): HTMLButtonElement {
  const { document, label, variant, onPress } = params;
  const button = createElement({
    document,
    tag: 'button',
    className: `nfc-button nfc-button-${variant}`,
    attributes: { type: 'button' },
    children: [label],
  });
  button.addEventListener('click', onPress);
  return button;
}

/**
 * Builds the row of buttons ending a panel.
 * @param params.document - The owner document.
 * @param params.buttons - The buttons, in display order.
 * @returns The row.
 */
export function createPanelButtons(params: {
  document: Document;
  buttons: readonly HTMLButtonElement[];
}): HTMLElement {
  return createElement({
    document: params.document,
    tag: 'div',
    className: 'nfc-panel-buttons',
    children: params.buttons,
  });
}

/**
 * Runs a handler when Enter is pressed in an input, instead of any default behaviour.
 * @param params.input - The input.
 * @param params.onEnter - The handler.
 */
export function onEnterKey(params: { input: HTMLInputElement; onEnter: () => void }): void {
  const { input, onEnter } = params;
  input.addEventListener('keydown', (event) => {
    if (event.key === ENTER_KEY && !event.isComposing) {
      event.preventDefault();
      onEnter();
    }
  });
}
