import { describe, expect, it } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import {
  createFolder,
  deleteFolder,
  fileConversation,
  moveFolder,
  type OperationResult,
  openFolder,
  renameConversation,
  renameFolder,
  setFolderAppearance,
  toggleFolderOpen,
  toggleSection,
  unfileConversation,
} from '@/features/folders/domain/folders.operations';

function stateOf(result: OperationResult): ProjectFolders {
  if (!result.ok) {
    throw new Error(`Expected success, got rejection: ${result.reason}`);
  }
  return result.state;
}

/**
 * root > child > grandchild, plus a sibling root folder `other`; all closed.
 * Conversations: c-root in root, c-child in child, c-grand in grandchild.
 */
function sampleProject(): ProjectFolders {
  return {
    folders: {
      root: { id: 'root', name: 'Root', parentId: null, open: false },
      child: { id: 'child', name: 'Child', parentId: 'root', open: false },
      grandchild: { id: 'grandchild', name: 'Grandchild', parentId: 'child', open: false },
      other: { id: 'other', name: 'Other', parentId: null, open: false },
    },
    conversations: {
      'c-root': { title: 'Root conv', folderId: 'root' },
      'c-child': { title: 'Child conv', folderId: 'child' },
      'c-grand': { title: 'Grand conv', folderId: 'grandchild' },
    },
    sectionOpen: { sidebar: false, projectPage: false },
  };
}

describe('emptyProject', () => {
  it('has no folders, no conversations and both sections open', () => {
    expect(emptyProject()).toEqual({
      folders: {},
      conversations: {},
      sectionOpen: { sidebar: true, projectPage: true },
    });
  });
});

describe('createFolder', () => {
  it('creates an open root folder with a trimmed name', () => {
    const state = stateOf(
      createFolder({ state: emptyProject(), name: '  Work  ', parentId: null, newId: 'f1' }),
    );
    expect(state.folders.f1).toEqual({ id: 'f1', name: 'Work', parentId: null, open: true });
  });

  it('opens the parent folder and both sections', () => {
    const state = stateOf(
      createFolder({ state: sampleProject(), name: 'New', parentId: 'child', newId: 'f1' }),
    );
    expect(state.folders.f1?.parentId).toBe('child');
    expect(state.folders.child?.open).toBe(true);
    expect(state.sectionOpen).toEqual({ sidebar: true, projectPage: true });
  });

  it('rejects a blank name', () => {
    expect(
      createFolder({ state: emptyProject(), name: '   ', parentId: null, newId: 'f1' }),
    ).toEqual({ ok: false, reason: 'empty-name' });
  });

  it('rejects an unknown parent', () => {
    expect(
      createFolder({ state: emptyProject(), name: 'A', parentId: 'nope', newId: 'f1' }),
    ).toEqual({ ok: false, reason: 'folder-not-found' });
  });

  it('rejects an id that is already used', () => {
    expect(
      createFolder({ state: sampleProject(), name: 'A', parentId: null, newId: 'root' }),
    ).toEqual({ ok: false, reason: 'folder-id-taken' });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    createFolder({ state: input, name: 'New', parentId: 'child', newId: 'f1' });
    expect(input).toEqual(sampleProject());
  });
});

