import { chatIdOf, projectIdOf } from '@/shared/claude-dom/claude-ids';
import {
  CHAT_LINK_SELECTOR,
  OWN_UI_SELECTOR,
  PROJECT_LINK_SELECTOR,
  ROW_MAX_DEPTH,
} from '@/shared/claude-dom/selectors';

/**
 * Tells whether a node belongs to the extension's own UI (inside `OWN_UI_SELECTOR`).
 * @param node - The element to test.
 * @returns `true` when the element or one of its ancestors is the extension's UI root.
 */
export function isOwnUi(node: Element): boolean {
  return node.closest(OWN_UI_SELECTOR) !== null;
}

/**
 * Lists claude.ai's own conversation links, skipping the extension's UI and links without a
 * conversation id (e.g. `/chat/new`).
 * @param root - Where to search.
 * @returns The links in document order.
 */
export function nativeChatLinks(root: ParentNode): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>(CHAT_LINK_SELECTOR)].filter(
    (link) => !isOwnUi(link) && chatIdOf(link) !== null,
  );
}

/**
 * Lists claude.ai's own project links, skipping the extension's UI and links without a project id.
 * @param root - Where to search.
 * @returns The links in document order.
 */
export function nativeProjectLinks(root: ParentNode): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>(PROJECT_LINK_SELECTOR)].filter(
    (link) => !isOwnUi(link) && projectIdOf(link) !== null,
  );
}

function climbableParentOf(row: Element): Element | null {
  const parent = row.parentElement;
  if (parent === null || row.tagName === 'LI' || isOwnUi(parent)) {
    return null;
  }
  if (nativeChatLinks(parent).length > 1 || parent.querySelector(PROJECT_LINK_SELECTOR) !== null) {
    return null;
  }
  return parent;
}

/**
 * Finds the row of a conversation link: the largest ancestor (at most `ROW_MAX_DEPTH` levels up)
 * that still holds only this conversation. The climb stops at a list item, at the extension's UI,
 * and below any ancestor that holds another conversation or a project link.
 * @param link - A native conversation link.
 * @returns The row element; the link itself when no ancestor qualifies.
 */
export function rowOf(link: Element): Element {
  let row = link;
  for (
    let depth = 0, parent = climbableParentOf(row);
    depth < ROW_MAX_DEPTH && parent !== null;
    depth += 1, parent = climbableParentOf(row)
  ) {
    row = parent;
  }
  return row;
}
