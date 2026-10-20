import { i18n } from '#i18n';
import type { Folder } from '@/features/folders/domain/folders.model';
import { createElement } from '@/features/folders/ui/element';
import { applyAnchorTheme, placeNextToAnchor } from '@/features/folders/ui/floating-panel';
import { createIcon } from '@/features/folders/ui/icons';
import { onActionClick } from '@/features/folders/ui/row-actions';

const CHIP_CLASS = 'nfc-chip';
const ICON_SIZE = 14;

interface ShownChip {
  readonly element: HTMLElement;
  /** What the chip was built from; it is rebuilt only when one of them changes. */
  readonly key: string;
}

function chipKey(folder: Folder): string {
  return JSON.stringify([folder.id, folder.name, folder.emoji ?? null]);
}

function chipText(folder: Folder): string {
  const name = folder.emoji === undefined ? folder.name : `${folder.emoji} ${folder.name}`;
  return i18n.t('newSessionChip', [name]);
}

/**
 * The "Will be filed in <folder>" chip shown next to the composer while a new session is meant
 * for a folder. It renders in the panel layer (a container inside a shadow root, like the floating
 * panels), is placed under the composer (above it when there is no room) and copies its colors
 * and font, so it follows claude.ai's theme. Its × button cancels the filing.
 */
export class NewSessionChip {
  private readonly layer: HTMLElement;
  private shown: ShownChip | null = null;
  private anchor: HTMLElement | null = null;
  private readonly onViewportChange = (): void => {
    this.place();
  };

  /** @param layer - Where the chip is rendered, inside a shadow root. */
  constructor(layer: HTMLElement) {
    this.layer = layer;
  }

  /**
   * Shows the chip next to an anchor, or updates it: built again only when the folder's name or
   * emoji changed (so its button keeps focus), then themed and placed again.
   * @param params.anchor - The composer the chip is placed next to.
   * @param params.folder - The folder the new session is filed in.
   * @param params.onCancel - Called when the × button is pressed.
   */
  show(params: { anchor: HTMLElement; folder: Folder; onCancel: () => void }): void {
    const { anchor, folder, onCancel } = params;
    const key = chipKey(folder);
    const shown =
      this.shown?.key === key ? this.shown : { element: this.build({ folder, onCancel }), key };
    if (shown !== this.shown) {
      this.shown?.element.remove();
      this.shown = shown;
      this.layer.append(shown.element);
    }
    if (this.anchor === null) {
      const view = this.layer.ownerDocument.defaultView ?? window;
      view.addEventListener('scroll', this.onViewportChange, { capture: true, passive: true });
      view.addEventListener('resize', this.onViewportChange, { passive: true });
    }
    this.anchor = anchor;
    applyAnchorTheme({ element: shown.element, anchor });
    this.place();
  }

  /** Removes the chip, if shown. */
  hide(): void {
    if (this.anchor !== null) {
      const view = this.layer.ownerDocument.defaultView ?? window;
      view.removeEventListener('scroll', this.onViewportChange, { capture: true });
      view.removeEventListener('resize', this.onViewportChange);
    }
    this.shown?.element.remove();
    this.shown = null;
    this.anchor = null;
  }

  private build(params: { folder: Folder; onCancel: () => void }): HTMLElement {
    const { folder, onCancel } = params;
    const document = this.layer.ownerDocument;
    const visual =
      folder.emoji === undefined
        ? [createIcon({ document, name: 'folder', size: ICON_SIZE, className: 'nfc-chip-icon' })]
        : [];
    const cancel = createElement({
      document,
      tag: 'button',
      className: 'nfc-chip-cancel',
      attributes: {
        type: 'button',
        'aria-label': i18n.t('newSessionCancel', [folder.name]),
        title: i18n.t('newSessionCancel', [folder.name]),
      },
      children: [createIcon({ document, name: 'close', size: ICON_SIZE, className: '' })],
    });
    onActionClick({ button: cancel, onActivate: onCancel });
    return createElement({
      document,
      tag: 'div',
      className: CHIP_CLASS,
      attributes: { role: 'status' },
      children: [
        ...visual,
        createElement({
          document,
          tag: 'span',
          className: 'nfc-chip-text',
          children: [chipText(folder)],
        }),
        cancel,
      ],
    });
  }

  private place(): void {
    if (this.shown !== null && this.anchor !== null) {
      placeNextToAnchor({ element: this.shown.element, anchor: this.anchor });
    }
  }
}
