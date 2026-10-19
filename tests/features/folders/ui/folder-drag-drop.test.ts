// @vitest-environment happy-dom

import {
  createPanelLayer,
  fireDrag,
  flushPromises,
  InMemoryFoldersRepository,
  InMemoryHideFiledSetting,
  ManualClock,
  SequentialFolderIdProvider,
  showFixture,
  stubI18n,
} from '@@/tests/features/folders/ui/test-doubles';
import { elementOf, fakeId } from '@@/tests/shared/claude-dom/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { writeDragPayload } from '@/features/folders/ui/drag-payload';
import { type FoldersUi, startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { conversationTitle } from '@/shared/claude-dom/conversation-title';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT = fakeId(9);
const OTHER_PROJECT = fakeId(0x99);
const CHAT_PAGE = `/chat/${fakeId(0x0a)}`;
const WORK_CHAT = fakeId(0x0a);
/** Shown in the project's sidebar list, not filed. */
const PROJECT_CHAT = fakeId(0x0c);
/** Shown in the sidebar, outside the project. */
const OUTSIDE_CHAT = fakeId(0x12);
const SIDEBAR_LIST_SELECTOR = `[data-group-list="${PROJECT}"] ul`;
const SIDEBAR_SECTION_SELECTOR = `${SIDEBAR_LIST_SELECTOR} > ${OWN_UI_SELECTOR}`;
const DRAG_EXPIRED_MS = 61_000;

function sampleProject(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: true },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: { [WORK_CHAT]: { title: 'Work chat', folderId: 'work' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function section(): HTMLElement {
  return elementOf({ root: document, selector: SIDEBAR_SECTION_SELECTOR });
}

function folderRow(name: string): HTMLButtonElement {
  const row = [...section().querySelectorAll<HTMLButtonElement>('.nfc-folder')].find(
    (candidate) => candidate.querySelector('.nfc-label')?.textContent === name,
  );
  if (row === undefined) {
    throw new Error(`No folder row named ${name}`);
  }
  return row;
}

function header(): HTMLElement {
  return elementOf({ root: section(), selector: 'button.nfc-header' });
}

function conversationRow(conversationId: string): HTMLElement {
  return elementOf({ root: section(), selector: `a.nfc-conv[href="/chat/${conversationId}"]` });
}

function nativeLink(conversationId: string): HTMLAnchorElement {
  const link = nativeChatLinks(document).find(
    (candidate) => chatIdOf(candidate) === conversationId,
  );
  if (link === undefined) {
    throw new Error(`No native link to ${conversationId}`);
  }
  return link;
}

describe('drag and drop', () => {
  let ui: FoldersUi | null = null;
  let repository: InMemoryFoldersRepository;
  let clock: ManualClock;

  function saved(): ProjectFolders | undefined {
    return repository.saved.at(-1)?.state;
  }

  /** Drags `source` and drops it on `target`; returns the `dragover` event of the target. */
  function dragAndDrop(params: {
    source: Element;
    target: Element;
    transfer?: DataTransfer;
  }): Event {
    const transfer = params.transfer ?? new DataTransfer();
    fireDrag({ target: params.source, type: 'dragstart', transfer });
    fireDrag({ target: params.target, type: 'dragenter', transfer });
    const over = fireDrag({ target: params.target, type: 'dragover', transfer });
    fireDrag({ target: params.target, type: 'drop', transfer });
    fireDrag({ target: params.source, type: 'dragend', transfer });
    return over;
  }

  beforeEach(async () => {
    stubI18n();
    repository = new InMemoryFoldersRepository({ [PROJECT]: sampleProject() });
    clock = new ManualClock();
    showFixture('chat-page');
    ui = startFoldersUi({
      document,
      pathname: () => CHAT_PAGE,
      repository,
      hideFiled: new InMemoryHideFiledSetting(false),
      panelLayer: createPanelLayer(),
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

  describe('folders of ours', () => {
    it('moves a folder into another one and opens it', () => {
      const over = dragAndDrop({ source: folderRow('Work'), target: folderRow('Later') });

      expect(over.defaultPrevented).toBe(true);
      expect(saved()?.folders.work?.parentId).toBe('later');
      expect(saved()?.folders.later?.open).toBe(true);
    });

    it('moves a folder to the root when dropped on the section header', () => {
      dragAndDrop({ source: folderRow('Specs'), target: header() });

      expect(saved()?.folders.specs?.parentId).toBeNull();
    });

    it('refuses a folder dropped into its own descendant, without throwing', () => {
      const over = dragAndDrop({ source: folderRow('Work'), target: folderRow('Specs') });

      expect(over.defaultPrevented).toBe(false);
      expect(repository.saved).toHaveLength(0);
      expect(folderRow('Specs').classList.contains('nfc-over')).toBe(false);
    });

    it('carries the project and the folder under its own data type', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: folderRow('Work'), type: 'dragstart', transfer });

      expect(transfer.types).toContain('application/x-nfc-folder');
      expect(transfer.effectAllowed).toBe('move');
    });
  });

  describe('conversations of ours', () => {
    it('moves a filed conversation to another folder', () => {
      dragAndDrop({ source: conversationRow(WORK_CHAT), target: folderRow('Later') });

      expect(saved()?.conversations[WORK_CHAT]).toEqual({ title: 'Work chat', folderId: 'later' });
      expect(saved()?.folders.later?.open).toBe(true);
    });

    it('unfiles a conversation dropped on the section header', () => {
      dragAndDrop({ source: conversationRow(WORK_CHAT), target: header() });

      expect(saved()?.conversations[WORK_CHAT]).toBeUndefined();
    });

    it('ignores a payload from another project', () => {
      const transfer = new DataTransfer();
      writeDragPayload({
        transfer,
        payload: { kind: 'folder', projectId: OTHER_PROJECT, folderId: 'later' },
      });

      const over = fireDrag({ target: folderRow('Work'), type: 'dragover', transfer });
      fireDrag({ target: folderRow('Work'), type: 'drop', transfer });

      expect(over.defaultPrevented).toBe(false);
      expect(repository.saved).toHaveLength(0);
    });
  });

  describe('native conversations', () => {
    it("files a conversation of the project's list, titled from its row", () => {
      const link = nativeLink(PROJECT_CHAT);
      const transfer = new DataTransfer();
      transfer.setData('text/uri-list', `https://claude.ai/chat/${PROJECT_CHAT}`);

      const over = dragAndDrop({ source: link, target: folderRow('Later'), transfer });

      expect(over.defaultPrevented).toBe(true);
      expect(saved()?.conversations[PROJECT_CHAT]).toEqual({
        title: conversationTitle(link),
        folderId: 'later',
      });
    });

    it('keeps the stored title of a conversation already filed', () => {
      dragAndDrop({ source: nativeLink(WORK_CHAT), target: folderRow('Later') });

      expect(saved()?.conversations[WORK_CHAT]).toEqual({ title: 'Work chat', folderId: 'later' });
    });

    it('ignores a conversation from outside the project', () => {
      const over = dragAndDrop({ source: nativeLink(OUTSIDE_CHAT), target: folderRow('Later') });

      expect(over.defaultPrevented).toBe(false);
      expect(repository.saved).toHaveLength(0);
    });

    it('falls back to the conversation remembered at dragstart when the drop has no URL', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: nativeLink(PROJECT_CHAT), type: 'dragstart', transfer });

      fireDrag({ target: folderRow('Later'), type: 'dragover', transfer });
      fireDrag({ target: folderRow('Later'), type: 'drop', transfer });

      expect(saved()?.conversations[PROJECT_CHAT]?.folderId).toBe('later');
    });

    it('forgets the remembered conversation once it has expired', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: nativeLink(PROJECT_CHAT), type: 'dragstart', transfer });
      clock.advance(DRAG_EXPIRED_MS);

      const over = fireDrag({ target: folderRow('Later'), type: 'dragover', transfer });
      fireDrag({ target: folderRow('Later'), type: 'drop', transfer });

      expect(over.defaultPrevented).toBe(false);
      expect(repository.saved).toHaveLength(0);
    });

    it("makes the project's native links draggable and restores them on stop", () => {
      const link = nativeLink(PROJECT_CHAT);
      const outside = nativeLink(OUTSIDE_CHAT);
      expect(link.getAttribute('draggable')).toBe('true');
      expect(outside.getAttribute('draggable')).toBe('false');

      ui?.stop();

      expect(link.getAttribute('draggable')).toBe('false');
    });
  });

  describe('feedback', () => {
    it('shows the drop affordance and the hovered target, and clears them on dragend', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: folderRow('Work'), type: 'dragstart', transfer });
      expect(section().hasAttribute('data-nfc-dragging')).toBe(true);

      fireDrag({ target: folderRow('Later'), type: 'dragover', transfer });
      expect(folderRow('Later').classList.contains('nfc-over')).toBe(true);

      fireDrag({ target: header(), type: 'dragover', transfer });
      expect(folderRow('Later').classList.contains('nfc-over')).toBe(false);
      expect(header().classList.contains('nfc-over')).toBe(true);

      fireDrag({ target: folderRow('Work'), type: 'dragend', transfer });
      expect(section().hasAttribute('data-nfc-dragging')).toBe(false);
      expect(document.querySelector('.nfc-over')).toBeNull();
    });

    it('never prevents dragover outside a drop target', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: folderRow('Work'), type: 'dragstart', transfer });

      const over = fireDrag({ target: nativeLink(OUTSIDE_CHAT), type: 'dragover', transfer });

      expect(over.defaultPrevented).toBe(false);
    });

    it('shows no affordance for a native conversation from outside the project', () => {
      fireDrag({
        target: nativeLink(OUTSIDE_CHAT),
        type: 'dragstart',
        transfer: new DataTransfer(),
      });

      expect(section().hasAttribute('data-nfc-dragging')).toBe(false);
    });

    it('stops listening and clears the feedback on stop', () => {
      const transfer = new DataTransfer();
      fireDrag({ target: folderRow('Work'), type: 'dragstart', transfer });
      const target = folderRow('Later');
      fireDrag({ target, type: 'dragover', transfer });

      ui?.stop();
      ui = null;

      expect(target.classList.contains('nfc-over')).toBe(false);
      expect(fireDrag({ target, type: 'dragover', transfer }).defaultPrevented).toBe(false);
    });
  });
});
