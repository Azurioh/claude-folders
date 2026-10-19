import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { InvalidProjectIdError } from '@/features/folders/storage/invalid-project-id.error';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';

function sampleProject(): ProjectFolders {
  return {
    folders: {
      root: { id: 'root', name: 'Root', parentId: null, open: true, emoji: '📁', color: 'red' },
      child: { id: 'child', name: 'Child', parentId: 'root', open: false },
    },
    conversations: { 'conv-1': { title: 'First', folderId: 'child' } },
    sectionOpen: { sidebar: false, projectPage: true },
  };
}

async function readRaw(key: string): Promise<unknown> {
  const items = await fakeBrowser.storage.local.get(key);
  return items[key];
}

describe('BrowserFoldersRepository', () => {
  const repository = new BrowserFoldersRepository();

  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads an unknown project as an empty project', async () => {
    expect(await repository.load(PROJECT_A)).toEqual(emptyProject());
  });

  it('round-trips a saved project', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject() });

    expect(await repository.load(PROJECT_A)).toEqual(sampleProject());
  });

  it('stores each project under its own key with schema version 1', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject() });

    expect(await readRaw(`projects:${PROJECT_A}`)).toEqual(sampleProject());
    expect(await readRaw(`projects:${PROJECT_A}$`)).toEqual({ v: 1 });
  });

  it('keeps projects isolated from each other', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject() });

    expect(await repository.load(PROJECT_B)).toEqual(emptyProject());

    await repository.save({ projectId: PROJECT_B, state: emptyProject() });
    expect(await repository.load(PROJECT_A)).toEqual(sampleProject());
  });

  it('notifies a watcher of a change written by another tab, until unsubscribed', async () => {
    const listener = vi.fn();
    const unsubscribe = repository.watch({ projectId: PROJECT_A, listener });

    await fakeBrowser.storage.local.set({ [`projects:${PROJECT_A}`]: sampleProject() });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(sampleProject());

    unsubscribe();
    await fakeBrowser.storage.local.set({ [`projects:${PROJECT_A}`]: emptyProject() });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify a watcher of another project', async () => {
    const listener = vi.fn();
    repository.watch({ projectId: PROJECT_A, listener });

    await repository.save({ projectId: PROJECT_B, state: sampleProject() });

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies a watcher with an empty project when the stored project is removed', async () => {
    await repository.save({ projectId: PROJECT_A, state: sampleProject() });
    const listener = vi.fn();
    repository.watch({ projectId: PROJECT_A, listener });

    await fakeBrowser.storage.local.remove(`projects:${PROJECT_A}`);

    expect(listener).toHaveBeenLastCalledWith(emptyProject());
  });

  it('notifies a watcher with an empty project and one warning when corrupted data is written', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const listener = vi.fn();
    repository.watch({ projectId: PROJECT_A, listener });

    await fakeBrowser.storage.local.set({ [`projects:${PROJECT_A}`]: 'garbage' });

    expect(listener).toHaveBeenLastCalledWith(emptyProject());
    expect(warn).toHaveBeenCalledTimes(1);
  });

  describe('with corrupted data', () => {
    const corrupted: Record<string, unknown> = {
      'a string': 'not a project',
      'an array': [sampleProject()],
      'missing folders': { conversations: {}, sectionOpen: { sidebar: true, projectPage: true } },
      'missing sectionOpen': { folders: {}, conversations: {} },
      'folders as an array': {
        folders: [],
        conversations: {},
        sectionOpen: { sidebar: true, projectPage: true },
      },
      'a folder with a numeric name': {
        ...sampleProject(),
        folders: { root: { id: 'root', name: 42, parentId: null, open: true } },
      },
      'a folder with a numeric parentId': {
        ...sampleProject(),
        folders: { root: { id: 'root', name: 'Root', parentId: 3, open: true } },
      },
      'a folder whose id differs from its key': {
        ...sampleProject(),
        folders: { root: { id: 'other', name: 'Root', parentId: null, open: true } },
      },
      'a folder with a numeric emoji': {
        ...sampleProject(),
        folders: { root: { id: 'root', name: 'Root', parentId: null, open: true, emoji: 1 } },
      },
      'a non-boolean section flag': {
        ...sampleProject(),
        sectionOpen: { sidebar: 'yes', projectPage: true },
      },
      'a conversation without folderId': {
        ...sampleProject(),
        conversations: { c: { title: 'T' } },
      },
    };

    for (const [label, value] of Object.entries(corrupted)) {
      it(`loads ${label} as an empty project, keeps it stored and warns once`, async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await fakeBrowser.storage.local.set({ [`projects:${PROJECT_A}`]: value });

        expect(await repository.load(PROJECT_A)).toEqual(emptyProject());
        expect(await readRaw(`projects:${PROJECT_A}`)).toEqual(value);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[0]).toContain('[nest-for-claude]');
      });
    }
  });

  it('drops unknown fields when loading', async () => {
    await fakeBrowser.storage.local.set({
      [`projects:${PROJECT_A}`]: {
        ...sampleProject(),
        extra: true,
        conversations: { c: { title: 'T', folderId: 'root', extra: 1 } },
      },
    });

    expect(await repository.load(PROJECT_A)).toEqual({
      ...sampleProject(),
      conversations: { c: { title: 'T', folderId: 'root' } },
    });
  });

  it('normalises an uppercase project id to the lowercase key', async () => {
    const upper = PROJECT_A.toUpperCase();
    const listener = vi.fn();
    repository.watch({ projectId: upper, listener });

    await repository.save({ projectId: upper, state: sampleProject() });

    expect(await readRaw(`projects:${PROJECT_A}`)).toEqual(sampleProject());
    expect(await readRaw(`projects:${upper}`)).toBeUndefined();
    expect(await repository.load(PROJECT_A)).toEqual(sampleProject());
    expect(await repository.load(upper)).toEqual(sampleProject());
    expect(listener).toHaveBeenLastCalledWith(sampleProject());
  });

  it('rejects a project id that is not a UUID', async () => {
    for (const projectId of ['', 'abc', '__proto__', `${PROJECT_A}x`, ` ${PROJECT_A}`]) {
      await expect(repository.load(projectId)).rejects.toBeInstanceOf(InvalidProjectIdError);
      await expect(repository.save({ projectId, state: emptyProject() })).rejects.toBeInstanceOf(
        InvalidProjectIdError,
      );
      expect(() => repository.watch({ projectId, listener: () => undefined })).toThrow(
        InvalidProjectIdError,
      );
    }
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
  });

  it('round-trips folder and conversation ids that look like Object.prototype members', async () => {
    const state: ProjectFolders = {
      folders: Object.fromEntries([
        ['__proto__', { id: '__proto__', name: 'Proto', parentId: null, open: true }],
        ['constructor', { id: 'constructor', name: 'Ctor', parentId: '__proto__', open: true }],
      ]),
      conversations: Object.fromEntries([
        ['__proto__', { title: 'Proto conv', folderId: 'constructor' }],
      ]),
      sectionOpen: { sidebar: true, projectPage: true },
    };

    await repository.save({ projectId: PROJECT_A, state });
    const loaded = await repository.load(PROJECT_A);

    expect(Object.keys(loaded.folders).sort()).toEqual(['__proto__', 'constructor']);
    expect(Object.hasOwn(loaded.folders, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(loaded.folders)).toBe(Object.prototype);
    expect(loaded.folders.constructor).toEqual(state.folders.constructor);
    expect(Object.keys(loaded.conversations)).toEqual(['__proto__']);
  });
});
