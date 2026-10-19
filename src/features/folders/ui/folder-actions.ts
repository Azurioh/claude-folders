import { i18n } from '#i18n';
import type { FolderIdProvider } from '@/features/folders/domain/folder-id.provider';
import {
  type ConversationId,
  type FiledConversation,
  type Folder,
  type FolderId,
  getConversation,
  getFolder,
} from '@/features/folders/domain/folders.model';
import {
  createFolder,
  deleteFolder,
  fileConversation,
  openFolder,
  renameConversation,
  renameFolder,
  setFolderAppearance,
  unfileConversation,
} from '@/features/folders/domain/folders.operations';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import { conversationAdderPanel } from '@/features/folders/ui/conversation-adder.panel';
import {
  type ConversationCandidate,
  unfiledCandidates,
} from '@/features/folders/ui/conversation-candidates';
import { deleteFolderPanel } from '@/features/folders/ui/delete-folder.panel';
import type { FloatingPanels, PanelRender } from '@/features/folders/ui/floating-panel';
import { FOCUS_KEY_ATTRIBUTE, focusFirstKeyed } from '@/features/folders/ui/focus-key';
import {
  type FolderAppearance,
  folderEditorPanel,
} from '@/features/folders/ui/folder-editor.panel';
import type { FolderEditingHandlers } from '@/features/folders/ui/folder-tree.view';
import { NEW_FOLDER_FOCUS_KEY } from '@/features/folders/ui/folders-section.view';
import type { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';
import { textFieldPanel } from '@/features/folders/ui/text-field.panel';

/** Where an action happens: a project, and the section it was triggered from. */
interface ActionScope {
  readonly projectId: ProjectId;
  /** The section root; focus is restored on its controls. */
  readonly section: HTMLElement;
}

function folderFocusKey(folderId: FolderId): string {
  return `folder:${folderId}`;
}

function appearanceFields(appearance: FolderAppearance): { emoji?: string; color?: string } {
  return {
    ...(appearance.emoji === null ? {} : { emoji: appearance.emoji }),
    ...(appearance.color === null ? {} : { color: appearance.color }),
  };
}

/**
 * The editing actions of the folders sections: each opens a floating panel (or acts right away)
 * and applies domain operations through the store. Rejected operations (blank names, unknown ids)
 * are ignored and never throw. When a panel closes, focus goes back to the control that opened
 * it, found again by its focus key since the section is re-rendered after every change.
 */
export class FolderActions {
  private readonly store: ProjectFoldersStore;
  private readonly panels: FloatingPanels;
  private readonly folderIds: FolderIdProvider;
  private readonly listsOf: (projectId: ProjectId) => readonly ParentNode[];

  /**
   * @param params.store - The displayed folder trees.
   * @param params.panels - Where panels open.
   * @param params.folderIds - Generates the ids of new folders.
   * @param params.listsOf - The native lists next to which a project's sections are mounted.
   */
  constructor(params: {
    store: ProjectFoldersStore;
    panels: FloatingPanels;
    folderIds: FolderIdProvider;
    listsOf: (projectId: ProjectId) => readonly ParentNode[];
  }) {
    this.store = params.store;
    this.panels = params.panels;
    this.folderIds = params.folderIds;
    this.listsOf = params.listsOf;
  }

  /**
   * Builds the editing handlers of one section.
   * @param params.projectId - The project the section shows.
   * @param params.section - The section root.
   * @returns The handlers, for the section's views.
   */
  handlersFor(params: { projectId: ProjectId; section: HTMLElement }): FolderEditingHandlers {
    const scope: ActionScope = params;
    return {
      onCreateFolder: ({ parentId, anchor }) => {
        this.openCreateFolder({ scope, parentId, anchor });
      },
      onAddConversations: ({ folderId, anchor }) => {
        this.openAdder({ scope, folderId, anchor });
      },
      onEditFolder: ({ folderId, anchor }) => {
        this.openEditor({ scope, folderId, anchor });
      },
      onDeleteFolder: ({ folderId, anchor }) => {
        this.openDeleteConfirmation({ scope, folderId, anchor });
      },
      onRenameConversation: ({ conversationId, anchor }) => {
        this.openRenameConversation({ scope, conversationId, anchor });
      },
      onUnfileConversation: ({ conversationId, folderId }) => {
        this.store.apply({
          projectId: scope.projectId,
          operation: (state) => unfileConversation({ state, conversationId }),
        });
        focusFirstKeyed({ container: scope.section, keys: [folderFocusKey(folderId)] });
      },
    };
  }

  private findFolder(params: { scope: ActionScope; folderId: FolderId }): Folder | null {
    const state = this.store.find(params.scope.projectId);
    return state === null ? null : (getFolder({ state, folderId: params.folderId }) ?? null);
  }

  private findConversation(params: {
    scope: ActionScope;
    conversationId: ConversationId;
  }): FiledConversation | null {
    const state = this.store.find(params.scope.projectId);
    return state === null
      ? null
      : (getConversation({ state, conversationId: params.conversationId }) ?? null);
  }

  private open(params: {
    scope: ActionScope;
    anchor: HTMLElement;
    title: string;
    render: PanelRender;
    fallbackFocusKeys: readonly string[];
  }): void {
    const { scope, anchor, title, render, fallbackFocusKeys } = params;
    const anchorKey = anchor.getAttribute(FOCUS_KEY_ATTRIBUTE);
    const keys = anchorKey === null ? fallbackFocusKeys : [anchorKey, ...fallbackFocusKeys];
    this.panels.open({
      anchor,
      title,
      render,
      restoreFocus: () => {
        focusFirstKeyed({ container: scope.section, keys });
      },
    });
  }

  private openCreateFolder(params: {
    scope: ActionScope;
    parentId: FolderId | null;
    anchor: HTMLElement;
  }): void {
    const { scope, parentId, anchor } = params;
    const parent = parentId === null ? null : this.findFolder({ scope, folderId: parentId });
    if (parentId !== null && parent === null) {
      return;
    }
    this.open({
      scope,
      anchor,
      title:
        parent === null ? i18n.t('actionNewFolder') : i18n.t('actionNewSubfolder', [parent.name]),
      fallbackFocusKeys: [],
      render: textFieldPanel({
        document: anchor.ownerDocument,
        fieldLabel: i18n.t('fieldName'),
        value: '',
        submitLabel: i18n.t('buttonCreate'),
        hint: null,
        onSubmit: (name) => {
          this.store.apply({
            projectId: scope.projectId,
            operation: (current) =>
              createFolder({ state: current, name, parentId, newId: this.folderIds.nextId() }),
          });
          return true;
        },
      }),
    });
  }

  private openEditor(params: {
    scope: ActionScope;
    folderId: FolderId;
    anchor: HTMLElement;
  }): void {
    const { scope, folderId, anchor } = params;
    const folder = this.findFolder({ scope, folderId });
    if (folder === null) {
      return;
    }
    this.open({
      scope,
      anchor,
      title: i18n.t('panelEditFolderTitle'),
      fallbackFocusKeys: [folderFocusKey(folderId)],
      render: folderEditorPanel({
        document: anchor.ownerDocument,
        folder,
        onRename: (name) => {
          this.store.apply({
            projectId: scope.projectId,
            operation: (current) => renameFolder({ state: current, folderId, name }),
          });
        },
        onAppearance: (appearance) => {
          this.store.apply({
            projectId: scope.projectId,
            operation: (current) =>
              setFolderAppearance({ state: current, folderId, ...appearanceFields(appearance) }),
          });
        },
      }),
    });
  }

  private openDeleteConfirmation(params: {
    scope: ActionScope;
    folderId: FolderId;
    anchor: HTMLElement;
  }): void {
    const { scope, folderId, anchor } = params;
    const folder = this.findFolder({ scope, folderId });
    if (folder === null) {
      return;
    }
    const parentKeys = folder.parentId === null ? [] : [folderFocusKey(folder.parentId)];
    this.open({
      scope,
      anchor,
      title: i18n.t('panelDeleteFolderTitle'),
      fallbackFocusKeys: [...parentKeys, NEW_FOLDER_FOCUS_KEY],
      render: deleteFolderPanel({
        document: anchor.ownerDocument,
        folderName: folder.name,
        onConfirm: () => {
          this.store.apply({
            projectId: scope.projectId,
            operation: (current) => deleteFolder({ state: current, folderId }),
          });
        },
      }),
    });
  }

  private openRenameConversation(params: {
    scope: ActionScope;
    conversationId: ConversationId;
    anchor: HTMLElement;
  }): void {
    const { scope, conversationId, anchor } = params;
    const conversation = this.findConversation({ scope, conversationId });
    if (conversation === null) {
      return;
    }
    this.open({
      scope,
      anchor,
      title: i18n.t('panelRenameConversationTitle'),
      fallbackFocusKeys: [folderFocusKey(conversation.folderId)],
      render: textFieldPanel({
        document: anchor.ownerDocument,
        fieldLabel: i18n.t('fieldTitle'),
        value: conversation.title,
        submitLabel: i18n.t('buttonRename'),
        hint: i18n.t('renameConversationHint'),
        onSubmit: (title) =>
          this.store.apply({
            projectId: scope.projectId,
            operation: (current) => renameConversation({ state: current, conversationId, title }),
          }),
      }),
    });
  }

  private openAdder(params: { scope: ActionScope; folderId: FolderId; anchor: HTMLElement }): void {
    const { scope, folderId, anchor } = params;
    const folder = this.findFolder({ scope, folderId });
    if (folder === null) {
      return;
    }
    this.open({
      scope,
      anchor,
      title: i18n.t('panelAddConversationsTitle', [folder.name]),
      fallbackFocusKeys: [folderFocusKey(folderId)],
      render: conversationAdderPanel({
        document: anchor.ownerDocument,
        candidates: () => this.candidatesOf(scope.projectId),
        onFile: (candidate) => {
          this.file({ scope, folderId, candidate });
        },
      }),
    });
  }

  private candidatesOf(projectId: ProjectId): ConversationCandidate[] {
    const state = this.store.find(projectId);
    return state === null ? [] : unfiledCandidates({ lists: this.listsOf(projectId), state });
  }

  private file(params: {
    scope: ActionScope;
    folderId: FolderId;
    candidate: ConversationCandidate;
  }): void {
    const { scope, folderId, candidate } = params;
    this.store.apply({
      projectId: scope.projectId,
      operation: (current) => {
        const filed = fileConversation({
          state: current,
          conversationId: candidate.conversationId,
          folderId,
          title: candidate.title,
          fallbackTitle: candidate.title,
        });
        return filed.ok ? openFolder({ state: filed.state, folderId }) : filed;
      },
    });
  }
}
