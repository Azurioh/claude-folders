import { alphaOf, rgbChannelsOf } from '@/features/folders/ui/css-color';

/** Panel background when nothing opaque is found and the page text is light (claude.ai dark). */
export const DARK_PANEL_BACKGROUND = '#262624';
/** Panel background when nothing opaque is found and the page text is dark (claude.ai light). */
export const LIGHT_PANEL_BACKGROUND = '#faf9f5';

const OPAQUE_ALPHA = 1;
const RGB_MAX = 255;
/** Relative luminance above which a text color is light, so it sits on a dark background. */
const LIGHT_TEXT_LUMINANCE = 0.5;
/** sRGB transfer function constants (WCAG relative luminance). */
const SRGB_LINEAR_LIMIT = 0.04045;
const SRGB_LINEAR_SCALE = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;

/** Colors and font a floating panel borrows from the page around its anchor. */
export interface PanelTheme {
  readonly background: string;
  readonly color: string;
  readonly fontFamily: string;
}

function isOpaque(color: string): boolean {
  return alphaOf(color) === OPAQUE_ALPHA;
}

function linearChannel(channel: number): number {
  const value = channel / RGB_MAX;
  return value <= SRGB_LINEAR_LIMIT
    ? value / SRGB_LINEAR_SCALE
    : ((value + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA;
}

function hasLightText(textColor: string): boolean {
  const channels = rgbChannelsOf(textColor);
  if (channels === null) {
    return true;
  }
  const luminance = channels.reduce(
    (total, channel, index) => total + linearChannel(channel) * (LUMINANCE_WEIGHTS[index] ?? 0),
    0,
  );
  return luminance > LIGHT_TEXT_LUMINANCE;
}

/**
 * Picks a background a panel can paint with full opacity: the first fully opaque color of a chain
 * of computed backgrounds (alpha exactly 1, in any CSS color syntax), else a constant matching the
 * text: dark behind light text (or unreadable text), light behind dark text.
 * @param params.backgrounds - Computed backgrounds, nearest first.
 * @param params.textColor - The computed text color the panel will use.
 * @returns An opaque background color.
 */
export function opaqueBackground(params: {
  backgrounds: readonly string[];
  textColor: string;
}): string {
  const opaque = params.backgrounds.find(isOpaque);
  if (opaque !== undefined) {
    return opaque;
  }
  return hasLightText(params.textColor) ? DARK_PANEL_BACKGROUND : LIGHT_PANEL_BACKGROUND;
}

function backgroundChainOf(params: { anchor: Element; view: Window }): string[] {
  const { anchor, view } = params;
  const { body, documentElement } = anchor.ownerDocument;
  const backgrounds: string[] = [];
  for (let node: Element | null = anchor; node !== null; node = node.parentElement) {
    backgrounds.push(view.getComputedStyle(node).backgroundColor);
  }
  for (const root of [body, documentElement]) {
    backgrounds.push(view.getComputedStyle(root).backgroundColor);
  }
  return backgrounds;
}

/**
 * Reads the look a floating panel copies so it matches claude.ai's current theme: the first fully
 * opaque background among the anchor and its ancestors (then `body`, then the root element; hover
 * and card tints are semi-transparent and skipped), and the anchor's text color and font family.
 * @param anchor - The element the panel is opened from.
 * @returns The panel theme; its background is always fully opaque.
 */
export function panelThemeOf(anchor: Element): PanelTheme {
  const view = anchor.ownerDocument.defaultView ?? window;
  const style = view.getComputedStyle(anchor);
  return {
    background: opaqueBackground({
      backgrounds: backgroundChainOf({ anchor, view }),
      textColor: style.color,
    }),
    color: style.color,
    fontFamily: style.fontFamily,
  };
}
