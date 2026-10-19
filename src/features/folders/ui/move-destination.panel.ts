import { i18n } from '#i18n';
import { createElement } from '@/features/folders/ui/element';
import type {
  PanelContent,
  PanelControls,
  PanelRender,
} from '@/features/folders/ui/floating-panel';
import { createIcon } from '@/features/folders/ui/icons';
import type { MoveDestination } from '@/features/folders/ui/move-destinations';
import { createFilterField, filterQueryOf } from '@/features/folders/ui/panel-controls';

const FILTER_FIELD_ID = 'nfc-move-filter';
const ITEM_ICON_SIZE = 14;

/**
 * The "Move to…" picker: a filter field over the destinations, each one a button. Choosing one
 * reports it and closes the panel; the current location is marked by text and an icon, not only
 * by style, and `aria-current`.
 */
class MoveDestinationPicker {
  private readonly document: Document;
  private readonly destinations: readonly MoveDestination[];
  private readonly onChoose: (destination: MoveDestination) => void;
  private readonly controls: PanelControls;
  private readonly filter: HTMLInputElement;
  private readonly list: HTMLElement;
  private readonly empty: HTMLElement;

  constructor(params: {
    document: Document;
    destinations: readonly MoveDestination[];
    onChoose: (destination: MoveDestination) => void;
    controls: PanelControls;
  }) {
    const { document } = params;
    this.document = document;
    this.destinations = params.destinations;
    this.onChoose = params.onChoose;
    this.controls = params.controls;
    this.filter = createFilterField({
      document,
      id: FILTER_FIELD_ID,
      label: i18n.t('fieldFilterFolders'),
    });
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
    return { body: [this.filter, this.list, this.empty], initialFocus: this.filter };
  }

  private fill(): void {
    const query = filterQueryOf(this.filter);
    const shown = this.destinations.filter((destination) =>
      destination.label.toLocaleLowerCase().includes(query),
    );
    this.list.replaceChildren(...shown.map((destination) => this.item(destination)));
    this.list.hidden = shown.length === 0;
    this.empty.textContent = shown.length === 0 ? i18n.t('moveEmpty') : '';
  }

  private item(destination: MoveDestination): HTMLButtonElement {
    const { document } = this;
    const button = createElement({
      document,
      tag: 'button',
      className: 'nfc-adder-item nfc-move-item',
      attributes: { type: 'button' },
      children: [
        createIcon({
          document,
          name: destination.current ? 'check' : 'folder',
          size: ITEM_ICON_SIZE,
          className: 'nfc-adder-icon',
        }),
        createElement({
          document,
          tag: 'span',
          className: 'nfc-adder-title',
          children: [destination.label],
        }),
        ...this.currentMark(destination),
      ],
    });
    if (destination.current) {
      button.setAttribute('aria-current', 'true');
    }
    button.addEventListener('click', () => {
      this.onChoose(destination);
      this.controls.close();
    });
    return button;
  }

  private currentMark(destination: MoveDestination): HTMLElement[] {
    if (!destination.current) {
      return [];
    }
    return [
      createElement({
        document: this.document,
        tag: 'span',
        className: 'nfc-move-current',
        children: [i18n.t('moveCurrentLocation')],
      }),
    ];
  }
}

/**
 * Builds the content of the "Move to…" panel, the keyboard and single-pointer alternative to
 * dragging a folder or a conversation: a filter field (focused) and the destinations as buttons.
 * @param params.document - The owner document.
 * @param params.destinations - Where the subject can go, the current location marked.
 * @param params.onChoose - Called with the chosen destination, before the panel closes.
 * @returns The panel content builder, for `FloatingPanels.open`.
 */
export function moveDestinationPanel(params: {
  document: Document;
  destinations: readonly MoveDestination[];
  onChoose: (destination: MoveDestination) => void;
}): PanelRender {
  return (controls) => new MoveDestinationPicker({ ...params, controls }).build();
}
