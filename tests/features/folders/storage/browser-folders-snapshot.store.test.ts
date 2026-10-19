import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserFoldersSnapshotStore } from '@/features/folders/storage/browser-folders-snapshot.store';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';
const PROJECT_C = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function sampleProject(name: string): ProjectFolders {
  return {
    folders: { root: { id: 'root', name, parentId: null, open: true, color: 'blue' } },
    conversations: { 'conv-1': { title: `${name} chat`, folderId: 'root' } },
    sectionOpen: { sidebar: true, projectPage: false },
  };
}

describe('BrowserFoldersSnapshotStore', () => {
  const store = new BrowserFoldersSnapshotStore();
  const repository = new BrowserFoldersRepository();
  const hideFiled = new BrowserHideFiledSetting();

  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads an empty storage as no project and the default setting', async () => {
    expect(await store.read()).toEqual({ projects: {}, hideFiled: true });
  });

  it('reads every stored project and the setting, ignoring unrelated keys', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject('A') });
    await repository.save({ projectId: PROJECT_B, state: sampleProject('B') });
    await hideFiled.save(false);
    await fakeBrowser.storage.local.set({ 'projects:not-a-uuid': sampleProject('X'), other: 1 });

    expect(await store.read()).toEqual({
      projects: { [PROJECT_A]: sampleProject('A'), [PROJECT_B]: sampleProject('B') },
      hideFiled: false,
    });
  });

  it('reads a corrupted project as an empty project, without writing it back', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await fakeBrowser.storage.local.set({ [`projects:${PROJECT_A}`]: 'garbage' });

    expect(await store.read()).toEqual({
      projects: { [PROJECT_A]: emptyProject() },
      hideFiled: true,
    });
    expect(
      (await fakeBrowser.storage.local.get(`projects:${PROJECT_A}`))[`projects:${PROJECT_A}`],
    ).toBe('garbage');
  });

  it('replaces every project, removes absent ones with their metadata and writes versions', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject('A') });
    await repository.save({ projectId: PROJECT_B, state: sampleProject('B') });

    await store.replace({
      projects: { [PROJECT_B]: sampleProject('B2'), [PROJECT_C]: sampleProject('C') },
      hideFiled: false,
    });

    expect(await fakeBrowser.storage.local.get(null)).toEqual({
      [`projects:${PROJECT_B}`]: sampleProject('B2'),
      [`projects:${PROJECT_B}$`]: { v: 1 },
      [`projects:${PROJECT_C}`]: sampleProject('C'),
      [`projects:${PROJECT_C}$`]: { v: 1 },
      'settings:hideFiled': false,
      'settings:hideFiled$': { v: 1 },
    });
  });

  it('clears every project and the setting', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject('A') });
    await hideFiled.save(false);

    await store.clear();

    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect(await store.read()).toEqual({ projects: {}, hideFiled: true });
  });
});
