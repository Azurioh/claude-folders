import { createElement } from '@/features/folders/ui/element';

/** Size, in pixels, of the icon inside a popup button. */
export const BUTTON_ICON_SIZE = 16;

/** Size, in pixels, of the icon after a popup text link. */
export const LINK_ICON_SIZE = 12;

/** Look of a status message: neutral news or a failure. */
export type StatusTone = 'info' | 'error';

/** The logo, served from the extension root; the 96px file keeps it crisp on HiDPI screens. */
const LOGO_SOURCE = '/icon-48.png';
const LOGO_SOURCE_SET = '/icon-48.png 1x, /icon-96.png 2x';
const LOGO_SIZE = '36';

/**
 * Builds the heading block of a section: its title and an optional one-line explanation.
 * @param params.document - The owner document.
 * @param params.id - The heading id, naming the section for assistive technologies.
 * @param params.title - The heading text.
 * @param params.description - The explanation under the heading, or `null`.
 * @returns The heading block.
 */
export function createSectionHeading(params: {
  document: Document;
  id: string;
  title: string;
  description: string | null;
}): HTMLElement {
  const { document, id, title, description } = params;
  const heading = createElement({
    document,
    tag: 'h2',
    className: 'nfc-section-title',
    attributes: { id },
    children: [title],
  });
  const intro =
    description === null
      ? []
      : [createElement({ document, tag: 'p', className: 'nfc-muted', children: [description] })];
  return createElement({
    document,
    tag: 'div',
    className: 'nfc-section-heading',
    children: [heading, ...intro],
  });
}

/**
 * Builds a settings section: a card named by its heading block and holding the section's content.
 * @param params.document - The owner document.
 * @param params.id - The heading id, naming the section for assistive technologies.
 * @param params.className - Classes added after `nfc-card`, or an empty string.
 * @param params.children - The heading block and the section's controls.
 * @returns The section element.
 */
export function createSection(params: {
  document: Document;
  id: string;
  className: string;
  children: readonly Node[];
}): HTMLElement {
  return createElement({
    document: params.document,
    tag: 'section',
    className: `nfc-card ${params.className}`.trim(),
    attributes: { 'aria-labelledby': params.id },
    children: params.children,
  });
}

/**
 * Builds the polite live region a section reports the outcome of its actions in.
 * @param document - The owner document.
 * @returns The empty region.
 */
export function createStatus(document: Document): HTMLElement {
  return createElement({
    document,
    tag: 'p',
    className: 'nfc-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
}

/**
 * Shows a message in a status region.
 * @param params.status - The region built by {@link createStatus}.
 * @param params.text - The message; an empty string clears it.
 * @param params.tone - Its look.
 */
export function setStatus(params: { status: HTMLElement; text: string; tone: StatusTone }): void {
  params.status.textContent = params.text;
  params.status.dataset.tone = params.tone;
}

/**
 * Builds the row holding a section's buttons; it wraps on narrow screens.
 * @param params.document - The owner document.
 * @param params.children - The buttons, in display order.
 * @returns The row.
 */
export function createActions(params: {
  document: Document;
  children: readonly Node[];
}): HTMLElement {
  return createElement({
    document: params.document,
    tag: 'div',
    className: 'nfc-actions',
    children: params.children,
  });
}

/**
 * Builds the header of an extension page: the logo, its title and a short line beside it.
 * @param params.document - The owner document.
 * @param params.titleId - The `h1` id, for `aria-labelledby`.
 * @param params.title - The `h1` text.
 * @param params.subtitle - The secondary text (version, explanation).
 * @returns The header.
 */
export function createHeader(params: {
  document: Document;
  titleId: string;
  title: string;
  subtitle: string;
}): HTMLElement {
  const { document } = params;
  return createElement({
    document,
    tag: 'header',
    className: 'nfc-header',
    children: [
      createElement({
        document,
        tag: 'img',
        className: 'nfc-logo',
        attributes: {
          src: LOGO_SOURCE,
          srcset: LOGO_SOURCE_SET,
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          alt: '',
        },
      }),
      createElement({
        document,
        tag: 'div',
        className: 'nfc-header-text',
        children: [
          createElement({
            document,
            tag: 'h1',
            className: 'nfc-title',
            attributes: { id: params.titleId },
            children: [params.title],
          }),
          createElement({
            document,
            tag: 'p',
            className: 'nfc-subtitle',
            children: [params.subtitle],
          }),
        ],
      }),
    ],
  });
}
