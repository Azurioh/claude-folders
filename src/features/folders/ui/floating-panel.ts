import { createElement } from '@/features/folders/ui/element';
import { panelPosition } from '@/features/folders/ui/panel-position';
import { panelThemeOf } from '@/features/folders/ui/panel-theme';

const PANEL_CLASS = 'nfc-panel';
/** Only one panel is open at a time, so its title id is unique within the panel layer. */
const TITLE_ID = 'nfc-panel-title';
const ESCAPE_KEY = 'Escape';

/** What the content of a panel can do with the panel it is rendered in. */
export interface PanelControls {
  /** Closes the panel once its task is done, giving focus back to where it was opened from. */
  close(): void;
}

/** The content of a panel and the control focused when it opens. */
export interface PanelContent {
  readonly body: readonly Node[];
  readonly initialFocus: HTMLElement;
}

/** Builds the content of a panel, given the controls of that panel. */
export type PanelRender = (controls: PanelControls) => PanelContent;

interface OpenPanel {
  readonly element: HTMLElement;
  readonly restoreFocus: () => void;
  readonly onPointerDown: (event: PointerEvent) => void;
}

/**
 * Paints a floating element like the page around its anchor: the anchor's first opaque
 * background, text color and font (`panel-theme.ts`).
 * @param params.element - The floating element.
 * @param params.anchor - The page element it is shown next to.
 */
export function applyAnchorTheme(params: { element: HTMLElement; anchor: HTMLElement }): void {
  const { element, anchor } = params;
  const theme = panelThemeOf(anchor);
  element.style.backgroundColor = theme.background;
  element.style.color = theme.color;
  element.style.fontFamily = theme.fontFamily;
}

/**
 * Places a rendered, fixed-position floating element under its anchor, or above it when there is
 * no room below, inside the viewport (`panel-position.ts`).
 * @param params.element - The floating element, already in the document.
 * @param params.anchor - The page element it is shown next to.
 */
export function placeNextToAnchor(params: { element: HTMLElement; anchor: HTMLElement }): void {
  const { element, anchor } = params;
  const view = anchor.ownerDocument.defaultView ?? window;
  const placement = panelPosition({
    anchor: anchor.getBoundingClientRect(),
    panel: element.getBoundingClientRect(),
    viewport: { width: view.innerWidth, height: view.innerHeight },
  });
  element.style.top = `${placement.top}px`;
  element.style.left = `${placement.left}px`;
}

/**
 * The floating panels (editors, confirmations, pickers) of the folders UI: non-modal dialogs
 * rendered in a layer isolated from claude.ai's styles (a container inside a shadow root),
 * positioned under the control that opened them and themed like the page around it.
 *
 * One panel is open at a time. It closes on Escape and when its content is done (focus goes back
 * through `restoreFocus`), on a pointer press outside of it (focus stays where the user pressed)
 * and when another panel opens.
 */
export class FloatingPanels {
  private readonly layer: HTMLElement;
  private current: OpenPanel | null = null;

  /** @param layer - Where panels are rendered, inside a shadow root. */
  constructor(layer: HTMLElement) {
    this.layer = layer;
  }

  /**
   * Opens a panel, closing the one already open.
   * @param params.anchor - The control the panel is opened from; it is placed under it.
   * @param params.title - The visible title, which also names the dialog.
   * @param params.render - Builds the content, given the controls of the new panel.
   * @param params.restoreFocus - Gives focus back once the panel is dismissed or done; the anchor
   *   may have been rendered again meanwhile, so the caller knows best where focus goes.
   */
  open(params: {
    anchor: HTMLElement;
    title: string;
    render: PanelRender;
    restoreFocus: () => void;
  }): void {
    this.close();
    const { anchor, title, render, restoreFocus } = params;
    const document = this.layer.ownerDocument;
    const element = createElement({
      document,
      tag: 'div',
      className: PANEL_CLASS,
      attributes: { role: 'dialog', 'aria-labelledby': TITLE_ID },
      children: [
        createElement({
          document,
          tag: 'div',
          className: 'nfc-panel-title',
          attributes: { id: TITLE_ID },
          children: [title],
        }),
      ],
    });
    const panel: OpenPanel = {
      element,
      restoreFocus,
      onPointerDown: (event) => {
        if (!event.composedPath().includes(element)) {
          this.dismiss({ panel, restore: false });
        }
      },
    };
    const content = render({
      close: () => {
        this.dismiss({ panel, restore: true });
      },
    });
    element.append(...content.body);
    element.addEventListener('keydown', (event) => {
      if (event.key === ESCAPE_KEY) {
        event.preventDefault();
        event.stopPropagation();
        this.dismiss({ panel, restore: true });
      }
    });
    applyAnchorTheme({ element, anchor });
    this.layer.append(element);
    placeNextToAnchor({ element, anchor });
    document.addEventListener('pointerdown', panel.onPointerDown, true);
    this.current = panel;
    content.initialFocus.focus();
  }

  /** Closes the open panel, if any, without moving focus. */
  close(): void {
    if (this.current !== null) {
      this.dismiss({ panel: this.current, restore: false });
    }
  }

  private dismiss(params: { panel: OpenPanel; restore: boolean }): void {
    const { panel, restore } = params;
    if (this.current !== panel) {
      return;
    }
    this.current = null;
    this.layer.ownerDocument.removeEventListener('pointerdown', panel.onPointerDown, true);
    panel.element.remove();
    if (restore) {
      panel.restoreFocus();
    }
  }
}
