// @vitest-environment happy-dom

import {
  createPanelLayer,
  flushPromises,
  focusedInLayer,
  InMemoryFoldersRepository,
  InMemoryHideFiledSetting,
  pressKey,
  pressPointer,
  SequentialFolderIdProvider,
  showFixture,
  stubI18n,
} from '@@/tests/features/folders/ui/test-doubles';
import { elementOf, fakeId } from '@@/tests/shared/claude-dom/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { type FoldersUi, startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { conversationTitle } from '@/shared/claude-dom/conversation-title';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT = fakeId(9);
const PROJECT_PAGE = `/project/${PROJECT}`;
const CHAT_PAGE = `/chat/${fakeId(0x0a)}`;
const WORK_CHAT = fakeId(0x0a);
const SPECS_CHAT = fakeId(0x0b);
const SIDEBAR_SECTION_SELECTOR = `[data-group-list="${PROJECT}"] ul > ${OWN_UI_SELECTOR}`;
const PROJECT_PAGE_SECTION_SELECTOR = `main ${OWN_UI_SELECTOR}`;

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: false },
    },
    conversations: {
      [WORK_CHAT]: { title: 'Work chat', folderId: 'work' },
      [SPECS_CHAT]: { title: 'Specs chat', folderId: 'specs' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function sidebarSection(): HTMLElement {
  return elementOf({ root: document, selector: SIDEBAR_SECTION_SELECTOR });
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

function action(params: { root: ParentNode; label: string }): HTMLButtonElement {
  const button = params.root.querySelector(`button[aria-label="${params.label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No action ${params.label}`);
  }
  return button;
}

function inputOf(params: { root: ParentNode; selector: string }): HTMLInputElement {
  const input = params.root.querySelector(params.selector);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`No input matches ${params.selector}`);
  }
  return input;
}

function typeInto(params: { input: HTMLInputElement; value: string }): void {
  params.input.value = params.value;
  params.input.dispatchEvent(new Event('input', { bubbles: true }));
}

function nativeTitleOf(conversationId: string): string {
  const link = nativeChatLinks(document).find(
    (candidate) => chatIdOf(candidate) === conversationId,
  );
  return link === undefined ? '' : conversationTitle(link);
}

