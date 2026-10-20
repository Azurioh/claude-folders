import type { ConversationId, ProjectFolders } from '@/features/folders/domain/folders.model';
import { renameConversation } from '@/features/folders/domain/folders.operations';

/**
 * Names the filed conversations that still carry the placeholder title (filed before claude.ai
 * generated their title, e.g. a new session filed from its project page) with the title claude.ai
 * now shows. The tree cannot tell a default title from one the user typed, so only titles equal to
 * the placeholder are replaced; any other title, renamed by the user or not, is kept.
 * @param params.state - The project.
 * @param params.placeholder - The title given to conversations filed without one ("Untitled").
 * @param params.titleOf - The title claude.ai shows for a conversation, or `null` when it shows
 *   none; blank titles and the placeholder itself are ignored.
 * @returns The renamed project, or `null` when no conversation changed.
 */
export function nameUntitledConversations(params: {
  state: ProjectFolders;
  placeholder: string;
  titleOf: (conversationId: ConversationId) => string | null;
}): ProjectFolders | null {
  const { placeholder, titleOf } = params;
  let state = params.state;
  let changed = false;
  for (const [conversationId, conversation] of Object.entries(params.state.conversations)) {
    const title = conversation.title === placeholder ? titleOf(conversationId)?.trim() : undefined;
    const renamed =
      title === undefined || title === '' || title === placeholder
        ? null
        : renameConversation({ state, conversationId, title });
    if (renamed?.ok === true) {
      state = renamed.state;
      changed = true;
    }
  }
  return changed ? state : null;
}
