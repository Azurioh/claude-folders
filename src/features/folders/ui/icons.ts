const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const VIEW_BOX = '0 0 24 24';
const STROKE_WIDTH = '1.75';

/** Lucide-style 24x24 stroke paths. */
const ICON_PATHS = {
  folder:
    'M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z',
  chevron: 'm9 18 6-6-6-6',
} as const;

type IconName = keyof typeof ICON_PATHS;

/**
 * Builds a decorative stroke icon, hidden from assistive technologies.
 * @param params.document - The document that owns the icon.
 * @param params.name - The icon to draw.
 * @param params.size - Width and height in pixels.
 * @param params.className - Classes added after `nfc-icon`.
 * @returns The `svg` element.
 */
export function createIcon(params: {
  document: Document;
  name: IconName;
  size: number;
  className: string;
}): SVGSVGElement {
  const { document, name, size, className } = params;
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const attributes: Record<string, string> = {
    class: `nfc-icon ${className}`,
    width: String(size),
    height: String(size),
    viewBox: VIEW_BOX,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': STROKE_WIDTH,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
  for (const [attribute, value] of Object.entries(attributes)) {
    svg.setAttribute(attribute, value);
  }
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  svg.append(path);
  return svg;
}
