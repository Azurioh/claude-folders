import { describe, expect, it } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import {
  childrenOf,
  countConversations,
  deletionImpact,
  isInside,
} from '@/features/folders/domain/folders.queries';

function sampleProject(): ProjectFolders {
  return {
    folders: {
      root: { id: 'root', name: 'Root', parentId: null, open: true },
      child: { id: 'child', name: 'Child', parentId: 'root', open: true },
      grandchild: { id: 'grandchild', name: 'Grandchild', parentId: 'child', open: true },
      other: { id: 'other', name: 'Other', parentId: null, open: true },
    },
    conversations: {
      'c-root': { title: 'Root conv', folderId: 'root' },
      'c-child-1': { title: 'Child conv 1', folderId: 'child' },
      'c-child-2': { title: 'Child conv 2', folderId: 'child' },
      'c-grand': { title: 'Grand conv', folderId: 'grandchild' },
      'c-other': { title: 'Other conv', folderId: 'other' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function cyclicProject(): ProjectFolders {
  return {
    folders: {
      a: { id: 'a', name: 'A', parentId: 'b', open: true },
      b: { id: 'b', name: 'B', parentId: 'a', open: true },
    },
    conversations: { c: { title: 'C', folderId: 'a' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

describe('isInside', () => {
  it('is true for the folder itself', () => {
    expect(isInside({ state: sampleProject(), candidateId: 'child', ancestorId: 'child' })).toBe(
      true,
    );
  });

  it('is true for a descendant at any depth', () => {
    expect(
      isInside({ state: sampleProject(), candidateId: 'grandchild', ancestorId: 'root' }),
    ).toBe(true);
  });

  it('is false for an ancestor, a sibling branch, the root or an unknown id', () => {
    const state = sampleProject();
    expect(isInside({ state, candidateId: 'root', ancestorId: 'grandchild' })).toBe(false);
    expect(isInside({ state, candidateId: 'other', ancestorId: 'root' })).toBe(false);
    expect(isInside({ state, candidateId: null, ancestorId: 'root' })).toBe(false);
    expect(isInside({ state, candidateId: 'nope', ancestorId: 'root' })).toBe(false);
  });

  it('terminates on a corrupted parent cycle', () => {
    expect(isInside({ state: cyclicProject(), candidateId: 'a', ancestorId: 'zzz' })).toBe(false);
  });
});

describe('countConversations', () => {
  it('counts conversations across three levels', () => {
    const state = sampleProject();
    expect(countConversations({ state, folderId: 'root' })).toBe(4);
    expect(countConversations({ state, folderId: 'child' })).toBe(3);
    expect(countConversations({ state, folderId: 'grandchild' })).toBe(1);
  });

  it('is zero for an unknown folder', () => {
    expect(countConversations({ state: sampleProject(), folderId: 'nope' })).toBe(0);
  });

  it('terminates on a corrupted parent cycle', () => {
    expect(countConversations({ state: cyclicProject(), folderId: 'a' })).toBe(1);
  });
});

describe('deletionImpact', () => {
  it('counts the sub-folders and conversations deleted with a folder, at any depth', () => {
    const state = sampleProject();
    expect(deletionImpact({ state, folderId: 'root' })).toEqual({
      subfolders: 2,
      conversations: 4,
    });
    expect(deletionImpact({ state, folderId: 'child' })).toEqual({
      subfolders: 1,
      conversations: 3,
    });
    expect(deletionImpact({ state, folderId: 'grandchild' })).toEqual({
      subfolders: 0,
      conversations: 1,
    });
  });

  it('is empty for an unknown folder', () => {
    expect(deletionImpact({ state: sampleProject(), folderId: 'nope' })).toEqual({
      subfolders: 0,
      conversations: 0,
    });
  });

  it('terminates on a corrupted parent cycle', () => {
    expect(deletionImpact({ state: cyclicProject(), folderId: 'a' })).toEqual({
      subfolders: 1,
      conversations: 1,
    });
  });
});

describe('childrenOf', () => {
  const sortable: ProjectFolders = {
    folders: {
      p: { id: 'p', name: 'Parent', parentId: null, open: true },
      z: { id: 'z', name: 'zeta', parentId: 'p', open: true },
      a: { id: 'a', name: 'Alpha', parentId: 'p', open: true },
      e: { id: 'e', name: 'émile', parentId: 'p', open: true },
      top: { id: 'top', name: 'Beta', parentId: null, open: true },
    },
    conversations: {
      c2: { title: 'banana', folderId: 'p' },
      c1: { title: 'Apple', folderId: 'p' },
      c3: { title: 'cherry', folderId: 'p' },
      loose: { title: 'Loose', folderId: 'top' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };

  it('lists sub-folders by name then conversations by title', () => {
    expect(childrenOf({ state: sortable, parentId: 'p' })).toEqual([
      { kind: 'folder', folder: sortable.folders.a },
      { kind: 'folder', folder: sortable.folders.e },
      { kind: 'folder', folder: sortable.folders.z },
      { kind: 'conversation', id: 'c1', conversation: sortable.conversations.c1 },
      { kind: 'conversation', id: 'c2', conversation: sortable.conversations.c2 },
      { kind: 'conversation', id: 'c3', conversation: sortable.conversations.c3 },
    ]);
  });

  it('lists only folders at the root', () => {
    expect(childrenOf({ state: sortable, parentId: null })).toEqual([
      { kind: 'folder', folder: sortable.folders.top },
      { kind: 'folder', folder: sortable.folders.p },
    ]);
  });

  it('is empty for an unknown folder', () => {
    expect(childrenOf({ state: sortable, parentId: 'nope' })).toEqual([]);
  });
});

describe('orphan and inherited references', () => {
  const inheritedIds = ['toString', 'constructor', '__proto__', 'hasOwnProperty'];

  function orphanProject(): ProjectFolders {
    return {
      folders: { root: { id: 'root', name: 'Root', parentId: null, open: true } },
      conversations: {
        'c-orphan': { title: 'Orphan conv', folderId: 'ghost' },
        'c-proto': { title: 'Proto conv', folderId: '__proto__' },
      },
      sectionOpen: { sidebar: true, projectPage: true },
    };
  }

  it('countConversations is 0 for an unknown folder referenced by a conversation', () => {
    expect(countConversations({ state: orphanProject(), folderId: 'ghost' })).toBe(0);
  });

  it.each(inheritedIds)('countConversations is 0 for inherited id %s', (id) => {
    expect(countConversations({ state: orphanProject(), folderId: id })).toBe(0);
  });

  it.each(inheritedIds)('deletionImpact is empty for inherited id %s', (id) => {
    expect(deletionImpact({ state: orphanProject(), folderId: id })).toEqual({
      subfolders: 0,
      conversations: 0,
    });
  });

  it('childrenOf is empty for an unknown folder referenced by a conversation', () => {
    expect(childrenOf({ state: orphanProject(), parentId: 'ghost' })).toEqual([]);
  });

  it.each(inheritedIds)('childrenOf is empty for inherited id %s', (id) => {
    expect(childrenOf({ state: orphanProject(), parentId: id })).toEqual([]);
  });

  it.each(inheritedIds)('isInside is false for inherited candidate %s', (id) => {
    expect(isInside({ state: orphanProject(), candidateId: id, ancestorId: 'root' })).toBe(false);
  });
});
