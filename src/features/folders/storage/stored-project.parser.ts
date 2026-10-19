/**
 * Validation of the folder tree read from storage (schema v1).
 *
 * Stored data may be corrupted or edited by hand, so nothing read from storage is trusted. Each
 * folder, conversation and section flag is validated with a Zod schema, which drops unknown
 * fields. The id-keyed records are walked over their own entries and rebuilt with
 * `Object.fromEntries` rather than with `z.record`, which skips `__proto__` keys: ids such as
 * `__proto__` must survive as plain entries.
 */
import * as z from 'zod/mini';
import type {
  ConversationId,
  FiledConversation,
  Folder,
  FolderId,
  ProjectFolders,
} from '@/features/folders/domain/folders.model';

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const recordSchema = z.custom<UnknownRecord>(isRecord);

const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.nullable(z.string()),
  open: z.boolean(),
  emoji: z.exactOptional(z.string()),
  color: z.exactOptional(z.string()),
});

const conversationSchema = z.object({
  title: z.string(),
  folderId: z.string(),
});

const storedProjectSchema = z.object({
  folders: recordSchema,
  conversations: recordSchema,
  sectionOpen: z.object({ sidebar: z.boolean(), projectPage: z.boolean() }),
});

function parseFolders(raw: UnknownRecord): Record<FolderId, Folder> | null {
  const entries: [FolderId, Folder][] = [];
  for (const [id, value] of Object.entries(raw)) {
    const result = folderSchema.safeParse(value);
    if (!result.success || result.data.id !== id) {
      return null;
    }
    entries.push([id, result.data]);
  }
  return Object.fromEntries(entries);
}

function parseConversations(raw: UnknownRecord): Record<ConversationId, FiledConversation> | null {
  const entries: [ConversationId, FiledConversation][] = [];
  for (const [id, value] of Object.entries(raw)) {
    const result = conversationSchema.safeParse(value);
    if (!result.success) {
      return null;
    }
    entries.push([id, result.data]);
  }
  return Object.fromEntries(entries);
}

/**
 * Validates a stored folder tree and rebuilds it, dropping unknown fields.
 * @param raw - The value read from storage.
 * @returns The folder tree, or `null` when any part of the value does not match schema v1.
 */
export function parseStoredProject(raw: unknown): ProjectFolders | null {
  const result = storedProjectSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }
  const folders = parseFolders(result.data.folders);
  const conversations = parseConversations(result.data.conversations);
  if (folders === null || conversations === null) {
    return null;
  }
  return { folders, conversations, sectionOpen: result.data.sectionOpen };
}
