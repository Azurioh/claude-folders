import { chatIdOf, projectIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks, nativeProjectLinks } from '@/shared/claude-dom/native-links';

const PRIMARY_BUTTON = 0;

function opensElsewhere(event: MouseEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== PRIMARY_BUTTON
  );
}

/**
 * Opens a conversation the way claude.ai does: a plain click on one of the extension's links is
 * replaced by a click on claude.ai's own link to the same conversation, so its router navigates
 * without reloading the page. Modified clicks (new tab or window) and conversations claude.ai
 * does not list keep the default link behaviour.
 * @param params.root - Where claude.ai's links are searched, e.g. the document.
 * @param params.conversationId - The conversation to open.
 * @param params.event - The click on the extension's link.
 */
export function openThroughNativeLink(params: {
  root: ParentNode;
  conversationId: string;
  event: MouseEvent;
}): void {
  const { root, conversationId, event } = params;
  if (opensElsewhere(event)) {
    return;
  }
  const native = nativeChatLinks(root).find((link) => chatIdOf(link) === conversationId);
  if (native === undefined) {
    return;
  }
  event.preventDefault();
  native.click();
}

/**
 * Opens a project page the way claude.ai does: a click on claude.ai's own link to the project, so
 * its router navigates without reloading the page and the content script keeps what it holds in
 * memory. When claude.ai shows no link to the project, the page is loaded instead.
 * @param params.root - Where claude.ai's links are searched, e.g. the document.
 * @param params.projectId - The project to open.
 * @param params.assign - Loads a URL, e.g. `location.assign`.
 * @returns `true` when claude.ai's router navigates, `false` when the page is loaded.
 */
export function openProjectPage(params: {
  root: ParentNode;
  projectId: string;
  assign: (url: string) => void;
}): boolean {
  const { root, projectId, assign } = params;
  const native = nativeProjectLinks(root).find((link) => projectIdOf(link) === projectId);
  if (native === undefined) {
    assign(`/project/${projectId}`);
    return false;
  }
  native.click();
  return true;
}
