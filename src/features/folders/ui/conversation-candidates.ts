import {
  type ConversationId,
  getConversation,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { conversationTitle } from '@/shared/claude-dom/conversation-title';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';

/** A conversation shown by claude.ai that can be filed in a folder. */
export interface ConversationCandidate {
  readonly conversationId: ConversationId;
  readonly title: string;
}

/**
 * Lists the conversations claude.ai currently shows in some native lists that are not filed in a
 * project yet: in list order, each conversation once, with its clean title. Conversations whose
 * title cannot be read are skipped.
 * @param params.lists - The native conversation lists next to the project's folders sections.
 * @param params.state - The project.
 * @returns The candidates.
 */
export function unfiledCandidates(params: {
  lists: readonly ParentNode[];
  state: ProjectFolders;
}): ConversationCandidate[] {
  const { lists, state } = params;
  const candidates = new Map<ConversationId, ConversationCandidate>();
  for (const link of lists.flatMap((list) => nativeChatLinks(list))) {
    const conversationId = chatIdOf(link);
    if (
      conversationId === null ||
      candidates.has(conversationId) ||
      getConversation({ state, conversationId }) !== undefined
    ) {
      continue;
    }
    const title = conversationTitle(link);
    if (title !== '') {
      candidates.set(conversationId, { conversationId, title });
    }
  }
  return [...candidates.values()];
}
