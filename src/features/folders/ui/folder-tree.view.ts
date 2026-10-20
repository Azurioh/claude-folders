import { i18n } from '#i18n';
import type {
  ConversationId,
  FiledConversation,
  Folder,
  FolderId,
  ProjectFolders,
} from '@/features/folders/domain/folders.model';
import {
  childrenOf,
  countConversations,
  type FolderChild,
} from '@/features/folders/domain/folders.queries';
import {
  conversationRowDragAttributes,
  folderRowDragAttributes,
} from '@/features/folders/ui/drag-markers';
import { createElement } from '@/features/folders/ui/element';
import {
  conversationRowFocusKey,
  FOCUS_KEY_ATTRIBUTE,
  folderRowFocusKey,
} from '@/features/folders/ui/focus-key';
import { createIcon } from '@/features/folders/ui/icons';
import { createRowItem, type RowAction } from '@/features/folders/ui/row-actions';

const FOLDER_ICON_SIZE = 16;
const CHEVRON_SIZE = 12;

/** Reactions of a rendered folder tree to its row actions; each opens a panel or edits the tree. */
export interface FolderEditingHandlers {
  /** "New folder" (root) or "New sub-folder" was pressed. */
  onCreateFolder(params: { parentId: FolderId | null; anchor: HTMLElement }): void;
  /** "Add conversations" was pressed on a folder. */
  onAddConversations(params: { folderId: FolderId; anchor: HTMLElement }): void;
  /** "Edit" was pressed on a folder. */
  onEditFolder(params: { folderId: FolderId; anchor: HTMLElement }): void;
  /** "Delete" was pressed on a folder. */
  onDeleteFolder(params: { folderId: FolderId; anchor: HTMLElement }): void;
  /** "Rename" was pressed on a conversation. */
  onRenameConversation(params: { conversationId: ConversationId; anchor: HTMLElement }): void;
  /** "Remove from folder" was pressed on a conversation. */
  onUnfileConversation(params: { conversationId: ConversationId; folderId: FolderId }): void;
}

/** Reactions of a rendered folder tree to its "New session in this folder" action. */
export interface FolderSessionHandlers {
  /** "New session in this folder" was pressed on a folder. */
  onNewSession(params: { folderId: FolderId }): void;
}

/** Reactions of a rendered folder tree to user actions. */
export interface FolderTreeHandlers extends FolderEditingHandlers, FolderSessionHandlers {
  /** A folder row was activated (click, Enter or Space). */
  onToggleFolder(folderId: FolderId): void;
  /** A conversation link was clicked; the handler decides how to navigate. */
  onOpenConversation(params: { conversationId: ConversationId; event: MouseEvent }): void;
}

interface TreeContext {
  readonly document: Document;
  readonly state: ProjectFolders;
  readonly currentChatId: string | null;
  readonly handlers: FolderTreeHandlers;
}

/**
 * Builds the chevron shown before a collapsible label.
 * @param params.document - The owner document.
 * @param params.open - Whether the controlled content is expanded.
 * @returns The chevron icon, rotated by CSS when open.
 */
export function createChevron(params: { document: Document; open: boolean }): SVGSVGElement {
  const chevron = createIcon({
    document: params.document,
    name: 'chevron',
    size: CHEVRON_SIZE,
    className: 'nfc-chev',
  });
  chevron.toggleAttribute('data-open', params.open);
  return chevron;
}

function folderVisual(params: { document: Document; folder: Folder }): Element {
  const { document, folder } = params;
  if (folder.emoji === undefined) {
    return createIcon({ document, name: 'folder', size: FOLDER_ICON_SIZE, className: 'nfc-ficon' });
  }
  return createElement({
    document,
    tag: 'span',
    className: 'nfc-emoji',
    attributes: { 'aria-hidden': 'true' },
    children: [folder.emoji],
  });
}

function countElements(params: { document: Document; count: number }): HTMLElement[] {
  const { document, count } = params;
  if (count === 0) {
    return [];
  }
  return [
    createElement({
      document,
      tag: 'span',
      className: 'nfc-count',
      attributes: { 'aria-hidden': 'true' },
      children: [String(count)],
    }),
    createElement({
      document,
      tag: 'span',
      className: 'nfc-visually-hidden',
      children: [i18n.t('folderConversationCount', count)],
    }),
  ];
}

function folderRow(params: { context: TreeContext; folder: Folder }): HTMLButtonElement {
  const { context, folder } = params;
  const { document, state } = context;
  const row = createElement({
    document,
    tag: 'button',
    className: 'nfc-row nfc-folder',
    attributes: {
      type: 'button',
      'aria-expanded': String(folder.open),
      [FOCUS_KEY_ATTRIBUTE]: folderRowFocusKey(folder.id),
      ...folderRowDragAttributes(folder.id),
    },
    children: [
      createChevron({ document, open: folder.open }),
      folderVisual({ document, folder }),
      createElement({ document, tag: 'span', className: 'nfc-label', children: [folder.name] }),
      ...countElements({ document, count: countConversations({ state, folderId: folder.id }) }),
    ],
  });
  row.toggleAttribute('data-color', folder.color !== undefined);
  row.addEventListener('click', () => {
    context.handlers.onToggleFolder(folder.id);
  });
  return row;
}

