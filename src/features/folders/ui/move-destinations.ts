import {
  type ConversationId,
  type FolderId,
  getConversation,
  getFolder,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
import { childrenOf, isInside } from '@/features/folders/domain/folders.queries';

/** Separator between the folder names of a destination path. */
const PATH_SEPARATOR = ' / ';

/** What the "Move to…" panel moves. */
export type MoveSubject =
  | { readonly kind: 'folder'; readonly folderId: FolderId }
  | { readonly kind: 'conversation'; readonly conversationId: ConversationId };

/** A place the subject can be moved to. */
export interface MoveDestination {
  /** The destination folder, or `null` for the root. */
  readonly folderId: FolderId | null;
  /** The folder path, e.g. "Work / Specs", or the root label. */
  readonly label: string;
  /** Whether the subject is already there. */
  readonly current: boolean;
}

function currentParentOf(params: {
  state: ProjectFolders;
  subject: MoveSubject;
}): FolderId | null | undefined {
  const { state, subject } = params;
  if (subject.kind === 'folder') {
    return getFolder({ state, folderId: subject.folderId })?.parentId;
  }
  return getConversation({ state, conversationId: subject.conversationId })?.folderId;
}

function collectFolders(params: {
  state: ProjectFolders;
  parentId: FolderId | null;
  path: readonly string[];
  excluded: FolderId | null;
  collected: { folderId: FolderId; label: string }[];
}): void {
  const { state, parentId, path, excluded, collected } = params;
  for (const child of childrenOf({ state, parentId })) {
    if (child.kind === 'folder' && child.folder.id !== excluded) {
      const folderPath = [...path, child.folder.name];
      collected.push({ folderId: child.folder.id, label: folderPath.join(PATH_SEPARATOR) });
      collectFolders({ ...params, parentId: child.folder.id, path: folderPath });
    }
  }
}

/**
 * Lists where a folder or a filed conversation can be moved: the root first, then every folder in
 * tree order (sub-folders under their parent, by name), labelled with its path. A folder can never
 * go into itself or one of its descendants (the domain refuses it), so those are left out. The
 * place the subject already is is marked `current`.
 * @param params.state - The project.
 * @param params.subject - The folder or conversation to move.
 * @param params.rootLabel - The label of the root destination ("Top level", "No folder").
 * @returns The destinations; empty when the subject is not in the project.
 */
export function moveDestinations(params: {
  state: ProjectFolders;
  subject: MoveSubject;
  rootLabel: string;
}): MoveDestination[] {
  const { state, subject, rootLabel } = params;
  const parentId = currentParentOf({ state, subject });
  if (parentId === undefined) {
    return [];
  }
  const excluded = subject.kind === 'folder' ? subject.folderId : null;
  const collected: { folderId: FolderId; label: string }[] = [];
  collectFolders({ state, parentId: null, path: [], excluded, collected });
  return [
    { folderId: null, label: rootLabel, current: parentId === null },
    ...collected
      .filter(
        ({ folderId }) =>
          excluded === null || !isInside({ state, candidateId: folderId, ancestorId: excluded }),
      )
      .map(({ folderId, label }) => ({ folderId, label, current: folderId === parentId })),
  ];
}
