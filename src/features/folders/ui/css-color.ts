/** `name(arguments)`: every functional color syntax (`rgb`, `oklch`, `color`, `lab`…). */
const FUNCTION_PATTERN = /^([a-z-]+)\((.*)\)$/;
/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. */
const HEX_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
/** Separators between the channels of a color function. */
const CHANNEL_SEPARATOR_PATTERN = /[\s,/]+/;
const TRANSPARENT_KEYWORD = 'transparent';
/** CSS `none`: a missing component, which counts as zero. */
const NONE_KEYWORD = 'none';
const ALPHA_SEPARATOR = '/';
const LEGACY_SEPARATOR = ',';
const PERCENT_SUFFIX = '%';
const PERCENT_SCALE = 100;
const RGB_MAX = 255;
const HEX_RADIX = 16;
const SHORT_HEX_WITH_ALPHA_LENGTH = 5;
const LONG_HEX_WITH_ALPHA_LENGTH = 9;
const LEGACY_CHANNEL_COUNT = 3;
const LEGACY_CHANNEL_WITH_ALPHA_COUNT = 4;
const RGB_FUNCTIONS: readonly string[] = ['rgb', 'rgba'];

function clampAlpha(alpha: number): number {
  return Math.min(1, Math.max(0, alpha));
}

/** Reads a number or percentage component scaled to `scale` at 100%; `none` is 0. */
function componentOf(params: { token: string; scale: number }): number | null {
  const token = params.token.trim();
  if (token === NONE_KEYWORD) {
    return 0;
  }
  const percent = token.endsWith(PERCENT_SUFFIX);
  const number = Number(percent ? token.slice(0, -PERCENT_SUFFIX.length) : token);
  if (token === '' || Number.isNaN(number)) {
    return null;
  }
  return percent ? (number / PERCENT_SCALE) * params.scale : number;
}

function alphaComponentOf(token: string): number | null {
  const alpha = componentOf({ token, scale: 1 });
  return alpha === null ? null : clampAlpha(alpha);
}

function hexAlphaOf(hex: string): number {
  if (hex.length === SHORT_HEX_WITH_ALPHA_LENGTH) {
    return Number.parseInt(hex.slice(-1).repeat(2), HEX_RADIX) / RGB_MAX;
  }
  if (hex.length === LONG_HEX_WITH_ALPHA_LENGTH) {
    return Number.parseInt(hex.slice(-2), HEX_RADIX) / RGB_MAX;
  }
  return 1;
}

function legacyAlphaOf(argumentsText: string): number | null {
  const parts = argumentsText.split(LEGACY_SEPARATOR);
  if (parts.length === LEGACY_CHANNEL_COUNT) {
    return 1;
  }
  const alpha = parts[LEGACY_CHANNEL_WITH_ALPHA_COUNT - 1];
  return parts.length === LEGACY_CHANNEL_WITH_ALPHA_COUNT && alpha !== undefined
    ? alphaComponentOf(alpha)
    : null;
}

function functionalAlphaOf(argumentsText: string): number | null {
  if (argumentsText.includes(ALPHA_SEPARATOR)) {
    return alphaComponentOf(argumentsText.slice(argumentsText.lastIndexOf(ALPHA_SEPARATOR) + 1));
  }
  if (argumentsText.includes(LEGACY_SEPARATOR)) {
    return legacyAlphaOf(argumentsText);
  }
  return argumentsText.trim() === '' ? null : 1;
}

/**
 * Reads the alpha channel of a CSS color as `getComputedStyle` returns it, in any syntax:
 * `transparent`, hex, legacy comma functions (`rgba(r, g, b, a)`) and modern space functions with
 * an optional `/ alpha` (`rgb`, `hsl`, `oklch`, `oklab`, `lab`, `lch`, `color(srgb …)`). Alpha
 * may be a number, a percentage or `none` (0); a color without alpha is opaque.
 * @param color - The color text.
 * @returns The alpha between 0 and 1, or `null` when the color cannot be read.
 */
export function alphaOf(color: string): number | null {
  const value = color.trim().toLowerCase();
  if (value === TRANSPARENT_KEYWORD) {
    return 0;
  }
  if (HEX_PATTERN.test(value)) {
    return hexAlphaOf(value);
  }
  const argumentsText = FUNCTION_PATTERN.exec(value)?.[2];
  return argumentsText === undefined ? null : functionalAlphaOf(argumentsText);
}

function channelTokensOf(argumentsText: string): string[] {
  return argumentsText.split(CHANNEL_SEPARATOR_PATTERN).filter((token) => token !== '');
}

/**
 * Reads the red, green and blue channels of an `rgb()` or `rgba()` color (comma or space syntax,
 * numbers or percentages, `none` as 0).
 * @param color - The color text.
 * @returns The channels between 0 and 255, or `null` for any other syntax.
 */
export function rgbChannelsOf(color: string): [number, number, number] | null {
  const match = FUNCTION_PATTERN.exec(color.trim().toLowerCase());
  if (match === null || !RGB_FUNCTIONS.includes(match[1] ?? '')) {
    return null;
  }
  const [red, green, blue] = channelTokensOf(match[2] ?? '')
    .slice(0, LEGACY_CHANNEL_COUNT)
    .map((token) => componentOf({ token, scale: RGB_MAX }));
  if (red === undefined || red === null || green === undefined || green === null) {
    return null;
  }
  if (blue === undefined || blue === null) {
    return null;
  }
  return [red, green, blue];
}
