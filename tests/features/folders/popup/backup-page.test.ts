// @vitest-environment happy-dom

import { flushPromises, stubI18n } from '@@/tests/features/folders/ui/test-doubles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { serializeBackup } from '@/features/folders/backup/backup-file';
import { startBackupPage } from '@/features/folders/popup/backup-page';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';
const PROJECT = {
  folders: { root: { id: 'root', name: 'Root', parentId: null, open: true } },
  conversations: {},
  sectionOpen: { sidebar: true, projectPage: true },
};

describe('backup page', () => {
  let root: HTMLElement;
  const saveFile = vi.fn();

  function button(label: string): HTMLButtonElement {
    const found = [...root.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === label,
    );
    if (found === undefined) {
      throw new Error(`No button labelled ${label}`);
    }
    return found;
  }

  async function start(): Promise<void> {
    startBackupPage({
      document,
      root,
      store: new BrowserFoldersSnapshotStore(),
      locale: 'en',
      now: () => new Date(2026, 9, 19),
      saveFile,
    });
    await vi.waitFor(() => {
      expect(root.querySelector('.nfc-overview')?.getAttribute('aria-busy')).toBe('false');
    });
  }

  beforeEach(async () => {
    fakeBrowser.reset();
    stubI18n();
    saveFile.mockClear();
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
    await new BrowserFoldersRepository().save({ projectId: PROJECT_A, state: PROJECT });
  });

  afterEach(async () => {
    await flushPromises();
    vi.restoreAllMocks();
  });

  it('shows the overview and the backup section under its title and logo', async () => {
    await start();

    expect(root.querySelector('header img')?.getAttribute('src')).toBe('/icon-48.png');
    expect(root.querySelector('h1')?.textContent).toBe('backupPageTitle');
    expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'sectionStoredTitle',
      'sectionBackupTitle',
    ]);
    expect(root.querySelector('.nfc-stat dd')?.textContent).toBe('1');
  });

  it('exports a backup', async () => {
    await start();

    button('buttonExportBackup').click();

    await vi.waitFor(() => {
      expect(saveFile).toHaveBeenCalledTimes(1);
    });
    expect(saveFile.mock.calls[0]?.[0].fileName).toBe('nest-for-claude-backup-2026-10-19.json');
  });

  it('imports a backup dropped on the drop zone, after confirmation', async () => {
    await start();
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        [
          serializeBackup({
            snapshot: { projects: { [PROJECT_B]: PROJECT }, hideFiled: true },
            exportedAt: new Date('2026-10-01T08:00:00.000Z'),
          }),
        ],
        'backup.json',
      ),
    );
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: transfer });

    root.querySelector('.nfc-drop-zone')?.dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      expect(document.activeElement?.textContent).toBe('buttonCancel');
    });
    button('buttonReplace').click();
    await vi.waitFor(async () => {
      expect(await new BrowserFoldersSnapshotStore().read()).toEqual({
        projects: { [PROJECT_B]: PROJECT },
        hideFiled: true,
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('importDone(');
    });
  });
});
