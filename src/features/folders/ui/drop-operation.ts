import {
  type ConversationId,
  type FolderId,
  getConversation,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import type { DragPayload } from '@/features/folders/ui/drag-payload';
import {
  moveFolderInto,
  placeConversation,
  type TreeOperation,
} from '@/features/folders/ui/tree-moves';

/** Where a payload is dropped: a folder of a project, or its root. */
export interface DropDestination {
  readonly projectId: ProjectId;
  readonly folderId: FolderId | null;
}

function nativeTitle(params: {
  state: ProjectFolders;
  conversationId: ConversationId;
  listedTitleOf: (conversationId: ConversationId) => string | null;
}): { title: string | null } | null {
  const { state, conversationId, listedTitleOf } = params;
  if (getConversation({ state, conversationId }) !== undefined) {
    return { title: null };
  }
  const listed = listedTitleOf(conversationId);
  if (listed === null) {
    return null;
  }
  return { title: listed === '' ? null : listed };
}

function candidateOperation(params: {
  payload: DragPayload;
  destination: DropDestination;
  state: ProjectFolders;
  listedTitleOf: (conversationId: ConversationId) => string | null;
  fallbackTitle: string;
}): TreeOperation | null {
  const { payload, destination, fallbackTitle } = params;
  const { folderId } = destination;
  if (payload.kind !== 'native' && payload.projectId !== destination.projectId) {
    return null;
  }
  if (payload.kind === 'folder') {
    return (state) =>
      moveFolderInto({ state, folderId: payload.folderId, targetParentId: folderId });
  }
  const { conversationId } = payload;
  const titled =
    payload.kind === 'native' ? nativeTitle({ ...params, conversationId }) : { title: null };
  if (titled === null) {
    return null;
  }
  return (state) =>
    placeConversation({ state, conversationId, folderId, title: titled.title, fallbackTitle });
}

/**
 * Decides what dropping a payload on a destination does. Rows of ours only move within their own
 * project. A native conversation is accepted only when it belongs to the destination's project:
 * shown in the native lists next to its sections, or already filed in it; it is titled from its
 * native row, unless already filed (its stored title is kept). A folder dropped into itself or a
 * descendant, or a conversation unfiled while not filed, is refused by the domain.
 * @param params.payload - What is dragged.
 * @param params.destination - Where it is dropped.
 * @param params.state - The destination project, as currently loaded.
 * @param params.listedTitleOf - The title of a conversation in the project's native lists, or
 *   `null` when they do not show it.
 * @param params.fallbackTitle - The title of a conversation whose row has none.
 * @returns The operation the drop applies, or `null` when the destination refuses the payload.
 */
export function dropOperation(params: {
  payload: DragPayload;
  destination: DropDestination;
  state: ProjectFolders;
  listedTitleOf: (conversationId: ConversationId) => string | null;
  fallbackTitle: string;
}): TreeOperation | null {
  const operation = candidateOperation(params);
  return operation?.(params.state).ok ? operation : null;
}
