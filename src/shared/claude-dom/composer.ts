import { isOwnUi } from '@/shared/claude-dom/native-links';
import {
  COMPOSER_FRAME_SELECTOR,
  COMPOSER_SELECTOR,
  MAIN_SELECTOR,
} from '@/shared/claude-dom/selectors';

/** The message composer of a page. */
export interface Composer {
  /** The editable field, to focus. */
  readonly field: HTMLElement;
  /** The whole composer around it (field, attachments, send button), to place things next to. */
  readonly frame: HTMLElement;
}

/**
 * Finds the message composer of the page's main area: on a project page, the field that starts a
 * new session of that project.
 * @param root - Where to search, e.g. the document.
 * @returns The composer, or `null` when the page shows none (yet).
 */
export function findComposer(root: ParentNode): Composer | null {
  const main = root.querySelector(MAIN_SELECTOR);
  const field = main?.querySelector<HTMLElement>(COMPOSER_SELECTOR) ?? null;
  if (main === null || field === null || isOwnUi(field)) {
    return null;
  }
  const frame = field.closest<HTMLElement>(COMPOSER_FRAME_SELECTOR);
  return { field, frame: frame !== null && main.contains(frame) ? frame : field };
}
