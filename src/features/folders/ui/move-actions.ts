import { i18n } from '#i18n';
import {
  type FolderId,
  getConversation,
  getFolder,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import type { FloatingPanels } from '@/features/folders/ui/floating-panel';
import {
  conversationRowFocusKey,
  FOCUS_KEY_ATTRIBUTE,
  focusFirstKeyed,
  folderRowFocusKey,
} from '@/features/folders/ui/focus-key';
import type { FolderMoveHandlers } from '@/features/folders/ui/folder-tree.view';
import { moveDestinationPanel } from '@/features/folders/ui/move-destination.panel';
import {
  type MoveDestination,
  type MoveSubject,
  moveDestinations,
} from '@/features/folders/ui/move-destinations';
import type { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';
import {
  moveFolderInto,
  placeConversation,
  type TreeOperation,
} from '@/features/folders/ui/tree-moves';

/** Where a move happens: a project, and the section it was triggered from. */
interface MoveScope {
  readonly projectId: ProjectId;
  /** The section root; focus is restored on its controls. */
  readonly section: HTMLElement;
}

/** The subject of a move as the panel presents it. */
interface PresentedSubject {
  readonly subject: MoveSubject;
  readonly name: string;
  readonly rootLabel: string;
  /** Focus key of the subject's row. */
  readonly rowKey: string;
  /** Where focus goes when the row is gone after the move (an unfiled conversation). */
  readonly fallbackKeys: readonly string[];
}

function presentedSubject(params: {
  state: ProjectFolders;
  subject: MoveSubject;
}): PresentedSubject | null {
  const { state, subject } = params;
  if (subject.kind === 'folder') {
    const folder = getFolder({ state, folderId: subject.folderId });
    return folder === undefined
      ? null
      : {
          subject,
          name: folder.name,
          rootLabel: i18n.t('moveDestinationRoot'),
          rowKey: folderRowFocusKey(folder.id),
          fallbackKeys: [],
        };
  }
  const conversation = getConversation({ state, conversationId: subject.conversationId });
  return conversation === undefined
    ? null
    : {
        subject,
        name: conversation.title,
        rootLabel: i18n.t('moveDestinationNoFolder'),
        rowKey: conversationRowFocusKey(subject.conversationId),
        fallbackKeys: [folderRowFocusKey(conversation.folderId)],
      };
}

function moveOperation(params: { subject: MoveSubject; folderId: FolderId | null }): TreeOperation {
  const { subject, folderId } = params;
  if (subject.kind === 'folder') {
    return (state) =>
      moveFolderInto({ state, folderId: subject.folderId, targetParentId: folderId });
  }
  return (state) =>
    placeConversation({
      state,
      conversationId: subject.conversationId,
      folderId,
      title: null,
      fallbackTitle: i18n.t('conversationUntitled'),
    });
}

/**
 * The "Move to…" row action of folders and filed conversations: the keyboard and single-pointer
 * alternative to drag and drop (WCAG 2.5.7). It opens a panel listing the valid destinations;
 * choosing one applies the same domain moves as a drop, then gives focus back to the moved row
 * (its former folder when a conversation leaves its folder). Escape gives it back to the button.
 */
export class MoveActions {
  private readonly store: ProjectFoldersStore;
  private readonly panels: FloatingPanels;

  /**
   * @param params.store - The displayed folder trees.
   * @param params.panels - Where panels open.
   */
  constructor(params: { store: ProjectFoldersStore; panels: FloatingPanels }) {
    this.store = params.store;
    this.panels = params.panels;
  }

  /**
   * Builds the move handlers of one section.
   * @param params.projectId - The project the section shows.
   * @param params.section - The section root.
   * @returns The handlers, for the section's views.
   */
  handlersFor(params: { projectId: ProjectId; section: HTMLElement }): FolderMoveHandlers {
    const scope: MoveScope = params;
    return {
      onMoveFolder: ({ folderId, anchor }) => {
        this.open({ scope, subject: { kind: 'folder', folderId }, anchor });
      },
      onMoveConversation: ({ conversationId, anchor }) => {
        this.open({ scope, subject: { kind: 'conversation', conversationId }, anchor });
      },
    };
  }

  private open(params: { scope: MoveScope; subject: MoveSubject; anchor: HTMLElement }): void {
    const { scope, subject, anchor } = params;
    const state = this.store.find(scope.projectId);
    const presented = state === null ? null : presentedSubject({ state, subject });
    if (state === null || presented === null) {
      return;
    }
    const anchorKey = anchor.getAttribute(FOCUS_KEY_ATTRIBUTE);
    let chosen = false;
    this.panels.open({
      anchor,
      title: i18n.t('panelMoveTitle', [presented.name]),
      render: moveDestinationPanel({
        document: anchor.ownerDocument,
        destinations: moveDestinations({ state, subject, rootLabel: presented.rootLabel }),
        onChoose: (destination) => {
          chosen = true;
          this.move({ scope, subject, destination });
        },
      }),
      restoreFocus: () => {
        const keys = chosen || anchorKey === null ? [] : [anchorKey];
        focusFirstKeyed({
          container: scope.section,
          keys: [...keys, presented.rowKey, ...presented.fallbackKeys],
        });
      },
    });
  }

  private move(params: {
    scope: MoveScope;
    subject: MoveSubject;
    destination: MoveDestination;
  }): void {
    const { scope, subject, destination } = params;
    if (destination.current) {
      return;
    }
    this.store.apply({
      projectId: scope.projectId,
      operation: moveOperation({ subject, folderId: destination.folderId }),
    });
  }
}
