import { createElement } from '@/features/folders/ui/element';

/** Look of a status message: neutral news or a failure. */
export type StatusTone = 'info' | 'error';

/**
 * Builds a settings section: a heading, an optional description and the section's content.
 * @param params.document - The owner document.
 * @param params.id - The heading id, naming the section for assistive technologies.
 * @param params.title - The heading text.
 * @param params.description - The explanation under the heading, or `null`.
 * @param params.danger - Whether the section holds destructive actions (red accent).
 * @param params.children - The section's controls.
 * @returns The section element.
 */
export function createSection(params: {
  document: Document;
  id: string;
  title: string;
  description: string | null;
  danger: boolean;
  children: readonly Node[];
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
    tag: 'section',
    className: params.danger ? 'nfc-card nfc-card-danger' : 'nfc-card',
    attributes: { 'aria-labelledby': id },
    children: [heading, ...intro, ...params.children],
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
 * Builds the header of an extension page: its title and a short line under or beside it.
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
        tag: 'h1',
        className: 'nfc-title',
        attributes: { id: params.titleId },
        children: [params.title],
      }),
      createElement({ document, tag: 'p', className: 'nfc-subtitle', children: [params.subtitle] }),
    ],
  });
}
