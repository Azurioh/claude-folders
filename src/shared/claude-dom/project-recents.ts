import { currentProjectId } from '@/shared/claude-dom/claude-ids';
import { isOwnUi, nativeChatLinks } from '@/shared/claude-dom/native-links';
import {
  MAIN_SELECTOR,
  RECENTS_LABELS,
  RECENTS_LIST_MAX_DEPTH,
} from '@/shared/claude-dom/selectors';

/** The "Recents" block of a project page's main area. */
export interface ProjectRecents {
  /** Lowercase id of the project shown by the page. */
  readonly projectId: string;
  /** The "Recents" heading. */
  readonly heading: HTMLElement;
  /** The closest ancestor of the heading that holds the project's conversation links. */
  readonly list: HTMLElement;
}

function ownTextOf(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  }
  return text.trim();
}

function isRecentsHeading(element: HTMLElement): boolean {
  return !isOwnUi(element) && RECENTS_LABELS.includes(ownTextOf(element));
}

function findRecentsHeading(main: Element): HTMLElement | null {
  return [...main.querySelectorAll<HTMLElement>('*')].find(isRecentsHeading) ?? null;
}

function findListOf(params: { heading: HTMLElement; main: Element }): HTMLElement | null {
  const { heading, main } = params;
  let candidate = heading.parentElement;
  for (
    let depth = 0;
    depth < RECENTS_LIST_MAX_DEPTH &&
    candidate !== null &&
    candidate !== main &&
    nativeChatLinks(candidate).length === 0;
    depth += 1
  ) {
    candidate = candidate.parentElement;
  }
  if (candidate === null || !main.contains(candidate) || nativeChatLinks(candidate).length === 0) {
    return null;
  }
  return candidate;
}

/**
 * Finds the "Recents" block of a project page. Only the main landmark (`MAIN_SELECTOR`) is
 * searched, so the sidebar's own "Recents" group is never picked: the first element of the main
 * area whose own text is a `RECENTS_LABELS` entry is the heading, and the list is its closest
 * ancestor (at most `RECENTS_LIST_MAX_DEPTH` levels above its parent, never above the main area)
 * holding native conversation links.
 * @param params.root - The document (or a subtree containing the main area).
 * @param params.pathname - `location.pathname` of the page.
 * @returns The block, or `null` when the page is not a project page or no non-empty block exists.
 */
export function findProjectRecents(params: {
  root: ParentNode;
  pathname: string;
}): ProjectRecents | null {
  const { root, pathname } = params;
  const projectId = currentProjectId(pathname);
  if (projectId === null) {
    return null;
  }
  for (const main of root.querySelectorAll(MAIN_SELECTOR)) {
    const heading = findRecentsHeading(main);
    const list = heading === null ? null : findListOf({ heading, main });
    if (heading !== null && list !== null) {
      return { projectId, heading, list };
    }
  }
  return null;
}
