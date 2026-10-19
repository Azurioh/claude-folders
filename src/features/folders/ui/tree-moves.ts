/**
 * Moves shared by drag and drop and the "Move to…" panel. Each one reveals its destination (the
 * folder and its ancestors are opened), so the moved row stays visible and can take focus back.
 */
import {
  type ConversationId,
  type FolderId,
  getFolder,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
import {
  fileConversation,
  moveFolder,
  type OperationResult,
  openFolder,
  unfileConversation,
} from '@/features/folders/domain/folders.operations';

/** A pure update of a project's tree, for `ProjectFoldersStore.apply`. */
export type TreeOperation = (state: ProjectFolders) => OperationResult;

function revealed(params: { result: OperationResult; folderId: FolderId | null }): OperationResult {
  if (!params.result.ok) {
    return params.result;
  }
  let { state } = params.result;
  const visited = new Set<FolderId>();
  for (
    let current = params.folderId;
    current !== null && !visited.has(current);
    current = getFolder({ state, folderId: current })?.parentId ?? null
  ) {
    visited.add(current);
    const opened = openFolder({ state, folderId: current });
    if (!opened.ok) {
      return opened;
    }
    state = opened.state;
  }
  return { ok: true, state };
}

/**
 * Files a conversation in a folder (or moves it there) and reveals that folder.
 * @param params.state - The project to update.
 * @param params.conversationId - The conversation to file.
 * @param params.folderId - The destination folder.
 * @param params.title - The title to store, or `null` to keep the stored one.
 * @param params.fallbackTitle - The title used when there is neither.
 * @returns The updated project, or `folder-not-found`.
 */
export function fileInFolder(params: {
  state: ProjectFolders;
  conversationId: ConversationId;
  folderId: FolderId;
  title: string | null;
  fallbackTitle: string;
}): OperationResult {
  const { state, conversationId, folderId, title, fallbackTitle } = params;
  const filed = fileConversation({
    state,
    conversationId,
    folderId,
    fallbackTitle,
    ...(title === null ? {} : { title }),
  });
  return revealed({ result: filed, folderId });
}

/**
 * Puts a conversation in a folder, or takes it out of its folder when the destination is the root.
 * @param params.state - The project to update.
 * @param params.conversationId - The conversation to place.
 * @param params.folderId - The destination folder, or `null` to unfile it.
 * @param params.title - The title to store, or `null` to keep the stored one.
 * @param params.fallbackTitle - The title used when there is neither.
 * @returns The updated project, or `folder-not-found` / `conversation-not-found`.
 */
export function placeConversation(params: {
  state: ProjectFolders;
  conversationId: ConversationId;
  folderId: FolderId | null;
  title: string | null;
  fallbackTitle: string;
}): OperationResult {
  const { folderId, ...rest } = params;
  if (folderId === null) {
    return unfileConversation({ state: rest.state, conversationId: rest.conversationId });
  }
  return fileInFolder({ ...rest, folderId });
}

/**
 * Moves a folder under another folder, or to the root, and reveals the new parent.
 * @param params.state - The project to update.
 * @param params.folderId - The folder to move.
 * @param params.targetParentId - The new parent, or `null` for the root.
 * @returns The updated project, `folder-not-found`, or `invalid-move` for the folder itself or one
 *   of its descendants.
 */
export function moveFolderInto(params: {
  state: ProjectFolders;
  folderId: FolderId;
  targetParentId: FolderId | null;
}): OperationResult {
  return revealed({ result: moveFolder(params), folderId: params.targetParentId });
}
