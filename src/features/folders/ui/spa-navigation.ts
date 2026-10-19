import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';

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
