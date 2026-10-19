import type { ConversationId, FolderId } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import { chatIdOfHref } from '@/shared/claude-dom/claude-ids';

/** Data type of a dragged folder row of ours. */
const FOLDER_MIME = 'application/x-nfc-folder';
/** Data type of a dragged conversation row of ours. */
const CONVERSATION_MIME = 'application/x-nfc-conversation';
/** URL formats a browser puts in the drag data of a link, in order of preference. */
const URL_MIMES = ['text/uri-list', 'text/plain'] as const;
const PROJECT_FIELD = 'project';
const ID_FIELD = 'id';

/** A dragged row of ours: it names the project it was dragged from. */
export type OwnDragPayload =
  | { readonly kind: 'folder'; readonly projectId: ProjectId; readonly folderId: FolderId }
  | {
      readonly kind: 'conversation';
      readonly projectId: ProjectId;
      readonly conversationId: ConversationId;
    };

/** What is being dragged: a row of ours, or a conversation link of claude.ai. */
export type DragPayload =
  | OwnDragPayload
  | { readonly kind: 'native'; readonly conversationId: ConversationId };

function encode(params: { projectId: ProjectId; id: string }): string {
  return new URLSearchParams({
    [PROJECT_FIELD]: params.projectId,
    [ID_FIELD]: params.id,
  }).toString();
}

function decode(data: string): { projectId: ProjectId; id: string } | null {
  const fields = new URLSearchParams(data);
  const projectId = fields.get(PROJECT_FIELD) ?? '';
  const id = fields.get(ID_FIELD) ?? '';
  return projectId === '' || id === '' ? null : { projectId, id };
}

function nativePayloadOf(transfer: DataTransfer): DragPayload | null {
  for (const format of URL_MIMES) {
    const conversationId = chatIdOfHref(transfer.getData(format));
    if (conversationId !== null) {
      return { kind: 'native', conversationId };
    }
  }
  return null;
}

/**
 * Stores a dragged row of ours in the drag data, under its own data type (Firefox only starts a
 * drag that carries data).
 * @param params.transfer - The `dataTransfer` of the `dragstart` event.
 * @param params.payload - The dragged row.
 */
export function writeDragPayload(params: {
  transfer: DataTransfer;
  payload: OwnDragPayload;
}): void {
  const { transfer, payload } = params;
  if (payload.kind === 'folder') {
    transfer.setData(FOLDER_MIME, encode({ projectId: payload.projectId, id: payload.folderId }));
  } else {
    transfer.setData(
      CONVERSATION_MIME,
      encode({ projectId: payload.projectId, id: payload.conversationId }),
    );
  }
}

/**
 * Reads what a drop carries: a row of ours (its own data type wins over the URL the browser adds
 * to a dragged link), else a conversation URL. Drag data is only readable on `drop`.
 * @param transfer - The `dataTransfer` of the `drop` event.
 * @returns The payload, or `null` when the data names nothing we can drop.
 */
export function readDragPayload(transfer: DataTransfer): DragPayload | null {
  const folder = decode(transfer.getData(FOLDER_MIME));
  if (folder !== null) {
    return { kind: 'folder', projectId: folder.projectId, folderId: folder.id };
  }
  const conversation = decode(transfer.getData(CONVERSATION_MIME));
  if (conversation !== null) {
    return {
      kind: 'conversation',
      projectId: conversation.projectId,
      conversationId: conversation.id,
    };
  }
  return nativePayloadOf(transfer);
}
