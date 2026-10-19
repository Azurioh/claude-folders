import { createElement } from '@/features/folders/ui/element';
import { FOCUS_KEY_ATTRIBUTE } from '@/features/folders/ui/focus-key';
import { createIcon, type IconName } from '@/features/folders/ui/icons';

const ACTION_ICON_SIZE = 14;
/** Custom property telling the CSS how many actions a row reserves room for. */
const ACTION_COUNT_PROPERTY = '--nfc-actions';

/** A button shown at the end of a row: an icon with an accessible name. */
export interface RowAction {
  readonly icon: IconName;
  /** Accessible name, also shown as a tooltip. */
  readonly label: string;
  /** Focus key of the button, so focus can come back to it after a re-render. */
  readonly focusKey: string;
  /** Called with the button itself, which anchors the panel the action may open. */
  readonly onActivate: (button: HTMLButtonElement) => void;
}

/**
 * Makes a button run an action on click without letting the click reach the row or claude.ai
 * around it: no folder toggle, no navigation.
 * @param params.button - The action button.
 * @param params.onActivate - Called with the button on every click.
 */
export function onActionClick(params: {
  button: HTMLButtonElement;
  onActivate: (button: HTMLButtonElement) => void;
}): void {
  const { button, onActivate } = params;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate(button);
  });
}

function actionButton(params: { document: Document; action: RowAction }): HTMLButtonElement {
  const { document, action } = params;
  const button = createElement({
    document,
    tag: 'button',
    className: 'nfc-action',
    attributes: {
      type: 'button',
      'aria-label': action.label,
      title: action.label,
      [FOCUS_KEY_ATTRIBUTE]: action.focusKey,
    },
    children: [
      createIcon({
        document,
        name: action.icon,
        size: ACTION_ICON_SIZE,
        className: 'nfc-action-icon',
      }),
    ],
  });
  onActionClick({ button, onActivate: action.onActivate });
  return button;
}

/**
 * Wraps a row with its action buttons. The actions are siblings of the row, never inside it (a
 * row is itself a button or a link), and the CSS shows them on hover, on keyboard focus and
 * always on devices that cannot hover.
 * @param params.document - The owner document.
 * @param params.row - The row control.
 * @param params.actions - The actions, in display order.
 * @returns The `.nfc-item` wrapper.
 */
export function createRowItem(params: {
  document: Document;
  row: HTMLElement;
  actions: readonly RowAction[];
}): HTMLElement {
  const { document, row, actions } = params;
  const item = createElement({
    document,
    tag: 'div',
    className: 'nfc-item',
    children: [
      row,
      createElement({
        document,
        tag: 'span',
        className: 'nfc-actions',
        children: actions.map((action) => actionButton({ document, action })),
      }),
    ],
  });
  item.style.setProperty(ACTION_COUNT_PROPERTY, String(actions.length));
  return item;
}
