/** Gap between a panel and its anchor. */
const ANCHOR_GAP_PX = 6;
/** Smallest distance kept between a panel and the viewport edges. */
const VIEWPORT_MARGIN_PX = 8;

/** Viewport coordinates of the element a panel is opened from. */
export interface AnchorBox {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
}

/** A width and a height, in pixels. */
export interface BoxSize {
  readonly width: number;
  readonly height: number;
}

/** Viewport coordinates of a panel's top-left corner. */
export interface PanelPlacement {
  readonly top: number;
  readonly left: number;
}

function clamp(params: { value: number; min: number; max: number }): number {
  return Math.max(params.min, Math.min(params.value, params.max));
}

/**
 * Places a floating panel under its anchor, left edges aligned. The panel flips above the anchor
 * when it would overflow the bottom of the viewport, and is then clamped to stay at least 8px
 * inside every edge (the top and left edges win when the panel is larger than the viewport).
 * @param params.anchor - The anchor's viewport box.
 * @param params.panel - The panel's size.
 * @param params.viewport - The viewport's size.
 * @returns Where the panel's top-left corner goes, in viewport coordinates.
 */
export function panelPosition(params: {
  anchor: AnchorBox;
  panel: BoxSize;
  viewport: BoxSize;
}): PanelPlacement {
  const { anchor, panel, viewport } = params;
  const below = anchor.bottom + ANCHOR_GAP_PX;
  const fitsBelow = below + panel.height <= viewport.height - VIEWPORT_MARGIN_PX;
  const top = fitsBelow ? below : anchor.top - panel.height - ANCHOR_GAP_PX;
  return {
    top: clamp({
      value: top,
      min: VIEWPORT_MARGIN_PX,
      max: viewport.height - panel.height - VIEWPORT_MARGIN_PX,
    }),
    left: clamp({
      value: anchor.left,
      min: VIEWPORT_MARGIN_PX,
      max: viewport.width - panel.width - VIEWPORT_MARGIN_PX,
    }),
  };
}
