import {
  flushPromises,
  InMemoryFoldersRepository,
} from '@@/tests/features/folders/ui/test-doubles';
import { describe, expect, it, vi } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { toggleFolderOpen } from '@/features/folders/domain/folders.operations';
import { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';

const PROJECT = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';

function withFolder(open: boolean): ProjectFolders {
  return {
    ...emptyProject(),
    folders: { work: { id: 'work', name: 'Work', parentId: null, open } },
  };
}

describe('ProjectFoldersStore', () => {
  it('loads a project on first access and notifies once it is available', async () => {
    const repository = new InMemoryFoldersRepository({ [PROJECT]: withFolder(true) });
    const onChange = vi.fn();
    const store = new ProjectFoldersStore({ repository, onChange });

    expect(store.find(PROJECT)).toBeNull();
    await flushPromises();

    expect(store.find(PROJECT)).toEqual(withFolder(true));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('applies an operation, then persists the new tree', async () => {
    const repository = new InMemoryFoldersRepository({ [PROJECT]: withFolder(true) });
    const store = new ProjectFoldersStore({ repository, onChange: vi.fn() });
    store.find(PROJECT);
    await flushPromises();

    const applied = store.apply({
      projectId: PROJECT,
      operation: (state) => toggleFolderOpen({ state, folderId: 'work' }),
    });

    expect(applied).toBe(true);
    expect(store.find(PROJECT)).toEqual(withFolder(false));
    expect(repository.saved).toEqual([{ projectId: PROJECT, state: withFolder(false) }]);
  });

  it('ignores a rejected operation', async () => {
    const repository = new InMemoryFoldersRepository({ [PROJECT]: withFolder(true) });
    const store = new ProjectFoldersStore({ repository, onChange: vi.fn() });
    store.find(PROJECT);
    await flushPromises();

    const applied = store.apply({
      projectId: PROJECT,
      operation: (state) => toggleFolderOpen({ state, folderId: 'missing' }),
    });

    expect(applied).toBe(false);
    expect(repository.saved).toEqual([]);
  });

  it('follows changes written by another tab', async () => {
    const repository = new InMemoryFoldersRepository({});
    const onChange = vi.fn();
    const store = new ProjectFoldersStore({ repository, onChange });
    store.find(PROJECT);
    await flushPromises();

    repository.writeFromAnotherTab({ projectId: PROJECT, state: withFolder(false) });

    expect(store.find(PROJECT)).toEqual(withFolder(false));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('stops watching and notifying once disposed', async () => {
    const repository = new InMemoryFoldersRepository({});
    const onChange = vi.fn();
    const store = new ProjectFoldersStore({ repository, onChange });
    store.find(PROJECT);

    store.dispose();
    await flushPromises();

    expect(repository.watcherCount()).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});
