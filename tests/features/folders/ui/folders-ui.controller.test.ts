// @vitest-environment happy-dom

import {
  createPanelLayer,
  flushPromises,
  InMemoryFoldersRepository,
  InMemoryHideFiledSetting,
  SequentialFolderIdProvider,
  showFixture,
  stubI18n,
} from '@@/tests/features/folders/ui/test-doubles';
import { elementOf, fakeId } from '@@/tests/shared/claude-dom/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { type FoldersUi, startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks, rowOf } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT = fakeId(9);
const PROJECT_PAGE = `/project/${PROJECT}`;
const CURRENT_CHAT = fakeId(0x0a);
const CHAT_PAGE = `/chat/${CURRENT_CHAT}`;
const FILED_CHAT = fakeId(0x0b);
const MUTATION_DEBOUNCE_WAIT_MS = 250;
const SIDEBAR_LIST_SELECTOR = `[data-group-list="${PROJECT}"] ul`;

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true, color: '#2563eb' },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: {
      [FILED_CHAT]: { title: 'Filed chat', folderId: 'work' },
      [CURRENT_CHAT]: { title: 'Current chat', folderId: 'later' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function recentsHeading(): HTMLElement {
  const heading = [...document.querySelectorAll<HTMLElement>('main h2')].find(
    (candidate) => candidate.textContent?.trim() === 'Recents',
  );
  if (heading === undefined) {
    throw new Error('No Recents heading in the fixture');
  }
  return heading;
}

function sections(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(OWN_UI_SELECTOR)];
}

function sidebarSection(): HTMLElement {
  return elementOf({ root: document, selector: `${SIDEBAR_LIST_SELECTOR} > ${OWN_UI_SELECTOR}` });
}

function folderRow(params: { root: ParentNode; name: string }): HTMLButtonElement {
  const row = [...params.root.querySelectorAll<HTMLButtonElement>('.nfc-folder')].find(
    (candidate) => candidate.querySelector('.nfc-label')?.textContent === params.name,
  );
  if (row === undefined) {
    throw new Error(`No folder row named ${params.name}`);
  }
  return row;
}

function firstNativeLinkTo(conversationId: string): HTMLAnchorElement {
  const link = nativeChatLinks(document).find(
    (candidate) => chatIdOf(candidate) === conversationId,
  );
  if (link === undefined) {
    throw new Error(`No native link to ${conversationId}`);
  }
  return link;
}

const ROW_HEIGHT = 36;
const DARK_TEXT = 'rgb(20, 20, 19)';
const LIGHT_TEXT = 'rgb(250, 249, 245)';
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Gives the first native sidebar row a layout, so its look can be copied; returns its link. */
function layOutSidebarRow(): HTMLAnchorElement {
  const [link] = nativeChatLinks(elementOf({ root: document, selector: SIDEBAR_LIST_SELECTOR }));
  if (link === undefined) {
    throw new Error('No native sidebar link in the fixture');
  }
  const row = rowOf(link);
  Object.defineProperty(row, 'offsetHeight', { value: ROW_HEIGHT });
  row.getBoundingClientRect = () => new DOMRect(0, 0, 200, ROW_HEIGHT);
  return link;
}

/** Makes every `matchMedia` call return one query list, so tests can fire its `change` events. */
function stubColorScheme(): MediaQueryList {
  const query = window.matchMedia(COLOR_SCHEME_QUERY);
  vi.spyOn(window, 'matchMedia').mockReturnValue(query);
  return query;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('startFoldersUi', () => {
  let ui: FoldersUi | null = null;
  let pathname = PROJECT_PAGE;
  let repository: InMemoryFoldersRepository;
  let hideFiled: InMemoryHideFiledSetting;

  async function start(params: { page: 'project-page' | 'chat-page'; path: string }) {
    showFixture(params.page);
    pathname = params.path;
    ui = startFoldersUi({
      document,
      pathname: () => pathname,
      repository,
      hideFiled,
      panelLayer: createPanelLayer(),
      folderIds: new SequentialFolderIdProvider(),
      now: () => 0,
    });
    await flushPromises();
  }

  beforeEach(() => {
    stubI18n();
    repository = new InMemoryFoldersRepository({ [PROJECT]: sampleProject() });
    hideFiled = new InMemoryHideFiledSetting(true);
  });

  afterEach(() => {
    ui?.stop();
    ui = null;
    vi.restoreAllMocks();
  });

  describe('mounting', () => {
    it('mounts a section as the first child of the expanded sidebar project list', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });

      const list = elementOf({ root: document, selector: SIDEBAR_LIST_SELECTOR });
      expect(list.firstElementChild?.matches(OWN_UI_SELECTOR)).toBe(true);
      expect(list.firstElementChild?.tagName).toBe('LI');
      expect(sections()).toHaveLength(1);
    });

    it('mounts the project page section right before the Recents heading, styled like it', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });

      const heading = recentsHeading();
      const section = heading.previousElementSibling;
      expect(section?.matches(OWN_UI_SELECTOR)).toBe(true);
      const header = section?.querySelector('.nfc-header');
      for (const className of heading.classList) {
        expect(header?.classList.contains(className)).toBe(true);
      }
      expect(sections()).toHaveLength(2);
    });

    it('renders the project tree in each section', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });

      for (const section of sections()) {
        expect(folderRow({ root: section, name: 'Work' })).toBeDefined();
        expect(folderRow({ root: section, name: 'Later' })).toBeDefined();
      }
    });

    it('never duplicates a section on repeated syncs', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });

      ui?.sync();
      ui?.sync();

      expect(sections()).toHaveLength(2);
    });

    it('removes the project page section once the page is no longer that project', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });

      pathname = CHAT_PAGE;
      ui?.sync();

      expect(sections()).toHaveLength(1);
      expect(recentsHeading().previousElementSibling?.matches(OWN_UI_SELECTOR) ?? false).toBe(
        false,
      );
    });

    it('removes a sidebar section whose project list disappeared', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const section = sidebarSection();

      elementOf({ root: document, selector: SIDEBAR_LIST_SELECTOR }).replaceWith(
        document.createElement('div'),
      );
      ui?.sync();

      expect(section.isConnected).toBe(false);
      expect(sections()).toHaveLength(0);
    });

    it('mounts a section after claude.ai renders the list, through DOM mutations', async () => {
      showFixture('chat-page');
      const list = elementOf({ root: document, selector: SIDEBAR_LIST_SELECTOR });
      const parent = list.parentElement;
      list.remove();
      pathname = CHAT_PAGE;
      ui = startFoldersUi({
        document,
        pathname: () => pathname,
        repository,
        hideFiled,
        panelLayer: createPanelLayer(),
        folderIds: new SequentialFolderIdProvider(),
        now: () => 0,
      });
      await flushPromises();
      expect(sections()).toHaveLength(0);

      parent?.append(list);
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(list.firstElementChild?.matches(OWN_UI_SELECTOR)).toBe(true);
    });
  });

  describe('conversations', () => {
    it('marks the conversation of the current page and follows navigation', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      ui?.sync();
      folderRow({ root: sidebarSection(), name: 'Later' }).click();

      const current = sidebarSection().querySelector(`a[href="/chat/${CURRENT_CHAT}"]`);
      expect(current?.getAttribute('aria-current')).toBe('page');

      pathname = `/chat/${FILED_CHAT}`;
      ui?.sync();

      const filed = sidebarSection().querySelector(`a[href="/chat/${FILED_CHAT}"]`);
      expect(filed?.getAttribute('aria-current')).toBe('page');
      expect(
        sidebarSection()
          .querySelector(`a[href="/chat/${CURRENT_CHAT}"]`)
          ?.hasAttribute('aria-current'),
      ).toBe(false);
    });

    it("opens a conversation through claude.ai's own link", async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const native = firstNativeLinkTo(FILED_CHAT);
      const nativeClick = vi.fn((event: Event) => {
        event.preventDefault();
      });
      native.addEventListener('click', nativeClick);

      sidebarSection().querySelector<HTMLAnchorElement>(`a[href="/chat/${FILED_CHAT}"]`)?.click();

      expect(nativeClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('filed conversations in native lists', () => {
    it('hides them where a section is mounted', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });

      const filedRows = [...document.querySelectorAll(`a[href="/chat/${FILED_CHAT}"]`)]
        .filter((link) => link.closest(OWN_UI_SELECTOR) === null)
        .map(rowOf);
      expect(filedRows).toHaveLength(2);
      for (const row of filedRows) {
        expect(row.hasAttribute('data-nfc-hidden')).toBe(true);
      }
      const unfiled = firstNativeLinkTo(fakeId(0x0c));
      expect(rowOf(unfiled).hasAttribute('data-nfc-hidden')).toBe(false);
    });

    it('dims them instead when the setting is off, and follows its changes', async () => {
      hideFiled = new InMemoryHideFiledSetting(false);
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const filed = firstNativeLinkTo(FILED_CHAT);
      expect(filed.hasAttribute('data-nfc-filed')).toBe(true);
      expect(rowOf(filed).hasAttribute('data-nfc-hidden')).toBe(false);

      hideFiled.set(true);

      expect(filed.hasAttribute('data-nfc-filed')).toBe(false);
      expect(rowOf(filed).hasAttribute('data-nfc-hidden')).toBe(true);
    });
  });

  describe('interactions', () => {
    it('toggles a folder, persists it and keeps keyboard focus on its row', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const work = folderRow({ root: sidebarSection(), name: 'Work' });
      work.focus();

      work.click();

      const saved = repository.saved.at(-1);
      expect(saved?.projectId).toBe(PROJECT);
      expect(saved?.state.folders.work?.open).toBe(false);
      const rerendered = folderRow({ root: sidebarSection(), name: 'Work' });
      expect(rerendered.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(rerendered);
    });

    it('collapses the sidebar section and persists it', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });

      sidebarSection().querySelector<HTMLButtonElement>('button.nfc-header')?.click();

      expect(repository.saved.at(-1)?.state.sectionOpen.sidebar).toBe(false);
      expect(sidebarSection().querySelector('.nfc-folder')).toBeNull();
    });

    it('re-renders when another tab changes the project', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });

      repository.writeFromAnotherTab({
        projectId: PROJECT,
        state: {
          ...emptyProject(),
          folders: { ideas: { id: 'ideas', name: 'Ideas', parentId: null, open: false } },
        },
      });

      expect(folderRow({ root: sidebarSection(), name: 'Ideas' })).toBeDefined();
      expect(sidebarSection().querySelectorAll('.nfc-folder')).toHaveLength(1);
      const filed = firstNativeLinkTo(FILED_CHAT);
      expect(rowOf(filed).hasAttribute('data-nfc-hidden')).toBe(false);
    });
  });

  describe('theme changes', () => {
    async function startWithLaidOutRow(): Promise<HTMLAnchorElement> {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const link = layOutSidebarRow();
      link.style.color = DARK_TEXT;
      ui?.sync();
      expect(sidebarSection().style.getPropertyValue('--nfc-color')).toBe(DARK_TEXT);
      link.style.color = LIGHT_TEXT;
      return link;
    }

    it('keeps the copied look while the theme does not change', async () => {
      await startWithLaidOutRow();

      ui?.sync();

      expect(sidebarSection().style.getPropertyValue('--nfc-color')).toBe(DARK_TEXT);
    });

    it('copies the look again when claude.ai switches its theme on the root element', async () => {
      await startWithLaidOutRow();

      document.documentElement.setAttribute('data-mode', 'light');
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(sidebarSection().style.getPropertyValue('--nfc-color')).toBe(LIGHT_TEXT);
    });

    it('copies the look again when the body classes change', async () => {
      await startWithLaidOutRow();

      document.body.classList.add('nfc-test-theme');
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(sidebarSection().style.getPropertyValue('--nfc-color')).toBe(LIGHT_TEXT);
    });

    it('copies the look again when the OS color scheme changes', async () => {
      const query = stubColorScheme();
      await startWithLaidOutRow();

      query.dispatchEvent(new Event('change'));
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(sidebarSection().style.getPropertyValue('--nfc-color')).toBe(LIGHT_TEXT);
    });

    it('listens to the color scheme once, whatever the number of syncs', async () => {
      const query = stubColorScheme();
      const addListener = vi.spyOn(query, 'addEventListener');
      await start({ page: 'chat-page', path: CHAT_PAGE });

      ui?.sync();
      ui?.sync();

      expect(addListener).toHaveBeenCalledTimes(1);
    });

    it('stops following theme changes once stopped', async () => {
      const query = stubColorScheme();
      const removeListener = vi.spyOn(query, 'removeEventListener');
      const link = await startWithLaidOutRow();
      const section = sidebarSection();

      ui?.stop();
      section.style.removeProperty('--nfc-color');
      document.documentElement.setAttribute('data-mode', 'light');
      query.dispatchEvent(new Event('change'));
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(section.style.getPropertyValue('--nfc-color')).toBe('');
      expect(link.style.color).toBe(LIGHT_TEXT);
    });
  });

  describe('stop', () => {
    it('removes every section and mark, and stops watching', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });
      expect(document.querySelector('[data-nfc-hidden]')).not.toBeNull();

      ui?.stop();

      expect(sections()).toHaveLength(0);
      expect(document.querySelector('[data-nfc-hidden], [data-nfc-filed]')).toBeNull();
      expect(repository.watcherCount()).toBe(0);
      expect(hideFiled.watcherCount()).toBe(0);
    });

    it('no longer reacts to DOM mutations', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      ui?.stop();

      document.body.append(document.createElement('div'));
      await wait(MUTATION_DEBOUNCE_WAIT_MS);

      expect(sections()).toHaveLength(0);
    });
  });
});
