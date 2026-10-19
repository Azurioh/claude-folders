// @vitest-environment happy-dom

import { flushPromises, stubI18n } from '@@/tests/features/folders/ui/test-doubles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { BACKUP_MAX_BYTES, serializeBackup } from '@/features/folders/backup/backup-file';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import {
  type PopupBackupMode,
  type PopupMenu,
  startPopupMenu,
} from '@/features/folders/popup/popup-menu';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';
const CONVERSATION = 'c0ffee00-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const FOLDER_NAME = 'Secret folder';
const CONVERSATION_TITLE = 'Private conversation title';
const EXPORT_DATE = new Date(2026, 9, 19, 10, 0);
const PAGE_DIAGNOSTIC: DomDiagnostic = {
  chatLinks: 12,
  projectLinks: 3,
  expandedSidebarProjects: 1,
  projectRecentsFound: false,
  pageKind: 'chat',
};

function projectState(name: string): ProjectFolders {
  return {
    folders: { root: { id: 'root', name, parentId: null, open: true } },
    conversations: { [CONVERSATION]: { title: CONVERSATION_TITLE, folderId: 'root' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

async function storedEverything(): Promise<Record<string, unknown>> {
  return fakeBrowser.storage.local.get(null);
}

function backupText(projects: Record<string, ProjectFolders>): string {
  return serializeBackup({
    snapshot: { projects, hideFiled: false },
    exportedAt: new Date('2026-10-01T08:00:00.000Z'),
  });
}

describe('popup menu', () => {
  let page: PopupMenu | null = null;
  let root: HTMLElement;
  const saveFile = vi.fn();
  const copyText = vi.fn(async (_text: string): Promise<void> => undefined);
  const pageDiagnostic = vi.fn(async (): Promise<DomDiagnostic | null> => PAGE_DIAGNOSTIC);

  /** Starts the popup and waits for its first reads (counts, setting, diagnostic). */
  async function start(backup: PopupBackupMode = { kind: 'inline', saveFile }): Promise<PopupMenu> {
    const started = startPopupMenu({
      document,
      root,
      store: new BrowserFoldersSnapshotStore(),
      hideFiled: new BrowserHideFiledSetting(),
      pageDiagnostic,
      extensionVersion: '1.2.3',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
      locale: 'en',
      now: () => EXPORT_DATE,
      backup,
      copyText,
    });
    page = started;
    await vi.waitFor(() => {
      expect(element('.nfc-summary').textContent).not.toBe('');
      expect(hideFiledSwitch().disabled).toBe(false);
      expect(button('buttonCopyDiagnostic').disabled).toBe(false);
    });
    return started;
  }

  function button(label: string): HTMLButtonElement {
    const found = [...root.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === label,
    );
    if (found === undefined) {
      throw new Error(`No button labelled ${label}`);
    }
    return found;
  }

  function queryButton(label: string): HTMLButtonElement | undefined {
    return [...root.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === label,
    );
  }

  function element<T extends Element>(selector: string): T {
    const found = root.querySelector<T>(selector);
    if (found === null) {
      throw new Error(`No element matches ${selector}`);
    }
    return found;
  }

  function hideFiledSwitch(): HTMLInputElement {
    return element<HTMLInputElement>('input[role="switch"]');
  }

  function chooseFile(file: File): void {
    const input = element<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  beforeEach(async () => {
    fakeBrowser.reset();
    stubI18n();
    saveFile.mockClear();
    copyText.mockClear();
    pageDiagnostic.mockClear();
    pageDiagnostic.mockResolvedValue(PAGE_DIAGNOSTIC);
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
    const repository = new BrowserFoldersRepository();
    await repository.save({ projectId: PROJECT_A, state: projectState(FOLDER_NAME) });
    await repository.save({ projectId: PROJECT_B, state: projectState('Other') });
  });

  afterEach(async () => {
    page?.stop();
    await flushPromises();
    page = null;
    vi.restoreAllMocks();
  });

  describe('structure', () => {
    it('shows the name, the version, every section and the footer', async () => {
      await start();

      expect(element('h1').textContent).toBe('extName');
      expect(root.textContent).toContain('popupVersion(1.2.3)');
      expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
        'sectionDisplayTitle',
        'sectionBackupTitle',
        'sectionDangerTitle',
      ]);
      expect(element('footer').contains(button('buttonCopyDiagnostic'))).toBe(true);
      const link = element<HTMLAnchorElement>('footer a');
      expect(link.getAttribute('href')).toBe('https://github.com/Azurioh/nest-for-claude');
      expect(element('footer').textContent).toContain('footerNotAffiliated');
    });

    it('starts with focus on the menu, so nothing is toggled by accident', async () => {
      await start();

      expect(document.activeElement).toBe(element('main'));
    });

    it('accepts no dropped file inside the popup', async () => {
      await start();

      expect(root.querySelector('.nfc-drop-zone')).toBeNull();
    });
  });

  describe('display setting', () => {
    it('reflects the stored value and saves both ways', async () => {
      await new BrowserHideFiledSetting().save(false);
      await start();
      await vi.waitFor(() => {
        expect(hideFiledSwitch().disabled).toBe(false);
      });
      expect(hideFiledSwitch().checked).toBe(false);

      hideFiledSwitch().click();
      await vi.waitFor(async () => {
        expect(await new BrowserHideFiledSetting().load()).toBe(true);
      });

      hideFiledSwitch().click();
      await vi.waitFor(async () => {
        expect(await new BrowserHideFiledSetting().load()).toBe(false);
      });
    });

    it('follows a change made elsewhere', async () => {
      await start();
      await vi.waitFor(() => {
        expect(hideFiledSwitch().checked).toBe(true);
      });

      await new BrowserHideFiledSetting().save(false);

      await vi.waitFor(() => {
        expect(hideFiledSwitch().checked).toBe(false);
      });
    });
  });

  describe('export', () => {
    it('downloads a dated backup of everything stored and reports the counts', async () => {
      await start();
      await vi.waitFor(() => {
        expect(root.textContent).toContain('storedSummary(countProjects(2)');
      });

      button('buttonExportBackup').click();

      await vi.waitFor(() => {
        expect(saveFile).toHaveBeenCalledTimes(1);
      });
      const [file] = saveFile.mock.calls[0] ?? [];
      expect(file.fileName).toBe('nest-for-claude-backup-2026-10-19.json');
      expect(JSON.parse(file.content).projects).toEqual({
        [PROJECT_A]: projectState(FOLDER_NAME),
        [PROJECT_B]: projectState('Other'),
      });
      expect(root.textContent).toContain('exportDone(');
    });
  });

  describe('import', () => {
    it('summarizes a valid backup and asks for confirmation with Cancel focused', async () => {
      await start();

      chooseFile(new File([backupText({ [PROJECT_A]: projectState('New') })], 'backup.json'));

      await vi.waitFor(() => {
        expect(queryButton('buttonReplace')).toBeDefined();
      });
      expect(root.textContent).toContain('importSummary(');
      expect(root.textContent).toContain('importConfirm');
      expect(document.activeElement).toBe(button('buttonCancel'));
    });

    it('writes nothing when cancelled and gives focus back to the import button', async () => {
      await start();
      const before = await storedEverything();
      chooseFile(new File([backupText({ [PROJECT_A]: projectState('New') })], 'backup.json'));
      await vi.waitFor(() => {
        expect(queryButton('buttonCancel')).toBeDefined();
      });

      button('buttonCancel').click();

      expect(queryButton('buttonReplace')).toBeUndefined();
      expect(document.activeElement).toBe(button('buttonImportBackup'));
      expect(await storedEverything()).toEqual(before);
    });

    it('cancels with Escape', async () => {
      await start();
      chooseFile(new File([backupText({})], 'backup.json'));
      await vi.waitFor(() => {
        expect(queryButton('buttonCancel')).toBeDefined();
      });

      button('buttonCancel').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );

      expect(queryButton('buttonReplace')).toBeUndefined();
      expect(document.activeElement).toBe(button('buttonImportBackup'));
    });

    it('replaces every project and the setting on confirm, removing absent projects', async () => {
      await start();
      chooseFile(new File([backupText({ [PROJECT_A]: projectState('New') })], 'backup.json'));
      await vi.waitFor(() => {
        expect(queryButton('buttonReplace')).toBeDefined();
      });

      button('buttonReplace').click();

      await vi.waitFor(() => {
        expect(root.textContent).toContain('importDone(');
      });
      expect(await storedEverything()).toEqual({
        [`projects:${PROJECT_A}`]: projectState('New'),
        [`projects:${PROJECT_A}$`]: { v: 1 },
        'settings:hideFiled': false,
        'settings:hideFiled$': { v: 1 },
      });
      expect(hideFiledSwitch().checked).toBe(false);
      expect(root.textContent).toContain('storedSummary(countProjects(1)');
      expect(document.activeElement).toBe(button('buttonImportBackup'));
    });

    const invalidFiles: [string, string, () => File][] = [
      ['text that is not JSON', 'backupErrorNotJson', () => new File(['{ nope'], 'a.json')],
      [
        'another format',
        'backupErrorWrongFormat',
        () => new File([JSON.stringify({ format: 'other', version: 1 })], 'a.json'),
      ],
      [
        'a newer version',
        'backupErrorUnsupportedVersion',
        () => new File([JSON.stringify({ ...JSON.parse(backupText({})), version: 2 })], 'a.json'),
      ],
      [
        'a project id that is not a UUID',
        'backupErrorInvalidProjectId(1)',
        () => new File([backupText({ 'not-a-uuid': projectState('X') })], 'a.json'),
      ],
      [
        'an invalid folder',
        'backupErrorInvalidProject(1)',
        () =>
          new File(
            [
              backupText({
                [PROJECT_A]: {
                  ...projectState('X'),
                  folders: { root: { id: 'other', name: 'X', parentId: null, open: true } },
                },
              }),
            ],
            'a.json',
          ),
      ],
      [
        'a file over the size limit',
        `backupErrorTooLarge(${BACKUP_MAX_BYTES / 1024 / 1024})`,
        () => {
          const file = new File([backupText({})], 'a.json');
          Object.defineProperty(file, 'size', { value: BACKUP_MAX_BYTES + 1 });
          return file;
        },
      ],
    ];

    for (const [label, message, file] of invalidFiles) {
      it(`rejects ${label} with an inline error and writes nothing`, async () => {
        await start();
        const before = await storedEverything();

        chooseFile(file());

        await vi.waitFor(() => {
          expect(element('[role="alert"]').textContent).toBe(message);
        });
        expect(queryButton('buttonReplace')).toBeUndefined();
        expect(await storedEverything()).toEqual(before);
      });
    }
  });

  describe('delete all data', () => {
    it('asks for confirmation with Cancel focused and deletes nothing on cancel', async () => {
      await start();
      const before = await storedEverything();

      button('buttonDeleteAll').click();

      expect(root.textContent).toContain('deleteAllConfirm');
      const cancel = button('buttonCancel');
      expect(document.activeElement).toBe(cancel);
      cancel.click();
      expect(queryButton('buttonDelete')).toBeUndefined();
      expect(document.activeElement).toBe(button('buttonDeleteAll'));
      expect(await storedEverything()).toEqual(before);
    });

    it('deletes every project and the setting on confirm', async () => {
      await new BrowserHideFiledSetting().save(false);
      await start();

      button('buttonDeleteAll').click();
      button('buttonDelete').click();

      await vi.waitFor(() => {
        expect(root.textContent).toContain('deleteAllDone');
      });
      expect(await storedEverything()).toEqual({});
      expect(root.textContent).toContain('storedSummary(countProjects(0)');
      expect(document.activeElement).toBe(button('buttonDeleteAll'));
    });
  });

  describe('copy diagnostic', () => {
    async function copied(): Promise<string> {
      button('buttonCopyDiagnostic').click();
      await vi.waitFor(() => {
        expect(copyText).toHaveBeenCalledTimes(1);
      });
      const [text] = copyText.mock.calls[0] ?? [];
      if (typeof text !== 'string') {
        throw new Error('Nothing copied');
      }
      return text;
    }

    it('copies versions, counts and the claude.ai page, without ids, names or titles', async () => {
      await start();

      const text = await copied();

      expect(text).toContain('Nest for Claude 1.2.3');
      expect(text).toContain('Browser: Firefox 131');
      expect(text).toContain('Stored: 2 projects, 2 folders, 2 filed conversations');
      expect(text).toContain('Hide filed conversations: on');
      expect(text).toContain('claude.ai tab: conversation');
      expect(text).toContain('Conversation links: 12');
      for (const secret of [PROJECT_A, PROJECT_B, CONVERSATION, FOLDER_NAME, CONVERSATION_TITLE]) {
        expect(text).not.toContain(secret);
      }
      await vi.waitFor(() => {
        expect(root.textContent).toContain('diagnosticCopied');
      });
    });

    it('says when no claude.ai tab answered', async () => {
      pageDiagnostic.mockResolvedValue(null);
      await start();

      expect(await copied()).toContain('claude.ai tab: none found');
    });

    it('collects the diagnostic again after the data was deleted', async () => {
      await start();
      button('buttonDeleteAll').click();
      button('buttonDelete').click();
      await vi.waitFor(() => {
        expect(pageDiagnostic).toHaveBeenCalledTimes(2);
      });
      await flushPromises();

      expect(await copied()).toContain('Stored: 0 projects, 0 folders, 0 filed conversations');
    });

    it('shows the text selected in a read-only field when copying fails', async () => {
      copyText.mockRejectedValueOnce(new Error('denied'));
      await start();

      button('buttonCopyDiagnostic').click();

      await vi.waitFor(() => {
        expect(root.textContent).toContain('copyFailed');
      });
      const fallback = element<HTMLTextAreaElement>('textarea');
      expect(fallback.hidden).toBe(false);
      expect(fallback.readOnly).toBe(true);
      expect(fallback.value).toContain('Nest for Claude 1.2.3');
      expect(document.activeElement).toBe(fallback);
    });
  });

  describe('on Firefox', () => {
    it('opens the backup page in a tab instead of exporting or importing inline', async () => {
      const openBackupPage = vi.fn();
      await start({ kind: 'tab', openBackupPage });

      expect(root.querySelector('input[type="file"]')).toBeNull();
      expect(queryButton('buttonExportBackup')).toBeUndefined();
      expect(root.textContent).toContain('backupTabHint');
      expect(root.textContent).toContain('storedSummary(countProjects(2)');

      button('buttonOpenBackupPage').click();

      expect(openBackupPage).toHaveBeenCalledTimes(1);
    });

    it('refreshes the counts after the data was deleted', async () => {
      await start({ kind: 'tab', openBackupPage: vi.fn() });

      button('buttonDeleteAll').click();
      button('buttonDelete').click();

      await vi.waitFor(() => {
        expect(root.textContent).toContain('storedSummary(countProjects(0)');
      });
    });
  });
});
