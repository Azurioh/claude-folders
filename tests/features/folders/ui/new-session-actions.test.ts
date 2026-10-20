// @vitest-environment happy-dom

import {
  createPanelLayer,
  flushPromises,
  InMemoryFoldersRepository,
  InMemoryHideFiledSetting,
  ManualClock,
  SequentialFolderIdProvider,
  showFixture,
  stubI18n,
} from '@@/tests/features/folders/ui/test-doubles';
import { el, elementOf, fakeId } from '@@/tests/shared/claude-dom/fixtures';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { type FoldersUi, startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { NEW_SESSION_INTENT_LIFETIME_MS } from '@/features/folders/ui/new-session-intent';
import { findComposer } from '@/shared/claude-dom/composer';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT = fakeId(9);
const OTHER_PROJECT = fakeId(1);
const PROJECT_PAGE = `/project/${PROJECT}`;
const NEW_CHAT = '0e0e0e0e-0000-4000-8000-0000000000ee';
const NEW_CHAT_PAGE = `/chat/${NEW_CHAT}`;
const SIDEBAR_SECTION_SELECTOR = `[data-group-list="${PROJECT}"] ul > ${OWN_UI_SELECTOR}`;
const PROJECT_PAGE_SECTION_SELECTOR = `main ${OWN_UI_SELECTOR}`;

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: false, emoji: '💼' },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: {},
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function newSessionButton(params: { section: string; name: string }): HTMLButtonElement {
  const root = elementOf({ root: document, selector: params.section });
  const row = [...root.querySelectorAll('.nfc-folder')].find(
    (candidate) => candidate.querySelector('.nfc-label')?.textContent === params.name,
  );
  const button = row
    ?.closest('.nfc-item')
    ?.querySelector<HTMLButtonElement>(`button[aria-label="actionNewSession(${params.name})"]`);
  if (button === undefined || button === null) {
    throw new Error(`No new session button on ${params.name}`);
  }
  return button;
}

/** Renders the chat header breadcrumb claude.ai shows once a chat page is drawn. */
function showChatHeader(projectId: string): void {
  elementOf({ root: document, selector: 'main' }).prepend(
    el({ tag: 'a', attributes: { href: `/project/${projectId}` }, children: ['Project'] }),
  );
}

