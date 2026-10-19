import type {
  ConversationId,
  FiledConversation,
  Folder,
  FolderId,
  ProjectFolders,
} from '@/features/folders/domain/folders.model';

export type FolderChild =
  | { readonly kind: 'folder'; readonly folder: Folder }
  | {
      readonly kind: 'conversation';
      readonly id: ConversationId;
      readonly conversation: FiledConversation;
    };

/**
 * Tells whether a folder is the ancestor itself or one of its descendants.
 * Tolerates corrupted data: a parent cycle ends the walk instead of looping.
 * @param params.state - The project to inspect.
 * @param params.candidateId - The folder to locate; `null` (the root) is inside nothing.
 * @param params.ancestorId - The folder that may contain the candidate.
 * @returns `true` when the candidate is the ancestor or nested under it.
 */
export function isInside(params: {
  state: ProjectFolders;
  candidateId: FolderId | null;
  ancestorId: FolderId;
}): boolean {
  const { state, candidateId, ancestorId } = params;
  const visited = new Set<FolderId>();
  for (
    let current = candidateId;
    current !== null && !visited.has(current);
    current = state.folders[current]?.parentId ?? null
  ) {
    if (current === ancestorId) {
      return true;
    }
    visited.add(current);
  }
  return false;
}

/**
 * Counts the conversations filed in a folder and in all of its descendants.
 * @param params.state - The project to inspect.
 * @param params.folderId - The folder whose subtree is counted.
 * @returns The number of conversations in the subtree; 0 for an unknown folder.
 */
export function countConversations(params: { state: ProjectFolders; folderId: FolderId }): number {
  const { state, folderId } = params;
  const subtree = new Set<FolderId>([folderId]);
  for (const queue = [folderId]; queue.length > 0; ) {
    const parentId = queue.pop();
    for (const folder of Object.values(state.folders)) {
      if (folder.parentId === parentId && !subtree.has(folder.id)) {
        subtree.add(folder.id);
        queue.push(folder.id);
      }
    }
  }
  return Object.values(state.conversations).filter((conversation) =>
    subtree.has(conversation.folderId),
  ).length;
}

function sortedSubFolders(params: {
  state: ProjectFolders;
  parentId: FolderId | null;
}): FolderChild[] {
  const folders = Object.values(params.state.folders).filter(
    (folder) => folder.parentId === params.parentId,
  );
  folders.sort((left, right) => left.name.localeCompare(right.name));
  return folders.map((folder) => ({ kind: 'folder', folder }));
}

function sortedConversations(params: { state: ProjectFolders; folderId: FolderId }): FolderChild[] {
  const entries = Object.entries(params.state.conversations).filter(
    ([, conversation]) => conversation.folderId === params.folderId,
  );
  entries.sort(([, left], [, right]) => left.title.localeCompare(right.title));
  return entries.map(([id, conversation]) => ({ kind: 'conversation', id, conversation }));
}

/**
 * Lists the direct children of a folder in display order: sub-folders sorted by name, then
 * conversations sorted by title. The root (`null`) lists folders only, since unfiled
 * conversations are not part of the tree.
 * @param params.state - The project to inspect.
 * @param params.parentId - The folder to list, or `null` for the root.
 * @returns The ordered children.
 */
export function childrenOf(params: {
  state: ProjectFolders;
  parentId: FolderId | null;
}): FolderChild[] {
  const { state, parentId } = params;
  const folders = sortedSubFolders({ state, parentId });
  if (parentId === null) {
    return folders;
  }
  return [...folders, ...sortedConversations({ state, folderId: parentId })];
}
