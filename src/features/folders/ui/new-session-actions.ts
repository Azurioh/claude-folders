import { i18n } from '#i18n';
import {
  type ConversationId,
  type Folder,
  type FolderId,
  getFolder,
} from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import { listedConversationTitle } from '@/features/folders/ui/conversation-candidates';
import type { FolderSessionHandlers } from '@/features/folders/ui/folder-tree.view';
import { NewSessionChip } from '@/features/folders/ui/new-session-chip';
import {
  filingVerdict,
  followLocation,
  isIntentExpired,
  NEW_SESSION_INTENT_LIFETIME_MS,
  type NewSessionIntent,
  type PageLocation,
  rememberExistingChats,
  startNewSessionIntent,
} from '@/features/folders/ui/new-session-intent';
import type { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';
import { openProjectPage } from '@/features/folders/ui/spa-navigation';
import { fileInFolder } from '@/features/folders/ui/tree-moves';
import { chatProjectId } from '@/shared/claude-dom/chat-project';
import { chatIdOf, currentChatId, currentProjectId } from '@/shared/claude-dom/claude-ids';
import { findComposer } from '@/shared/claude-dom/composer';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';

function locationOf(pathname: string): PageLocation {
  return { projectId: currentProjectId(pathname), chatId: currentChatId(pathname) };
}

/**
 * The "New session in this folder" action of folder rows. Pressing it remembers, in memory only,
 * that the next session started on the folder's project page goes to that folder, and opens that
 * page through claude.ai's own project link (client-side navigation keeps the content script and
 * this memory alive; without such a link the page is loaded and the request is lost, so nothing is
 * filed). On the project page the composer is focused and a chip says where the session will be
 * filed. When the page then goes to a chat that did not exist before (not listed in the page nor
 * filed when the request started or when the project page opened) and whose header shows the same
 * project, that chat is filed in the folder like any filing (`fileInFolder`), titled from
 * claude.ai's lists when they show it ("Untitled" until claude.ai names it, see
 * `untitled-conversations.ts`). Opening an existing chat, any other navigation, the chip's × button, deleting the folder or ten minutes cancel
 * the request; nothing is filed then.
 */
export class NewSessionActions {
  private readonly document: Document;
  private readonly pathname: () => string;
  private readonly now: () => number;
  private readonly assign: (url: string) => void;
  private readonly store: ProjectFoldersStore;
  private readonly chip: NewSessionChip;
  private intent: NewSessionIntent | null = null;
  private seenPathname = '';
  private composerFocused = false;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly cancelFromChip = (): void => {
    const composer = findComposer(this.document);
    this.cancel();
    composer?.field.focus();
  };

  /**
   * @param params.document - The claude.ai document.
   * @param params.pathname - Reads the current `location.pathname`.
   * @param params.now - Reads the current time in milliseconds.
   * @param params.assign - Loads a URL, used when claude.ai shows no link to the project.
   * @param params.store - The displayed folder trees.
   * @param params.panelLayer - Where the chip renders, inside a shadow root.
   */
  constructor(params: {
    document: Document;
    pathname: () => string;
    now: () => number;
    assign: (url: string) => void;
    store: ProjectFoldersStore;
    panelLayer: HTMLElement;
  }) {
    this.document = params.document;
    this.pathname = params.pathname;
    this.now = params.now;
    this.assign = params.assign;
    this.store = params.store;
    this.chip = new NewSessionChip(params.panelLayer);
  }

  /**
   * Builds the session handlers of one section.
   * @param params.projectId - The project the section shows.
   * @returns The handlers, for the section's views.
   */
  handlersFor(params: { projectId: ProjectId }): FolderSessionHandlers {
    const { projectId } = params;
    return {
      onNewSession: ({ folderId }) => {
        this.start({ projectId, folderId });
      },
    };
  }

  /** Follows the page: navigation, the composer, the chat's project and the folder's existence. */
  sync(): void {
    const pathname = this.pathname();
    const previous = this.intent;
    if (previous !== null && pathname !== this.seenPathname) {
      this.seenPathname = pathname;
      const next = followLocation({
        intent: previous,
        location: locationOf(pathname),
        now: this.now(),
      });
      const arrived = previous.stage.kind === 'opening' && next?.stage.kind === 'project-page';
      this.intent =
        next !== null && arrived
          ? rememberExistingChats({ intent: next, chatIds: this.existingChatIds(next.projectId) })
          : next;
    }
    const intent = this.intent;
    if (intent === null) {
      this.cancel();
      return;
    }
    const state = this.store.find(intent.projectId);
    const folder = state === null ? undefined : getFolder({ state, folderId: intent.folderId });
    if (isIntentExpired({ intent, now: this.now() }) || (state !== null && folder === undefined)) {
      this.cancel();
      return;
    }
    if (folder === undefined) {
      return;
    }
    if (intent.stage.kind === 'new-chat') {
      this.chip.hide();
      this.resolve(intent);
      return;
    }
    if (intent.stage.kind === 'project-page') {
      this.showOnProjectPage(folder);
    }
  }

  /** Cancels the pending request, if any, and removes the chip. */
  stop(): void {
    this.cancel();
  }

  private start(params: { projectId: ProjectId; folderId: FolderId }): void {
    this.cancel();
    const pathname = this.pathname();
    this.seenPathname = pathname;
    this.intent = startNewSessionIntent({
      ...params,
      location: locationOf(pathname),
      knownChatIds: this.existingChatIds(params.projectId),
      now: this.now(),
    });
    this.expiryTimer = setTimeout(() => {
      this.cancel();
    }, NEW_SESSION_INTENT_LIFETIME_MS);
    if (this.intent.stage.kind === 'opening') {
      openProjectPage({ root: this.document, projectId: params.projectId, assign: this.assign });
    }
    this.sync();
  }

  /** The chats the page lists anywhere (the project's lists included) and those filed in it. */
  private existingChatIds(projectId: ProjectId): ConversationId[] {
    const listed = nativeChatLinks(this.document).flatMap((link) => chatIdOf(link) ?? []);
    const filed = Object.keys(this.store.find(projectId)?.conversations ?? {});
    return [...listed, ...filed];
  }

  private showOnProjectPage(folder: Folder): void {
    const composer = findComposer(this.document);
    if (composer === null) {
      this.chip.hide();
      return;
    }
    if (!this.composerFocused) {
      this.composerFocused = true;
      composer.field.focus();
    }
    this.chip.show({ anchor: composer.frame, folder, onCancel: this.cancelFromChip });
  }

  /** Files the new chat, or cancels, once its page shows a project; the tree is loaded. */
  private resolve(intent: NewSessionIntent): void {
    const verdict = filingVerdict({
      intent,
      chatProjectId: chatProjectId(this.document),
      now: this.now(),
    });
    if (verdict.kind === 'cancel') {
      this.cancel();
      return;
    }
    if (verdict.kind === 'wait') {
      return;
    }
    // Cleared first: the save re-renders synchronously, which syncs this action again.
    this.cancel();
    const title = listedConversationTitle({
      lists: [this.document],
      conversationId: verdict.chatId,
    });
    this.store.apply({
      projectId: intent.projectId,
      operation: (state) =>
        fileInFolder({
          state,
          conversationId: verdict.chatId,
          folderId: intent.folderId,
          title,
          fallbackTitle: i18n.t('conversationUntitled'),
        }),
    });
  }

  private cancel(): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    this.intent = null;
    this.composerFocused = false;
    this.chip.hide();
  }
}
