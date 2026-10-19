// @vitest-environment happy-dom

import { stubI18n } from '@@/tests/features/folders/ui/test-doubles';
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
  return { onToggleFolder: vi.fn(), onToggleSection: vi.fn(), onOpenConversation: vi.fn() };
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
});
