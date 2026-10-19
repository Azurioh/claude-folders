import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { serializeBackup } from '@/features/folders/backup/backup-file';
import { parseBackup } from '@/features/folders/backup/backup-file.parser';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';

describe('backup round trip', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('restores exactly the storage it exported, after the data was deleted', async () => {
    const repository = new BrowserFoldersRepository();
    await repository.save({
      projectId: PROJECT_A,
      state: {
        folders: {
          root: { id: 'root', name: 'Root', parentId: null, open: true, emoji: '📁' },
          child: { id: 'child', name: 'Child', parentId: 'root', open: false, color: 'teal' },
        },
        conversations: { c1: { title: 'First', folderId: 'child' } },
        sectionOpen: { sidebar: false, projectPage: true },
      },
    });
    await repository.save({
      projectId: PROJECT_B,
      state: { folders: {}, conversations: {}, sectionOpen: { sidebar: true, projectPage: true } },
    });
    await new BrowserHideFiledSetting().save(false);
    const store = new BrowserFoldersSnapshotStore();
    const before = await fakeBrowser.storage.local.get(null);

    const text = serializeBackup({ snapshot: await store.read(), exportedAt: new Date() });
    await store.clear();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      throw new Error(`Backup rejected: ${parsed.error.code}`);
    }
    await store.replace(parsed.backup.snapshot);

    expect(await fakeBrowser.storage.local.get(null)).toEqual(before);
  });
});
