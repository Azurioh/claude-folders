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

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';
const CONVERSATION = 'c0ffee00-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const FOLDER_NAME = 'Secret folder';
const CONVERSATION_TITLE = 'Private conversation title';
const EXPORT_DATE = new Date(2026, 9, 19, 10, 0);

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

  /** Starts the popup and waits for its first reads (counts, setting). */
  async function start(backup: PopupBackupMode = { kind: 'inline', saveFile }): Promise<PopupMenu> {
    const started = startPopupMenu({
      document,
      root,
      store: new BrowserFoldersSnapshotStore(),
      hideFiled: new BrowserHideFiledSetting(),
      extensionVersion: '1.2.3',
      locale: 'en',
      now: () => EXPORT_DATE,
      backup,
    });
    page = started;
    await vi.waitFor(() => {
      expect(element('.nfc-overview').getAttribute('aria-busy')).toBe('false');
      expect(hideFiledSwitch().disabled).toBe(false);
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

  /** The overview's counts, as `label: value` pairs. */
  function stats(): string[] {
    return [...root.querySelectorAll('.nfc-stat')].map(
      (stat) =>
        `${stat.querySelector('dt')?.textContent}: ${stat.querySelector('dd')?.textContent}`,
    );
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
    it('shows the logo, the name, the version, every section and the footer', async () => {
      await start();

      const logo = element<HTMLImageElement>('header img');
      expect(logo.getAttribute('src')).toBe('/icon-48.png');
      expect(logo.getAttribute('srcset')).toContain('/icon-96.png 2x');
      expect(logo.alt).toBe('');
      expect(element('h1').textContent).toBe('extName');
      expect(element('header').textContent).toContain('popupVersion(1.2.3)');
      expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
        'sectionStoredTitle',
        'sectionDisplayTitle',
        'sectionBackupTitle',
        'sectionDangerTitle',
      ]);
      for (const section of root.querySelectorAll('section')) {
        const headingId = section.getAttribute('aria-labelledby') ?? '';
        expect(section.querySelector('h2')?.id).toBe(headingId);
      }
      const link = element<HTMLAnchorElement>('footer a');
      expect(link.getAttribute('href')).toBe('https://github.com/Azurioh/nest-for-claude');
      expect(element('footer').textContent).toContain('footerNotAffiliated');
    });

    it('draws a 16px icon before the backup labels and a 12px one after the footer link', async () => {
      await start();

      const backupButtons = [...root.querySelectorAll('button')].filter((button) =>
        ['buttonExportBackup', 'buttonImportBackup'].includes(button.textContent ?? ''),
      );
      expect(backupButtons).toHaveLength(2);
      for (const button of backupButtons) {
        const icon = button.firstElementChild;
        expect(icon?.tagName.toLowerCase()).toBe('svg');
        expect(icon?.getAttribute('width')).toBe('16');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
      }
      const linkIcon = element('footer a').lastElementChild;
      expect(linkIcon?.tagName.toLowerCase()).toBe('svg');
      expect(linkIcon?.getAttribute('width')).toBe('12');
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

  describe('overview', () => {
    it('shows how many projects, folders and filed conversations are stored', async () => {
      await start();

      expect(stats()).toEqual([
        'statProjects(2): 2',
        'statFolders(2): 2',
        'statConversations(2): 2',
      ]);
      expect(root.querySelector('.nfc-empty')).toBeNull();
    });

    it('explains how to create a first folder when there is none', async () => {
      await new BrowserFoldersSnapshotStore().clear();
      await start();

      expect(stats()).toEqual([]);
      expect(element('.nfc-empty').textContent).toContain('emptyTitle');
      expect(element('.nfc-empty').textContent).toContain('emptyHint');
      const link = element<HTMLAnchorElement>('.nfc-empty a');
      expect(link.getAttribute('href')).toBe('https://claude.ai/');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
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
      expect(root.textContent).toContain(
        'exportDone(countProjects(2),countFolders(2),countConversations(2),nest-for-claude-backup-2026-10-19.json)',
      );
    });

    it('makes export the primary action and import the secondary one', async () => {
      await start();

      expect(button('buttonExportBackup').classList).toContain('nfc-button-primary');
      expect(button('buttonImportBackup').classList).toContain('nfc-button-secondary');
    });
  });

  describe('import', () => {
    it('summarizes a valid backup and asks for confirmation with Cancel focused', async () => {
      await start();

      chooseFile(new File([backupText({ [PROJECT_A]: projectState('New') })], 'backup.json'));

      await vi.waitFor(() => {
        expect(queryButton('buttonReplace')).toBeDefined();
      });
      expect(root.textContent).toMatch(
        /importSummary\(.+,countProjects\(1\),countFolders\(1\),countConversations\(1\)\)/,
      );
      expect(root.textContent).toContain('storedSummary(countProjects(2)');
      expect(element('[role="group"]').getAttribute('aria-labelledby')).toBe(
        element('.nfc-confirmation-question').id,
      );
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
      await vi.waitFor(() => {
        expect(stats()).toEqual([
          'statProjects(1): 1',
          'statFolders(1): 1',
          'statConversations(1): 1',
        ]);
      });
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
      await vi.waitFor(() => {
        expect(root.querySelector('.nfc-empty')).not.toBeNull();
      });
      expect(document.activeElement).toBe(button('buttonDeleteAll'));
    });
  });

  describe('on Firefox', () => {
    it('opens the backup page in a tab instead of exporting or importing inline', async () => {
      const openBackupPage = vi.fn();
      await start({ kind: 'tab', openBackupPage });

      expect(root.querySelector('input[type="file"]')).toBeNull();
      expect(queryButton('buttonExportBackup')).toBeUndefined();
      expect(root.textContent).toContain('backupTabHint');
      expect(stats()).toEqual([
        'statProjects(2): 2',
        'statFolders(2): 2',
        'statConversations(2): 2',
      ]);

      button('buttonOpenBackupPage').click();

      expect(openBackupPage).toHaveBeenCalledTimes(1);
    });

    it('refreshes the counts after the data was deleted', async () => {
      await start({ kind: 'tab', openBackupPage: vi.fn() });

      button('buttonDeleteAll').click();
      button('buttonDelete').click();

      await vi.waitFor(() => {
        expect(root.querySelector('.nfc-empty')).not.toBeNull();
      });
    });
  });
});
