/**
 * The pending "new session in this folder" request, as a pure state machine: it is started from
 * a folder, follows the page through the project page to the new chat, and either files that
 * chat or is cancelled. It is held in memory only; nothing here touches the DOM or storage.
 */
import type { ConversationId, FolderId } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';

const MS_PER_MINUTE = 60_000;
const INTENT_LIFETIME_MINUTES = 10;

/** How long an intent waits for its new session before it is cancelled. */
export const NEW_SESSION_INTENT_LIFETIME_MS = INTENT_LIFETIME_MINUTES * MS_PER_MINUTE;

/** What the current page shows, as far as an intent is concerned. */
export interface PageLocation {
  /** The project of a project page, else `null`. */
  readonly projectId: ProjectId | null;
  /** The conversation of a chat page, else `null`. */
  readonly chatId: ConversationId | null;
}

/** Where an intent stands. */
export type NewSessionStage =
  /** Started away from the project page, which is being opened. */
  | { readonly kind: 'opening' }
  /** On the project page, waiting for the user to start the session. */
  | { readonly kind: 'project-page' }
  /** The project page went to this chat; waiting for the page to show which project it is in. */
  | { readonly kind: 'new-chat'; readonly chatId: ConversationId };

/** A pending request to file the next session started on a project page into a folder. */
export interface NewSessionIntent {
  readonly projectId: ProjectId;
  readonly folderId: FolderId;
  /** When the intent was started, in milliseconds. */
  readonly startedAt: number;
  /** Chats that existed before the intent (listed or filed): never taken for the new session. */
  readonly knownChatIds: ReadonlySet<ConversationId>;
  readonly stage: NewSessionStage;
}

/** What to do with an intent once the page shows a chat's project. */
export type FilingVerdict =
  | { readonly kind: 'file'; readonly chatId: ConversationId }
  | { readonly kind: 'wait' }
  | { readonly kind: 'cancel' };

/**
 * Starts an intent from a folder.
 * @param params.projectId - The folder's project.
 * @param params.folderId - The folder the new session goes to.
 * @param params.location - The page the intent is started on.
 * @param params.knownChatIds - The chats that already exist: listed next to the project, filed
 *   in it, and the chat the intent is started on.
 * @param params.now - The current time, in milliseconds.
 * @returns The intent: on the project page already, or opening it.
 */
export function startNewSessionIntent(params: {
  projectId: ProjectId;
  folderId: FolderId;
  location: PageLocation;
  knownChatIds: Iterable<ConversationId>;
  now: number;
}): NewSessionIntent {
  const { projectId, folderId, location, now } = params;
  const onProjectPage = location.projectId === projectId;
  const knownChatIds = new Set(params.knownChatIds);
  if (location.chatId !== null) {
    knownChatIds.add(location.chatId);
  }
  return {
    projectId,
    folderId,
    startedAt: now,
    knownChatIds,
    stage: onProjectPage ? { kind: 'project-page' } : { kind: 'opening' },
  };
}

/**
 * Tells whether an intent outlived {@link NEW_SESSION_INTENT_LIFETIME_MS}.
 * @param params.intent - The intent.
 * @param params.now - The current time, in milliseconds.
 * @returns `true` once the lifetime is over.
 */
export function isIntentExpired(params: { intent: NewSessionIntent; now: number }): boolean {
  return params.now - params.intent.startedAt >= NEW_SESSION_INTENT_LIFETIME_MS;
}

function nextStage(params: {
  intent: NewSessionIntent;
  location: PageLocation;
}): NewSessionStage | null {
  const { intent, location } = params;
  const onProjectPage = location.projectId === intent.projectId;
  switch (intent.stage.kind) {
    case 'opening':
      return onProjectPage ? { kind: 'project-page' } : null;
    case 'project-page':
      if (onProjectPage) {
        return intent.stage;
      }
      return location.chatId === null || intent.knownChatIds.has(location.chatId)
        ? null
        : { kind: 'new-chat', chatId: location.chatId };
    case 'new-chat':
      return location.chatId === intent.stage.chatId ? intent.stage : null;
  }
}

/**
 * Adds chats to those known to exist before the new session, e.g. the opened project page's
 * Recents, which were not listed where the intent was started.
 * @param params.intent - The pending intent.
 * @param params.chatIds - The chats now known to exist.
 * @returns The intent, knowing them too.
 */
export function rememberExistingChats(params: {
  intent: NewSessionIntent;
  chatIds: Iterable<ConversationId>;
}): NewSessionIntent {
  const { intent, chatIds } = params;
  return { ...intent, knownChatIds: new Set([...intent.knownChatIds, ...chatIds]) };
}

/**
 * Follows a change of the page's location. The opened project page is reached; a chat reached
 * from the project page is the new session unless it existed before the intent (then it is an
 * existing chat being opened); any other place (another project, a known chat, leaving the new
 * chat) cancels the intent, as does its expiry.
 * @param params.intent - The pending intent.
 * @param params.location - The new location.
 * @param params.now - The current time, in milliseconds.
 * @returns The updated intent, or `null` when it is cancelled.
 */
export function followLocation(params: {
  intent: NewSessionIntent;
  location: PageLocation;
  now: number;
}): NewSessionIntent | null {
  const { intent, now } = params;
  if (isIntentExpired({ intent, now })) {
    return null;
  }
  const stage = nextStage(params);
  return stage === null ? null : { ...intent, stage };
}

/**
 * Decides whether the chat reached from the project page is filed: only once the page shows it
 * belongs to the intent's project. A chat of another project cancels the intent; while its
 * project is not shown yet (header still rendering), the intent waits, bounded by its expiry.
 * @param params.intent - The pending intent.
 * @param params.chatProjectId - The project the chat page shows, or `null` when none is shown.
 * @param params.now - The current time, in milliseconds.
 * @returns The verdict; `wait` before the intent reached a chat.
 */
export function filingVerdict(params: {
  intent: NewSessionIntent;
  chatProjectId: ProjectId | null;
  now: number;
}): FilingVerdict {
  const { intent, chatProjectId, now } = params;
  if (isIntentExpired({ intent, now })) {
    return { kind: 'cancel' };
  }
  if (intent.stage.kind !== 'new-chat' || chatProjectId === null) {
    return { kind: 'wait' };
  }
  return chatProjectId === intent.projectId
    ? { kind: 'file', chatId: intent.stage.chatId }
    : { kind: 'cancel' };
}
