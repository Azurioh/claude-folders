import { getConversation, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks, rowOf } from '@/shared/claude-dom/native-links';

/** Set on the native row of a filed conversation to hide it. */
const HIDDEN_ATTRIBUTE = 'data-nfc-hidden';
/** Set on the native link of a filed conversation to dim it. */
const FILED_ATTRIBUTE = 'data-nfc-filed';

function isFiled(params: { state: ProjectFolders; link: Element }): boolean {
  const conversationId = chatIdOf(params.link);
  return (
    conversationId !== null &&
    getConversation({ state: params.state, conversationId }) !== undefined
  );
}

/**
 * Marks the filed conversations of one native list: their row is hidden when `hideFiled` is on,
 * their link dimmed otherwise. Conversations that are not filed lose any previous mark.
 * @param params.list - A native conversation list next to which a folders section is shown.
 * @param params.state - The project the list belongs to.
 * @param params.hideFiled - Whether filed conversations are hidden rather than dimmed.
 */
export function markFiled(params: {
  list: ParentNode;
  state: ProjectFolders;
  hideFiled: boolean;
}): void {
  const { list, state, hideFiled } = params;
  for (const link of nativeChatLinks(list)) {
    const filed = isFiled({ state, link });
    rowOf(link).toggleAttribute(HIDDEN_ATTRIBUTE, filed && hideFiled);
    link.toggleAttribute(FILED_ATTRIBUTE, filed && !hideFiled);
  }
}

/**
 * Removes every mark set by {@link markFiled}.
 * @param root - Where to remove them, e.g. the document.
 */
export function clearFiledMarks(root: ParentNode): void {
  for (const element of root.querySelectorAll(`[${HIDDEN_ATTRIBUTE}], [${FILED_ATTRIBUTE}]`)) {
    element.removeAttribute(HIDDEN_ATTRIBUTE);
    element.removeAttribute(FILED_ATTRIBUTE);
  }
}