describe('folder actions', () => {
  let ui: FoldersUi | null = null;
  let repository: InMemoryFoldersRepository;
  let layer: HTMLElement;

  async function start(params: { page: 'project-page' | 'chat-page'; path: string }) {
    showFixture(params.page);
    layer = createPanelLayer();
    ui = startFoldersUi({
      document,
      pathname: () => params.path,
      repository,
      hideFiled: new InMemoryHideFiledSetting(true),
      panelLayer: layer,
      folderIds: new SequentialFolderIdProvider(),
      now: () => 0,
    });
    await flushPromises();
  }

  function panel(): HTMLElement {
    return elementOf({ root: layer, selector: '[role="dialog"]' });
  }

  function panelInput(): HTMLInputElement {
    return inputOf({ root: panel(), selector: 'input' });
  }

  function panelButton(label: string): HTMLButtonElement {
    const button = [...panel().querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) =>
        candidate.textContent === label || candidate.getAttribute('aria-label') === label,
    );
    if (button === undefined) {
      throw new Error(`No panel button ${label}`);
    }
    return button;
  }

  function lastSaved(): ProjectFolders | undefined {
    return repository.saved.at(-1)?.state;
  }

  beforeEach(() => {
    stubI18n();
    repository = new InMemoryFoldersRepository({ [PROJECT]: sampleProject() });
  });

  afterEach(() => {
    ui?.stop();
    ui = null;
    vi.restoreAllMocks();
  });

  describe('create folder', () => {
    it('creates a root folder from the sidebar "New folder" button, with a generated id', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionNewFolder' }).click();

      expect(panel().textContent).toContain('actionNewFolder');
      expect(focusedInLayer(layer)).toBe(panelInput());
      typeInto({ input: panelInput(), value: '  Ideas ' });
      pressKey({ target: panelInput(), key: 'Enter' });

      expect(lastSaved()?.folders['folder-1']).toEqual({
        id: 'folder-1',
        name: 'Ideas',
        parentId: null,
        open: true,
      });
      expect(layer.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(
        action({ root: sidebarSection(), label: 'actionNewFolder' }),
      );
    });

    it('creates a folder from the project page text button', async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });
      elementOf({ root: document, selector: `${PROJECT_PAGE_SECTION_SELECTOR} .nfc-new` }).click();

      typeInto({ input: panelInput(), value: 'Ideas' });
      panelButton('buttonCreate').click();

      expect(lastSaved()?.folders['folder-1']?.name).toBe('Ideas');
    });

    it('creates a sub-folder and opens its parent', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionNewSubfolder(Specs)' }).click();

      expect(panel().textContent).toContain('actionNewSubfolder(Specs)');
      typeInto({ input: panelInput(), value: 'Drafts' });
      pressKey({ target: panelInput(), key: 'Enter' });

      expect(lastSaved()?.folders['folder-1']?.parentId).toBe('specs');
      expect(lastSaved()?.folders.specs?.open).toBe(true);
    });

    it('creates nothing from a blank name, and closes', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionNewFolder' }).click();

      typeInto({ input: panelInput(), value: '   ' });
      pressKey({ target: panelInput(), key: 'Enter' });

      expect(repository.saved).toEqual([]);
      expect(layer.querySelector('[role="dialog"]')).toBeNull();
    });

    it('creates nothing on Escape and gives focus back to the button', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      const create = action({ root: sidebarSection(), label: 'actionNewFolder' });
      create.click();

      typeInto({ input: panelInput(), value: 'Ideas' });
      pressKey({ target: panelInput(), key: 'Escape' });

      expect(repository.saved).toEqual([]);
      expect(layer.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(create);
    });

    it('closes on a pointer press outside of the panel', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionNewFolder' }).click();

      pressPointer(document.body);

      expect(layer.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe('row actions', () => {
    it('never toggle the folder of their row', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });

      action({ root: sidebarSection(), label: 'actionEditFolder(Work)' }).click();

      expect(lastSaved()).toBeUndefined();
      expect(
        folderRow({ root: sidebarSection(), name: 'Work' }).getAttribute('aria-expanded'),
      ).toBe('true');
    });
  });

  describe('edit folder', () => {
    async function openEditor(): Promise<void> {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionEditFolder(Work)' }).click();
    }

    it('renames the folder as the name is typed, ignoring a blank name', async () => {
      await openEditor();
      const name = panelInput();
      expect(name.value).toBe('Work');
      expect(focusedInLayer(layer)).toBe(name);

      typeInto({ input: name, value: 'Job' });
      expect(lastSaved()?.folders.work?.name).toBe('Job');

      typeInto({ input: name, value: ' ' });
      expect(lastSaved()?.folders.work?.name).toBe('Job');
      expect(folderRow({ root: sidebarSection(), name: 'Job' })).toBeDefined();
    });

    it('sets the emoji from the grid or the field, and removes it with the default icon', async () => {
      await openEditor();
      const pick = panelButton('📚');

      pick.click();
      expect(lastSaved()?.folders.work?.emoji).toBe('📚');
      expect(pick.getAttribute('aria-pressed')).toBe('true');

      const field = inputOf({ root: panel(), selector: 'input.nfc-emoji-input' });
      expect(field.value).toBe('📚');
      typeInto({ input: field, value: '🦊' });
      expect(lastSaved()?.folders.work?.emoji).toBe('🦊');
      expect(pick.getAttribute('aria-pressed')).toBe('false');

      panelButton('emojiDefaultIcon').click();
      expect(lastSaved()?.folders.work).not.toHaveProperty('emoji');
      expect(field.value).toBe('');
    });

    function emojiPlaceholder(): HTMLElement {
      return elementOf({ root: panel(), selector: '.nfc-emoji-placeholder' });
    }

    it('shows the folder icon, in the accent color, in an empty emoji field', async () => {
      await openEditor();
      const field = inputOf({ root: panel(), selector: 'input.nfc-emoji-input' });

      expect(field.value).toBe('');
      expect(emojiPlaceholder().hidden).toBe(false);
      expect(emojiPlaceholder().getAttribute('aria-hidden')).toBe('true');
      expect(emojiPlaceholder().querySelector('svg')).not.toBeNull();
      const descriptionId = field.getAttribute('aria-describedby') ?? '';
      expect(panel().querySelector(`#${descriptionId}`)?.textContent).toBe('emojiDefaultIcon');
      expect(panelButton('emojiDefaultIcon').getAttribute('aria-pressed')).toBe('true');

      panelButton('colorBlue').click();
      expect(emojiPlaceholder().style.color).toBe('#5b8dd6');
    });

    it('hides the folder icon once the field has an emoji, and shows it again on reset', async () => {
      await openEditor();
      const field = inputOf({ root: panel(), selector: 'input.nfc-emoji-input' });

      typeInto({ input: field, value: '🦊' });
      expect(emojiPlaceholder().hidden).toBe(true);
      expect(field.hasAttribute('aria-describedby')).toBe(false);
      expect(panelButton('emojiDefaultIcon').getAttribute('aria-pressed')).toBe('false');

      panelButton('emojiDefaultIcon').click();
      expect(field.value).toBe('');
      expect(emojiPlaceholder().hidden).toBe(false);
      expect(field.hasAttribute('aria-describedby')).toBe(true);
    });

    it('marks the grid emoji matching the current emoji when the panel opens', async () => {
      repository = new InMemoryFoldersRepository({
        [PROJECT]: {
          ...sampleProject(),
          folders: {
            ...sampleProject().folders,
            work: {
              id: 'work',
              name: 'Work',
              parentId: null,
              open: true,
              emoji: '💡',
              color: '#5b8dd6',
            },
          },
        },
      });
      await openEditor();

      expect(panelButton('💡').getAttribute('aria-pressed')).toBe('true');
      expect(panelButton('emojiDefaultIcon').getAttribute('aria-pressed')).toBe('false');
      expect(emojiPlaceholder().hidden).toBe(true);
      expect(panelButton('colorBlue').getAttribute('aria-pressed')).toBe('true');
    });

    it('sets the color from the palette, marks the selected swatch and removes it', async () => {
      await openEditor();
      const blue = panelButton('colorBlue');
      const none = panelButton('colorNone');
      expect(none.getAttribute('aria-pressed')).toBe('true');

      blue.click();
      expect(lastSaved()?.folders.work?.color).toBe('#5b8dd6');
      expect(blue.getAttribute('aria-pressed')).toBe('true');
      expect(none.getAttribute('aria-pressed')).toBe('false');

      none.click();
      expect(lastSaved()?.folders.work).not.toHaveProperty('color');
      expect(blue.getAttribute('aria-pressed')).toBe('false');
    });

    it('keeps the emoji when the color changes', async () => {
      await openEditor();

      panelButton('📚').click();
      panelButton('colorBlue').click();

      expect(lastSaved()?.folders.work).toMatchObject({ emoji: '📚', color: '#5b8dd6' });
    });
  });

  describe('delete folder', () => {
    async function openConfirmation(name: string): Promise<void> {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: `actionDeleteFolder(${name})` }).click();
    }

    it('asks for confirmation, with Cancel focused', async () => {
      await openConfirmation('Specs');

      expect(panel().textContent).toContain('deleteFolderConfirm(Specs)');
      expect(focusedInLayer(layer)).toBe(panelButton('buttonCancel'));
      expect(panelButton('buttonDelete').classList.contains('nfc-button-danger')).toBe(true);
    });

    it('deletes nothing on Cancel', async () => {
      await openConfirmation('Specs');

      panelButton('buttonCancel').click();

      expect(repository.saved).toEqual([]);
      expect(layer.querySelector('[role="dialog"]')).toBeNull();
    });

    it('deletes the folder and moves its content up one level', async () => {
      await openConfirmation('Specs');

      panelButton('buttonDelete').click();

      expect(lastSaved()?.folders).not.toHaveProperty('specs');
      expect(lastSaved()?.conversations[SPECS_CHAT]?.folderId).toBe('work');
      expect(document.activeElement).toBe(folderRow({ root: sidebarSection(), name: 'Work' }));
    });
  });

  describe('conversations', () => {
    it('renames the displayed title of a conversation, ignoring a blank title', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionRenameConversation(Work chat)' }).click();
      expect(panelInput().value).toBe('Work chat');

      typeInto({ input: panelInput(), value: ' ' });
      pressKey({ target: panelInput(), key: 'Enter' });
      expect(repository.saved).toEqual([]);
      expect(layer.querySelector('[role="dialog"]')).not.toBeNull();

      typeInto({ input: panelInput(), value: 'Kick-off' });
      pressKey({ target: panelInput(), key: 'Enter' });
      expect(lastSaved()?.conversations[WORK_CHAT]?.title).toBe('Kick-off');
      expect(layer.querySelector('[role="dialog"]')).toBeNull();
    });

    it('removes a conversation from its folder and focuses the folder row', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });

      action({ root: sidebarSection(), label: 'actionUnfileConversation(Work chat)' }).click();

      expect(lastSaved()?.conversations).not.toHaveProperty(WORK_CHAT);
      expect(document.activeElement).toBe(folderRow({ root: sidebarSection(), name: 'Work' }));
    });
  });

  describe('add conversations', () => {
    function items(): HTMLButtonElement[] {
      return [...panel().querySelectorAll<HTMLButtonElement>('.nfc-adder-item')];
    }

    function itemTitles(): string[] {
      return items().map((item) => item.textContent ?? '');
    }

    it("lists the unfiled conversations of this project's lists, once each", async () => {
      await start({ page: 'project-page', path: PROJECT_PAGE });
      action({ root: sidebarSection(), label: 'actionAddConversations(Specs)' }).click();

      const expected = [0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x21, 0x22].map((n) =>
        nativeTitleOf(fakeId(n)),
      );
      expect(panel().textContent).toContain('panelAddConversationsTitle(Specs)');
      expect(itemTitles()).toEqual(expected);
    });

    it('only lists the lists where a section of the project is mounted', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionAddConversations(Specs)' }).click();

      const expected = [0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11].map((n) => nativeTitleOf(fakeId(n)));
      expect(itemTitles()).toEqual(expected);
    });

    it('filters the list by title', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionAddConversations(Specs)' }).click();
      const wanted = nativeTitleOf(fakeId(0x0d));

      typeInto({ input: panelInput(), value: wanted.toUpperCase() });

      expect(itemTitles()).toEqual([wanted]);
    });

    it('files a clicked conversation, opens the folder and drops it from the list', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionAddConversations(Specs)' }).click();
      const [first] = items();
      const title = nativeTitleOf(fakeId(0x0c));

      first?.click();

      expect(lastSaved()?.conversations[fakeId(0x0c)]).toEqual({ title, folderId: 'specs' });
      expect(lastSaved()?.folders.specs?.open).toBe(true);
      expect(itemTitles()).not.toContain(title);
      expect(layer.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('says when no conversation is available', async () => {
      await start({ page: 'chat-page', path: CHAT_PAGE });
      action({ root: sidebarSection(), label: 'actionAddConversations(Specs)' }).click();

      typeInto({ input: panelInput(), value: 'no conversation has this title' });

      expect(items()).toHaveLength(0);
      expect(panel().textContent).toContain('adderEmpty');
      expect(panel().textContent).toContain('adderHint');
    });
  });

  it('closes the open panel when stopped', async () => {
    await start({ page: 'chat-page', path: CHAT_PAGE });
    action({ root: sidebarSection(), label: 'actionNewFolder' }).click();

    ui?.stop();
    ui = null;

    expect(layer.querySelector('[role="dialog"]')).toBeNull();
  });
});