describe('"New session in this folder"', () => {
  let ui: FoldersUi | null = null;
  let repository: InMemoryFoldersRepository;
  let layer: HTMLElement;
  let pathname: string;
  let clock: ManualClock;
  let assign: Mock<(url: string) => void>;

  async function start(params: { page: 'project-page' | 'chat-page'; path: string }) {
    showFixture(params.page);
    pathname = params.path;
    layer = createPanelLayer();
    ui = startFoldersUi({
      document,
      pathname: () => pathname,
      repository,
      hideFiled: new InMemoryHideFiledSetting(true),
      panelLayer: layer,
      folderIds: new SequentialFolderIdProvider(),
      now: () => clock.now(),
      assign,
    });
    await flushPromises();
  }

  function navigate(path: string): void {
    pathname = path;
    ui?.sync();
  }

  function chip(): HTMLElement | null {
    return layer.querySelector<HTMLElement>('.nfc-chip');
  }

  function filedFolderOf(conversationId: string): string | undefined {
    return repository.saved.at(-1)?.state.conversations[conversationId]?.folderId;
  }

  async function startOnProjectPage(): Promise<void> {
    await start({ page: 'project-page', path: PROJECT_PAGE });
    newSessionButton({ section: PROJECT_PAGE_SECTION_SELECTOR, name: 'Work' }).click();
  }

  beforeEach(() => {
    stubI18n();
    repository = new InMemoryFoldersRepository({ [PROJECT]: sampleProject() });
    clock = new ManualClock();
    assign = vi.fn();
  });

  afterEach(() => {
    ui?.stop();
    ui = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('on the project page', () => {
    it("focuses the project's new-session composer", async () => {
      await startOnProjectPage();

      expect(document.activeElement).toBe(findComposer(document)?.field);
    });

    it('shows a chip naming the folder, in the panel layer', async () => {
      await startOnProjectPage();

      expect(chip()?.getAttribute('role')).toBe('status');
      expect(chip()?.textContent).toBe('newSessionChip(💼 Work)');
      expect(layer.getRootNode()).toBeInstanceOf(ShadowRoot);
    });

    it('gives the chip a named cancel button', async () => {
      await startOnProjectPage();

      const cancel = chip()?.querySelector('button');

      expect(cancel?.type).toBe('button');
      expect(cancel?.getAttribute('aria-label')).toBe('newSessionCancel(Work)');
    });

    it('replaces a pending request when another folder is chosen', async () => {
      await startOnProjectPage();
      newSessionButton({ section: PROJECT_PAGE_SECTION_SELECTOR, name: 'Later' }).click();

      expect(layer.querySelectorAll('.nfc-chip')).toHaveLength(1);
      expect(chip()?.textContent).toBe('newSessionChip(Later)');
    });
  });

  describe('filing', () => {
    it('files the new chat once its header shows the project, then removes the chip', async () => {
      await startOnProjectPage();
      navigate(NEW_CHAT_PAGE);

      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();

      showChatHeader(PROJECT);
      ui?.sync();

      expect(filedFolderOf(NEW_CHAT)).toBe('work');
      expect(repository.saved.at(-1)?.state.conversations[NEW_CHAT]?.title).toBe(
        'conversationUntitled',
      );
      expect(chip()).toBeNull();
    });

    it('files it only once', async () => {
      await startOnProjectPage();
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();
      const saves = repository.saved.length;

      ui?.sync();

      expect(repository.saved).toHaveLength(saves);
    });

    it("takes claude.ai's generated title once the page lists the chat", async () => {
      await startOnProjectPage();
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();
      elementOf({ root: document, selector: SIDEBAR_SECTION_SELECTOR }).after(
        el({
          tag: 'li',
          children: [
            el({ tag: 'a', attributes: { href: NEW_CHAT_PAGE }, children: ['Generated title'] }),
          ],
        }),
      );

      ui?.sync();

      expect(repository.saved.at(-1)?.state.conversations[NEW_CHAT]).toEqual({
        title: 'Generated title',
        folderId: 'work',
      });
    });

    it('files nothing when the project page opens an existing chat', async () => {
      await startOnProjectPage();
      const existing = `/chat/${fakeId(0x0b)}`;
      navigate(existing);
      showChatHeader(PROJECT);
      ui?.sync();

      expect(filedFolderOf(fakeId(0x0b))).toBeUndefined();
      expect(chip()).toBeNull();
    });

    it('files nothing when the chat belongs to another project', async () => {
      await startOnProjectPage();
      navigate(NEW_CHAT_PAGE);
      showChatHeader(OTHER_PROJECT);
      ui?.sync();

      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
      showChatHeader(PROJECT);
      ui?.sync();
      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
    });
  });

  describe('cancelling', () => {
    it('cancels on the chip × button and focuses the composer again', async () => {
      await startOnProjectPage();
      chip()?.querySelector('button')?.click();

      expect(chip()).toBeNull();
      expect(document.activeElement).toBe(findComposer(document)?.field);
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();
      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
    });

    it('cancels when the user goes anywhere but a chat', async () => {
      await startOnProjectPage();
      navigate('/new');

      expect(chip()).toBeNull();
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();
      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
    });

    it('cancels when the folder is deleted', async () => {
      await startOnProjectPage();
      const { work: _deleted, ...folders } = sampleProject().folders;
      repository.writeFromAnotherTab({
        projectId: PROJECT,
        state: { ...sampleProject(), folders },
      });

      expect(chip()).toBeNull();
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();
      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
    });

    it('cancels after 10 minutes', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });
      vi.useFakeTimers();
      newSessionButton({ section: PROJECT_PAGE_SECTION_SELECTOR, name: 'Work' }).click();

      vi.advanceTimersByTime(NEW_SESSION_INTENT_LIFETIME_MS);

      expect(chip()).toBeNull();
    });

    it('files nothing when the chat is reached after 10 minutes', async () => {
      await startOnProjectPage();
      clock.advance(NEW_SESSION_INTENT_LIFETIME_MS);
      navigate(NEW_CHAT_PAGE);
      showChatHeader(PROJECT);
      ui?.sync();

      expect(filedFolderOf(NEW_CHAT)).toBeUndefined();
    });

    it('cancels when the UI stops', async () => {
      await startOnProjectPage();
      ui?.stop();
      ui = null;

      expect(chip()).toBeNull();
    });
  });

  describe('away from the project page', () => {
    it("opens the project through claude.ai's own link, then focuses its composer", async () => {
      await start({ page: 'chat-page', path: `/chat/${fakeId(0x0a)}` });
      const native = vi.fn((event: Event) => {
        event.preventDefault();
      });
      for (const link of document.querySelectorAll(`a[href="${PROJECT_PAGE}"]`)) {
        link.addEventListener('click', native);
      }

      newSessionButton({ section: SIDEBAR_SECTION_SELECTOR, name: 'Work' }).click();

      expect(native).toHaveBeenCalledTimes(1);
      expect(assign).not.toHaveBeenCalled();
      expect(chip()).toBeNull();

      navigate(PROJECT_PAGE);

      expect(document.activeElement).toBe(findComposer(document)?.field);
      expect(chip()?.textContent).toBe('newSessionChip(💼 Work)');
    });
  });
});
