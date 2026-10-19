// @vitest-environment happy-dom

import {
  createPanelLayer,
  flushPromises,
  InMemoryFoldersRepository,
  InMemoryHideFiledSetting,
  ManualClock,
  pressKey,
  SequentialFolderIdProvider,
  showFixture,
  stubI18n,
} from '@@/tests/features/folders/ui/test-doubles';
import { elementOf, fakeId } from '@@/tests/shared/claude-dom/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { FOCUS_KEY_ATTRIBUTE } from '@/features/folders/ui/focus-key';
import { type FoldersUi, startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT = fakeId(9);
const CHAT_PAGE = `/chat/${fakeId(0x0a)}`;
const WORK_CHAT = fakeId(0x0a);
const SIDEBAR_SECTION_SELECTOR = `[data-group-list="${PROJECT}"] ul > ${OWN_UI_SELECTOR}`;

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: false },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: { [WORK_CHAT]: { title: 'Work chat', folderId: 'work' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function section(): HTMLElement {
  return elementOf({ root: document, selector: SIDEBAR_SECTION_SELECTOR });
}

function moveButton(label: string): HTMLButtonElement {
  const button = section().querySelector(`button[aria-label="actionMove(${label})"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No move action for ${label}`);
  }
  return button;
}

describe('"Move to…" panel', () => {
  let ui: FoldersUi | null = null;
  let repository: InMemoryFoldersRepository;
  let layer: HTMLElement;

  function panel(): HTMLElement {
    return elementOf({ root: layer, selector: '[role="dialog"]' });
  }

  function destinations(): HTMLButtonElement[] {
    return [...panel().querySelectorAll<HTMLButtonElement>('.nfc-adder-list button')];
  }

  function destination(label: string): HTMLButtonElement {
    const button = destinations().find(
      (candidate) => candidate.querySelector('.nfc-adder-title')?.textContent === label,
    );
    if (button === undefined) {
      throw new Error(`No destination ${label}`);
    }
    return button;
  }

  function labels(): (string | null | undefined)[] {
    return destinations().map((button) => button.querySelector('.nfc-adder-title')?.textContent);
  }

  function focusedKey(): string | null {
    return document.activeElement?.getAttribute(FOCUS_KEY_ATTRIBUTE) ?? null;
  }

  beforeEach(async () => {
    stubI18n();
    repository = new InMemoryFoldersRepository({ [PROJECT]: sampleProject() });
    showFixture('chat-page');
    layer = createPanelLayer();
    const clock = new ManualClock();
    ui = startFoldersUi({
      document,
      pathname: () => CHAT_PAGE,
      repository,
      hideFiled: new InMemoryHideFiledSetting(true),
      panelLayer: layer,
      folderIds: new SequentialFolderIdProvider(),
      now: () => clock.now(),
    });
    await flushPromises();
  });

  afterEach(() => {
    ui?.stop();
    ui = null;
    vi.restoreAllMocks();
  });

  it('lists the destinations of a folder without itself nor its descendants', () => {
    moveButton('Work').click();

    expect(panel().textContent).toContain('panelMoveTitle(Work)');
    expect(labels()).toEqual(['moveDestinationRoot', 'Later']);
    expect(destination('moveDestinationRoot').getAttribute('aria-current')).toBe('true');
    expect(destination('moveDestinationRoot').textContent).toContain('moveCurrentLocation');
    expect(destination('Later').hasAttribute('aria-current')).toBe(false);
  });

  it('moves the folder and gives focus back to its row', () => {
    moveButton('Specs').click();

    destination('Later').click();

    expect(repository.saved.at(-1)?.state.folders.specs?.parentId).toBe('later');
    expect(layer.querySelector('[role="dialog"]')).toBeNull();
    expect(focusedKey()).toBe('folder:specs');
  });

  it('marks the folder of a conversation as current and unfiles it on "No folder"', () => {
    moveButton('Work chat').click();
    expect(labels()).toEqual(['moveDestinationNoFolder', 'Later', 'Work', 'Work / Specs']);
    expect(destination('Work').getAttribute('aria-current')).toBe('true');

    destination('moveDestinationNoFolder').click();

    expect(repository.saved.at(-1)?.state.conversations[WORK_CHAT]).toBeUndefined();
    expect(focusedKey()).toBe('folder:work');
  });

  it('moves a conversation into a nested folder, revealing it, and focuses its row', () => {
    moveButton('Work chat').click();

    destination('Work / Specs').click();

    const state = repository.saved.at(-1)?.state;
    expect(state?.conversations[WORK_CHAT]?.folderId).toBe('specs');
    expect(state?.folders.specs?.open).toBe(true);
    expect(focusedKey()).toBe(`conversation:${WORK_CHAT}`);
  });

  it('filters the destinations', () => {
    moveButton('Work chat').click();
    const filter = elementOf({ root: panel(), selector: 'input' });
    if (!(filter instanceof HTMLInputElement)) {
      throw new Error('No filter field');
    }
    expect(filter.getAttribute('aria-label')).toBe('fieldFilterFolders');

    filter.value = 'spe';
    filter.dispatchEvent(new Event('input', { bubbles: true }));

    expect(labels()).toEqual(['Work / Specs']);
  });

  it('closes on Escape without moving and focuses the move button again', () => {
    moveButton('Later').click();

    pressKey({ target: panel(), key: 'Escape' });

    expect(repository.saved).toHaveLength(0);
    expect(focusedKey()).toBe('move:folder:later');
  });

  it('closes without saving when the current location is chosen', () => {
    moveButton('Later').click();

    destination('moveDestinationRoot').click();

    expect(repository.saved).toHaveLength(0);
    expect(focusedKey()).toBe('folder:later');
  });
});
