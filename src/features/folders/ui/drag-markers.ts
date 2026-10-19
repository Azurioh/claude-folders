/**
 * The attributes the views put on drag sources and drop targets, and how drag and drop reads them
 * back from the node under the pointer.
 */
import type { ConversationId, FolderId } from '@/features/folders/domain/folders.model';

const DRAGGABLE_ATTRIBUTES = { draggable: 'true' } as const;
const DRAG_FOLDER_ATTRIBUTE = 'data-nfc-drag-folder';
const DRAG_CONVERSATION_ATTRIBUTE = 'data-nfc-drag-conversation';
const DROP_TARGET_ATTRIBUTE = 'data-nfc-drop';
/** Value of `DROP_TARGET_ATTRIBUTE` on the section header, the drop target of the root. */
const ROOT_DROP_VALUE = '';
const DRAG_SOURCE_SELECTOR = `[${DRAG_FOLDER_ATTRIBUTE}], [${DRAG_CONVERSATION_ATTRIBUTE}]`;
const DROP_TARGET_SELECTOR = `[${DROP_TARGET_ATTRIBUTE}]`;

/** A row of ours being dragged. */
export type DragSource =
  | { readonly kind: 'folder'; readonly folderId: FolderId }
  | { readonly kind: 'conversation'; readonly conversationId: ConversationId };

/** Where something is dropped: a folder row, or the section header for the root. */
export interface DropTarget {
  readonly element: HTMLElement;
  readonly folderId: FolderId | null;
}

/**
 * Attributes of a folder row: a drag source, and a drop target filing into that folder.
 * @param folderId - The folder of the row.
 * @returns The attributes, for `createElement`.
 */
export function folderRowDragAttributes(folderId: FolderId): Record<string, string> {
  return {
    ...DRAGGABLE_ATTRIBUTES,
    [DRAG_FOLDER_ATTRIBUTE]: folderId,
    [DROP_TARGET_ATTRIBUTE]: folderId,
  };
}

/**
 * Attributes of a conversation row: a drag source.
 * @param conversationId - The conversation of the row.
 * @returns The attributes, for `createElement`.
 */
export function conversationRowDragAttributes(
  conversationId: ConversationId,
): Record<string, string> {
  return { ...DRAGGABLE_ATTRIBUTES, [DRAG_CONVERSATION_ATTRIBUTE]: conversationId };
}

/**
 * Attributes of a section header: the drop target of the root (a folder moves to the top level,
 * a conversation leaves its folder).
 * @returns The attributes, for `createElement`.
 */
export function rootDropAttributes(): Record<string, string> {
  return { [DROP_TARGET_ATTRIBUTE]: ROOT_DROP_VALUE };
}

/**
 * Finds the row of ours a drag started on.
 * @param element - The node the `dragstart` was fired on.
 * @returns The dragged row, or `null` when the node is not inside one.
 */
export function findDragSource(element: Element): DragSource | null {
  const source = element.closest(DRAG_SOURCE_SELECTOR);
  const folderId = source?.getAttribute(DRAG_FOLDER_ATTRIBUTE) ?? null;
  if (folderId !== null) {
    return { kind: 'folder', folderId };
  }
  const conversationId = source?.getAttribute(DRAG_CONVERSATION_ATTRIBUTE) ?? null;
  return conversationId === null ? null : { kind: 'conversation', conversationId };
}

/**
 * Finds the drop target under the pointer.
 * @param element - The node a `dragover` or `drop` was fired on.
 * @returns The target, or `null` when the node is not inside one.
 */
export function findDropTarget(element: Element): DropTarget | null {
  const target = element.closest<HTMLElement>(DROP_TARGET_SELECTOR);
  const value = target?.getAttribute(DROP_TARGET_ATTRIBUTE) ?? null;
  if (target === null || value === null) {
    return null;
  }
  return { element: target, folderId: value === ROOT_DROP_VALUE ? null : value };
}
