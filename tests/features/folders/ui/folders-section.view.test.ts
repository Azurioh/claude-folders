// @vitest-environment happy-dom

import { stubI18n } from '@@/tests/features/folders/ui/test-doubles';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import {
  type FoldersSectionHandlers,
  renderFoldersSection,
} from '@/features/folders/ui/folders-section.view';

const CHAT_A = '0a0a0a0a-0000-4000-8000-00000000000a';
const CHAT_B = '0b0b0b0b-0000-4000-8000-00000000000b';

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true, emoji: '💼', color: '#d97706' },
      archive: { id: 'archive', name: 'Archive', parentId: null, open: false },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: true },
    },
    conversations: {
      [CHAT_A]: { title: 'Alpha chat', folderId: 'work' },
      [CHAT_B]: { title: 'Beta chat', folderId: 'archive' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function handlers(): FoldersSectionHandlers {
  return {
    onToggleFolder: vi.fn(),
    onToggleSection: vi.fn(),
    onOpenConversation: vi.fn(),
    onCreateFolder: vi.fn(),
    onAddConversations: vi.fn(),
    onEditFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onRenameConversation: vi.fn(),
    onUnfileConversation: vi.fn(),
    onMoveFolder: vi.fn(),
    onMoveConversation: vi.fn(),
  };
}

function render(params: {
  section: 'sidebar' | 'projectPage';
  spies: FoldersSectionHandlers;
}): HTMLElement {
  const root = container();
  renderFoldersSection({
    container: root,
    section: params.section,
    state: sampleProject(),
    currentChatId: null,
    headingClass: '',
    handlers: params.spies,
  });
  return root;
}

function actionsOf(row: Element): HTMLButtonElement[] {
  const item = row.closest('.nfc-item');
  return [...(item?.querySelectorAll<HTMLButtonElement>(':scope > .nfc-actions > button') ?? [])];
}

function clickAction(button: HTMLButtonElement | undefined): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  button?.dispatchEvent(event);
  return event;
}

function container(): HTMLElement {
  const element = document.createElement('div');
  document.body.append(element);
  return element;
}

function folderRow(params: { root: ParentNode; name: string }): HTMLButtonElement {
  const rows = [...params.root.querySelectorAll<HTMLButtonElement>('.nfc-folder')];
  const row = rows.find(
    (candidate) => candidate.querySelector('.nfc-label')?.textContent === params.name,
  );
  if (row === undefined) {
    throw new Error(`No folder row named ${params.name}`);
  }
  return row;
}

describe('renderFoldersSection', () => {
  beforeEach(() => {
    stubI18n();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders root folders sorted by name, with nested children of open folders', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    });

    const labels = [...root.querySelectorAll('.nfc-row .nfc-label')].map(
      (label) => label.textContent,
    );
    expect(labels).toEqual(['Archive', 'Work', 'Specs', 'Alpha chat']);
  });

  it('renders folder rows as buttons exposing their expanded state', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    });

    const work = folderRow({ root, name: 'Work' });
    expect(work.tagName).toBe('BUTTON');
    expect(work.type).toBe('button');
    expect(work.getAttribute('aria-expanded')).toBe('true');
    expect(folderRow({ root, name: 'Archive' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the emoji or the folder icon, the accent color and the subtree count', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    });

    const work = folderRow({ root, name: 'Work' });
    expect(work.querySelector('.nfc-emoji')?.textContent).toBe('💼');
    expect(work.hasAttribute('data-color')).toBe(true);
    expect(work.closest<HTMLElement>('.nfc-node')?.style.getPropertyValue('--nfc-accent')).toBe(
      '#d97706',
    );
    expect(work.querySelector('.nfc-count')?.textContent).toBe('1');
    expect(work.querySelector('.nfc-visually-hidden')?.textContent).toBe(
      'folderConversationCount(1)',
    );

    const archive = folderRow({ root, name: 'Archive' });
    expect(archive.querySelector('svg.nfc-ficon')).not.toBeNull();
    expect(archive.hasAttribute('data-color')).toBe(false);
  });

  it('leaves the count out of an empty folder and says it is empty when open', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    });

    const specs = folderRow({ root, name: 'Specs' });
    expect(specs.querySelector('.nfc-count')).toBeNull();
    expect(specs.closest('.nfc-node')?.querySelector('.nfc-empty')?.textContent).toBe(
      'folderEmpty',
    );
  });

  it('renders conversations as links to their chat, marking the current one', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: CHAT_A,
      headingClass: '',
      handlers: handlers(),
    });

    const link = root.querySelector<HTMLAnchorElement>('a.nfc-conv');
    expect(link?.getAttribute('href')).toBe(`/chat/${CHAT_A}`);
    expect(link?.getAttribute('title')).toBe('Alpha chat');
    expect(link?.getAttribute('aria-current')).toBe('page');
  });

  it('hands conversation clicks to the handler', () => {
    const root = container();
    const spies = handlers();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: spies,
    });

    root.querySelector<HTMLAnchorElement>('a.nfc-conv')?.click();

    expect(spies.onOpenConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CHAT_A }),
    );
  });

  it('toggles a folder when its row is activated', () => {
    const root = container();
    const spies = handlers();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: spies,
    });

    folderRow({ root, name: 'Archive' }).click();

    expect(spies.onToggleFolder).toHaveBeenCalledWith('archive');
  });

  it('keeps keyboard focus on the same row across re-renders', () => {
    const root = container();
    const params = {
      container: root,
      section: 'sidebar' as const,
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    };
    renderFoldersSection({ ...params, state: sampleProject() });
    folderRow({ root, name: 'Archive' }).focus();

    renderFoldersSection({ ...params, state: { ...sampleProject() } });

    expect(document.activeElement).toBe(folderRow({ root, name: 'Archive' }));
  });

  it('renders the sidebar header as a toggle button of the section', () => {
    const root = container();
    const spies = handlers();
    renderFoldersSection({
      container: root,
      section: 'sidebar',
      state: { ...sampleProject(), sectionOpen: { sidebar: false, projectPage: true } },
      currentChatId: null,
      headingClass: '',
      handlers: spies,
    });

    const header = root.querySelector<HTMLButtonElement>('button.nfc-header');
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(header?.textContent).toBe('foldersSectionTitle');
    expect(root.querySelector('.nfc-folder')).toBeNull();

    header?.click();
    expect(spies.onToggleSection).toHaveBeenCalledWith('sidebar');
  });

  it('renders the project page header as a heading carrying the native heading classes', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'projectPage',
      state: sampleProject(),
      currentChatId: null,
      headingClass: 'text-sm text-muted',
      handlers: handlers(),
    });

    const header = root.querySelector('.nfc-header');
    expect(header?.getAttribute('role')).toBe('heading');
    expect(header?.getAttribute('aria-level')).toBe('2');
    expect(header?.classList.contains('text-sm')).toBe(true);
    expect(header?.classList.contains('text-muted')).toBe(true);
    expect(root.querySelectorAll('.nfc-folder')).toHaveLength(3);
  });

  it('explains on the project page that the project has no folder', () => {
    const root = container();
    renderFoldersSection({
      container: root,
      section: 'projectPage',
      state: emptyProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    });

    expect(root.querySelector('.nfc-empty')?.textContent).toBe('projectFoldersEmpty');
  });

  it('replaces its previous content instead of appending', () => {
    const root = container();
    const params = {
      container: root,
      section: 'sidebar' as const,
      state: sampleProject(),
      currentChatId: null,
      headingClass: '',
      handlers: handlers(),
    };
    renderFoldersSection(params);
    renderFoldersSection(params);

    expect(root.querySelectorAll('.nfc-header')).toHaveLength(1);
    expect(root.querySelectorAll('.nfc-folder')).toHaveLength(3);
  });

  describe('actions', () => {
    it('gives each folder row named actions: new sub-folder, add conversations, move, edit, delete', () => {
      const root = render({ section: 'sidebar', spies: handlers() });

      const actions = actionsOf(folderRow({ root, name: 'Work' }));

      expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual([
        'actionNewSubfolder(Work)',
        'actionAddConversations(Work)',
        'actionMove(Work)',
        'actionEditFolder(Work)',
        'actionDeleteFolder(Work)',
      ]);
      for (const action of actions) {
        expect(action.type).toBe('button');
        expect(action.classList.contains('nfc-action')).toBe(true);
        expect(action.title).toBe(action.getAttribute('aria-label'));
      }
    });

    it('gives each conversation row named actions: move, rename, remove from folder', () => {
      const root = render({ section: 'sidebar', spies: handlers() });

      const link = root.querySelector('a.nfc-conv');
      const actions = link === null ? [] : actionsOf(link);

      expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual([
        'actionMove(Alpha chat)',
        'actionRenameConversation(Alpha chat)',
        'actionUnfileConversation(Alpha chat)',
      ]);
    });

    it('keeps actions out of the row itself, so the row stays one control', () => {
      const root = render({ section: 'sidebar', spies: handlers() });

      for (const row of root.querySelectorAll('.nfc-row')) {
        expect(row.querySelector('button')).toBeNull();
        expect(row.parentElement?.classList.contains('nfc-item')).toBe(true);
      }
    });

    it('hands folder actions to their handler with the pressed button, without toggling', () => {
      const spies = handlers();
      const root = render({ section: 'sidebar', spies });
      const [newSubfolder, add, move, edit, remove] = actionsOf(folderRow({ root, name: 'Work' }));

      const event = clickAction(newSubfolder);
      clickAction(add);
      clickAction(move);
      clickAction(edit);
      clickAction(remove);

      expect(event.defaultPrevented).toBe(true);
      expect(spies.onCreateFolder).toHaveBeenCalledWith({ parentId: 'work', anchor: newSubfolder });
      expect(spies.onAddConversations).toHaveBeenCalledWith({ folderId: 'work', anchor: add });
      expect(spies.onMoveFolder).toHaveBeenCalledWith({ folderId: 'work', anchor: move });
      expect(spies.onEditFolder).toHaveBeenCalledWith({ folderId: 'work', anchor: edit });
      expect(spies.onDeleteFolder).toHaveBeenCalledWith({ folderId: 'work', anchor: remove });
      expect(spies.onToggleFolder).not.toHaveBeenCalled();
    });

    it('hands conversation actions to their handler without opening the conversation', () => {
      const spies = handlers();
      const root = render({ section: 'sidebar', spies });
      const link = root.querySelector('a.nfc-conv');
      const [move, rename, unfile] = link === null ? [] : actionsOf(link);

      clickAction(move);
      clickAction(rename);
      clickAction(unfile);

      expect(spies.onMoveConversation).toHaveBeenCalledWith({
        conversationId: CHAT_A,
        anchor: move,
      });
      expect(spies.onRenameConversation).toHaveBeenCalledWith({
        conversationId: CHAT_A,
        anchor: rename,
      });
      expect(spies.onUnfileConversation).toHaveBeenCalledWith({
        conversationId: CHAT_A,
        folderId: 'work',
      });
      expect(spies.onOpenConversation).not.toHaveBeenCalled();
    });

    it('offers a "New folder" icon button next to the sidebar header', () => {
      const spies = handlers();
      const root = render({ section: 'sidebar', spies });
      const header = root.querySelector('button.nfc-header');
      const [create] = header === null ? [] : actionsOf(header);

      clickAction(create);

      expect(create?.getAttribute('aria-label')).toBe('actionNewFolder');
      expect(spies.onCreateFolder).toHaveBeenCalledWith({ parentId: null, anchor: create });
      expect(spies.onToggleSection).not.toHaveBeenCalled();
    });

    it('offers an always visible "New folder" text button on the project page', () => {
      const spies = handlers();
      const root = render({ section: 'projectPage', spies });
      const create = root.querySelector<HTMLButtonElement>('button.nfc-new');

      create?.click();

      expect(create?.textContent).toBe('actionNewFolder');
      expect(spies.onCreateFolder).toHaveBeenCalledWith({ parentId: null, anchor: create });
    });

    it('shows actions on hover and keyboard focus, and always on devices without hover', () => {
      const css = readFileSync(
        join(process.cwd(), 'src/features/folders/ui/folders.css'),
        'utf8',
      ).replaceAll(/\s+/g, ' ');

      expect(css).toContain('.nfc-item:hover > .nfc-actions');
      expect(css).toContain('.nfc-item:focus-within > .nfc-actions');
      expect(css).toMatch(/@media \(hover: none\) \{[^}]*\.nfc-actions/);
    });
  });
});