function folderActions(params: { context: TreeContext; folder: Folder }): RowAction[] {
  const { handlers } = params.context;
  const { id, name } = params.folder;
  return [
    {
      icon: 'plus',
      label: i18n.t('actionNewSession', [name]),
      focusKey: `new-session:${id}`,
      onActivate: () => {
        handlers.onNewSession({ folderId: id });
      },
    },
    {
      icon: 'folderPlus',
      label: i18n.t('actionNewSubfolder', [name]),
      focusKey: `new-subfolder:${id}`,
      onActivate: (anchor) => {
        handlers.onCreateFolder({ parentId: id, anchor });
      },
    },
    {
      icon: 'listPlus',
      label: i18n.t('actionAddConversations', [name]),
      focusKey: `add-conversations:${id}`,
      onActivate: (anchor) => {
        handlers.onAddConversations({ folderId: id, anchor });
      },
    },
    {
      icon: 'pencil',
      label: i18n.t('actionEditFolder', [name]),
      focusKey: `edit-folder:${id}`,
      onActivate: (anchor) => {
        handlers.onEditFolder({ folderId: id, anchor });
      },
    },
    {
      icon: 'close',
      label: i18n.t('actionDeleteFolder', [name]),
      focusKey: `delete-folder:${id}`,
      onActivate: (anchor) => {
        handlers.onDeleteFolder({ folderId: id, anchor });
      },
    },
  ];
}

function folderGroup(params: { context: TreeContext; folder: Folder }): HTMLElement {
  const { context, folder } = params;
  const children = renderChildren({ context, parentId: folder.id });
  const content =
    children.length > 0
      ? children
      : [
          createElement({
            document: context.document,
            tag: 'div',
            className: 'nfc-empty',
            children: [i18n.t('folderEmpty')],
          }),
        ];
  return createElement({
    document: context.document,
    tag: 'div',
    className: 'nfc-group',
    attributes: { role: 'group', 'aria-label': folder.name },
    children: content,
  });
}

function folderNode(params: { context: TreeContext; folder: Folder }): HTMLElement {
  const { context, folder } = params;
  const node = createElement({
    document: context.document,
    tag: 'div',
    className: 'nfc-node',
    children: [
      createRowItem({
        document: context.document,
        row: folderRow({ context, folder }),
        actions: folderActions({ context, folder }),
      }),
    ],
  });
  if (folder.color !== undefined) {
    node.style.setProperty('--nfc-accent', folder.color);
  }
  if (folder.open) {
    node.append(folderGroup({ context, folder }));
  }
  return node;
}

function conversationActions(params: {
  context: TreeContext;
  conversationId: ConversationId;
  conversation: FiledConversation;
}): RowAction[] {
  const { context, conversationId, conversation } = params;
  const { handlers } = context;
  return [
    {
      icon: 'pencil',
      label: i18n.t('actionRenameConversation', [conversation.title]),
      focusKey: `rename-conversation:${conversationId}`,
      onActivate: (anchor) => {
        handlers.onRenameConversation({ conversationId, anchor });
      },
    },
    {
      icon: 'close',
      label: i18n.t('actionUnfileConversation', [conversation.title]),
      focusKey: `unfile-conversation:${conversationId}`,
      onActivate: () => {
        handlers.onUnfileConversation({ conversationId, folderId: conversation.folderId });
      },
    },
  ];
}

function conversationRow(params: {
  context: TreeContext;
  conversationId: ConversationId;
  conversation: FiledConversation;
}): HTMLAnchorElement {
  const { context, conversationId, conversation } = params;
  const link = createElement({
    document: context.document,
    tag: 'a',
    className: 'nfc-row nfc-conv',
    attributes: {
      href: `/chat/${conversationId}`,
      title: conversation.title,
      [FOCUS_KEY_ATTRIBUTE]: conversationRowFocusKey(conversationId),
      ...conversationRowDragAttributes(conversationId),
    },
    children: [
      createElement({
        document: context.document,
        tag: 'span',
        className: 'nfc-label',
        children: [conversation.title],
      }),
    ],
  });
  if (conversationId === context.currentChatId) {
    link.setAttribute('aria-current', 'page');
  }
  link.addEventListener('click', (event) => {
    context.handlers.onOpenConversation({ conversationId, event });
  });
  return link;
}

function renderChild(params: { context: TreeContext; child: FolderChild }): HTMLElement {
  const { context, child } = params;
  if (child.kind === 'folder') {
    return folderNode({ context, folder: child.folder });
  }
  const filed = { context, conversationId: child.id, conversation: child.conversation };
  return createRowItem({
    document: context.document,
    row: conversationRow(filed),
    actions: conversationActions(filed),
  });
}

function renderChildren(params: {
  context: TreeContext;
  parentId: FolderId | null;
}): HTMLElement[] {
  const { context, parentId } = params;
  return childrenOf({ state: context.state, parentId }).map((child) =>
    renderChild({ context, child }),
  );
}

/**
 * Renders the direct children of a folder (or of the root) and, below each open folder, its own
 * children. Folder rows are buttons exposing `aria-expanded`; conversations are links to their
 * chat, the current one marked with `aria-current="page"`. Both are drag sources, and folder rows
 * are drop targets (`drag-markers.ts`).
 * @param params.document - The owner document.
 * @param params.state - The project to render.
 * @param params.parentId - The folder whose children are rendered, or `null` for the root.
 * @param params.currentChatId - The conversation shown by the page, if any.
 * @param params.handlers - Reactions to user actions.
 * @returns The rendered nodes, in display order.
 */
export function renderFolderTree(params: {
  document: Document;
  state: ProjectFolders;
  parentId: FolderId | null;
  currentChatId: string | null;
  handlers: FolderTreeHandlers;
}): HTMLElement[] {
  const { parentId, ...context } = params;
  return renderChildren({ context, parentId });
}
