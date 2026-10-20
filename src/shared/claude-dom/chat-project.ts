import { projectIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeProjectLinks } from '@/shared/claude-dom/native-links';
import { MAIN_SELECTOR } from '@/shared/claude-dom/selectors';

/**
 * Reads the project a chat page belongs to, from the project link of its header breadcrumb: the
 * only project link of the main area (the sidebar's project links are in an `aside` outside of
 * it, and a project page's main area holds none).
 * @param root - Where to search, e.g. the document.
 * @returns The lowercase project id, or `null` when the page shows no project (a chat outside any
 *   project, or a header not rendered yet).
 */
export function chatProjectId(root: ParentNode): string | null {
  const main = root.querySelector(MAIN_SELECTOR);
  const [link] = main === null ? [] : nativeProjectLinks(main);
  return link === undefined ? null : projectIdOf(link);
}