describe('renameFolder', () => {
  it('renames with a trimmed name', () => {
    const state = stateOf(
      renameFolder({ state: sampleProject(), folderId: 'child', name: '  Renamed ' }),
    );
    expect(state.folders.child?.name).toBe('Renamed');
  });

  it('rejects a blank name', () => {
    expect(renameFolder({ state: sampleProject(), folderId: 'child', name: ' ' })).toEqual({
      ok: false,
      reason: 'empty-name',
    });
  });

  it('rejects an unknown folder', () => {
    expect(renameFolder({ state: sampleProject(), folderId: 'nope', name: 'X' })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    renameFolder({ state: input, folderId: 'child', name: 'Renamed' });
    expect(input).toEqual(sampleProject());
  });
});

describe('setFolderAppearance', () => {
  it('sets a trimmed emoji and a color', () => {
    const state = stateOf(
      setFolderAppearance({
        state: sampleProject(),
        folderId: 'root',
        emoji: ' 📁 ',
        color: '#ff0000',
      }),
    );
    expect(state.folders.root).toEqual({
      id: 'root',
      name: 'Root',
      parentId: null,
      open: false,
      emoji: '📁',
      color: '#ff0000',
    });
  });

  it('removes a blank emoji and an absent color', () => {
    const decorated = stateOf(
      setFolderAppearance({
        state: sampleProject(),
        folderId: 'root',
        emoji: '📁',
        color: '#ff0000',
      }),
    );
    const state = stateOf(setFolderAppearance({ state: decorated, folderId: 'root', emoji: '  ' }));
    expect(state.folders.root).not.toHaveProperty('emoji');
    expect(state.folders.root).not.toHaveProperty('color');
    expect(state.folders.root).toEqual({ id: 'root', name: 'Root', parentId: null, open: false });
  });

  it('rejects an unknown folder', () => {
    expect(setFolderAppearance({ state: sampleProject(), folderId: 'nope' })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    setFolderAppearance({ state: input, folderId: 'root', emoji: '📁', color: '#ff0000' });
    expect(input).toEqual(sampleProject());
  });
});

describe('deleteFolder', () => {
  it('moves sub-folders and conversations of a nested folder up one level', () => {
    const state = stateOf(deleteFolder({ state: sampleProject(), folderId: 'child' }));
    expect(state.folders.child).toBeUndefined();
    expect(state.folders.grandchild?.parentId).toBe('root');
    expect(state.conversations['c-child']).toEqual({ title: 'Child conv', folderId: 'root' });
    expect(state.conversations['c-grand']).toEqual({ title: 'Grand conv', folderId: 'grandchild' });
  });

  it('unfiles the conversations of a root folder and moves its sub-folders to root', () => {
    const state = stateOf(deleteFolder({ state: sampleProject(), folderId: 'root' }));
    expect(state.folders.root).toBeUndefined();
    expect(state.folders.child?.parentId).toBeNull();
    expect(state.conversations['c-root']).toBeUndefined();
    expect(state.conversations['c-child']?.folderId).toBe('child');
  });

  it('rejects an unknown folder', () => {
    expect(deleteFolder({ state: sampleProject(), folderId: 'nope' })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    deleteFolder({ state: input, folderId: 'root' });
    deleteFolder({ state: input, folderId: 'child' });
    expect(input).toEqual(sampleProject());
  });
});

describe('moveFolder', () => {
  it('moves a folder under another folder', () => {
    const state = stateOf(
      moveFolder({ state: sampleProject(), folderId: 'child', targetParentId: 'other' }),
    );
    expect(state.folders.child?.parentId).toBe('other');
  });

  it('moves a folder to the root', () => {
    const state = stateOf(
      moveFolder({ state: sampleProject(), folderId: 'grandchild', targetParentId: null }),
    );
    expect(state.folders.grandchild?.parentId).toBeNull();
  });

  it('rejects moving a folder into itself', () => {
    expect(
      moveFolder({ state: sampleProject(), folderId: 'child', targetParentId: 'child' }),
    ).toEqual({ ok: false, reason: 'invalid-move' });
  });

  it('rejects moving a folder into its own descendant', () => {
    expect(
      moveFolder({ state: sampleProject(), folderId: 'root', targetParentId: 'grandchild' }),
    ).toEqual({ ok: false, reason: 'invalid-move' });
  });

  it('rejects an unknown folder or target', () => {
    expect(moveFolder({ state: sampleProject(), folderId: 'nope', targetParentId: null })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
    expect(
      moveFolder({ state: sampleProject(), folderId: 'child', targetParentId: 'nope' }),
    ).toEqual({ ok: false, reason: 'folder-not-found' });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    moveFolder({ state: input, folderId: 'child', targetParentId: 'other' });
    expect(input).toEqual(sampleProject());
  });
});

describe('fileConversation', () => {
  it('files a new conversation with the given trimmed title', () => {
    const state = stateOf(
      fileConversation({
        state: sampleProject(),
        conversationId: 'c-new',
        folderId: 'other',
        title: ' Hello ',
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations['c-new']).toEqual({ title: 'Hello', folderId: 'other' });
  });

  it('keeps the existing title when none is given', () => {
    const state = stateOf(
      fileConversation({
        state: sampleProject(),
        conversationId: 'c-child',
        folderId: 'other',
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations['c-child']).toEqual({ title: 'Child conv', folderId: 'other' });
  });

  it('uses the fallback title when no title is given or known', () => {
    const state = stateOf(
      fileConversation({
        state: sampleProject(),
        conversationId: 'c-new',
        folderId: 'other',
        title: '  ',
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations['c-new']?.title).toBe('Untitled');
  });

  it('rejects an unknown folder', () => {
    expect(
      fileConversation({
        state: sampleProject(),
        conversationId: 'c-new',
        folderId: 'nope',
        fallbackTitle: 'Untitled',
      }),
    ).toEqual({ ok: false, reason: 'folder-not-found' });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    fileConversation({
      state: input,
      conversationId: 'c-child',
      folderId: 'other',
      fallbackTitle: 'Untitled',
    });
    expect(input).toEqual(sampleProject());
  });
});

describe('unfileConversation', () => {
  it('removes the conversation from its folder', () => {
    const state = stateOf(
      unfileConversation({ state: sampleProject(), conversationId: 'c-child' }),
    );
    expect(state.conversations['c-child']).toBeUndefined();
    expect(Object.keys(state.conversations)).toEqual(['c-root', 'c-grand']);
  });

  it('rejects an unknown conversation', () => {
    expect(unfileConversation({ state: sampleProject(), conversationId: 'nope' })).toEqual({
      ok: false,
      reason: 'conversation-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    unfileConversation({ state: input, conversationId: 'c-child' });
    expect(input).toEqual(sampleProject());
  });
});

describe('renameConversation', () => {
  it('renames with a trimmed title', () => {
    const state = stateOf(
      renameConversation({
        state: sampleProject(),
        conversationId: 'c-child',
        title: '  New title ',
      }),
    );
    expect(state.conversations['c-child']).toEqual({ title: 'New title', folderId: 'child' });
  });

  it('rejects a blank title', () => {
    expect(
      renameConversation({ state: sampleProject(), conversationId: 'c-child', title: '  ' }),
    ).toEqual({ ok: false, reason: 'empty-title' });
  });

  it('rejects an unknown conversation', () => {
    expect(
      renameConversation({ state: sampleProject(), conversationId: 'nope', title: 'X' }),
    ).toEqual({ ok: false, reason: 'conversation-not-found' });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    renameConversation({ state: input, conversationId: 'c-child', title: 'New title' });
    expect(input).toEqual(sampleProject());
  });
});

describe('openFolder', () => {
  it('opens a closed folder', () => {
    const state = stateOf(openFolder({ state: sampleProject(), folderId: 'child' }));
    expect(state.folders.child?.open).toBe(true);
  });

  it('keeps an open folder open', () => {
    const opened = stateOf(openFolder({ state: sampleProject(), folderId: 'child' }));
    const state = stateOf(openFolder({ state: opened, folderId: 'child' }));
    expect(state).toEqual(opened);
  });

  it('rejects an unknown folder', () => {
    expect(openFolder({ state: sampleProject(), folderId: 'nope' })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    openFolder({ state: input, folderId: 'child' });
    expect(input).toEqual(sampleProject());
  });
});

describe('toggleFolderOpen', () => {
  it('flips the open flag back and forth', () => {
    const opened = stateOf(toggleFolderOpen({ state: sampleProject(), folderId: 'child' }));
    expect(opened.folders.child?.open).toBe(true);
    const closed = stateOf(toggleFolderOpen({ state: opened, folderId: 'child' }));
    expect(closed.folders.child?.open).toBe(false);
  });

  it('rejects an unknown folder', () => {
    expect(toggleFolderOpen({ state: sampleProject(), folderId: 'nope' })).toEqual({
      ok: false,
      reason: 'folder-not-found',
    });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    toggleFolderOpen({ state: input, folderId: 'child' });
    expect(input).toEqual(sampleProject());
  });
});

describe('toggleSection', () => {
  it('flips only the requested section', () => {
    const sidebar = stateOf(toggleSection({ state: sampleProject(), section: 'sidebar' }));
    expect(sidebar.sectionOpen).toEqual({ sidebar: true, projectPage: false });
    const both = stateOf(toggleSection({ state: sidebar, section: 'projectPage' }));
    expect(both.sectionOpen).toEqual({ sidebar: true, projectPage: true });
  });

  it('does not mutate the input state', () => {
    const input = sampleProject();
    toggleSection({ state: input, section: 'sidebar' });
    expect(input).toEqual(sampleProject());
  });
});
