import { describe, expect, it } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import type { OperationResult } from '@/features/folders/domain/folders.operations';
import { fileInFolder, moveFolderInto, placeConversation } from '@/features/folders/ui/tree-moves';

const CHAT = 'chat-1';

function sample(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: false },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: false },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: { [CHAT]: { title: 'Kept title', folderId: 'later' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function stateOf(result: OperationResult): ProjectFolders {
  if (!result.ok) {
    throw new Error(`Rejected: ${result.reason}`);
  }
  return result.state;
}

describe('tree moves', () => {
  it('files a conversation and reveals the destination with its ancestors', () => {
    const state = stateOf(
      fileInFolder({
        state: sample(),
        conversationId: 'chat-2',
        folderId: 'specs',
        title: 'New chat',
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations['chat-2']).toEqual({ title: 'New chat', folderId: 'specs' });
    expect(state.folders.specs?.open).toBe(true);
    expect(state.folders.work?.open).toBe(true);
    expect(state.folders.later?.open).toBe(false);
  });

  it('keeps the stored title when no title is given', () => {
    const state = stateOf(
      fileInFolder({
        state: sample(),
        conversationId: CHAT,
        folderId: 'work',
        title: null,
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations[CHAT]).toEqual({ title: 'Kept title', folderId: 'work' });
  });

  it('places a conversation at the root by unfiling it', () => {
    const state = stateOf(
      placeConversation({
        state: sample(),
        conversationId: CHAT,
        folderId: null,
        title: null,
        fallbackTitle: 'Untitled',
      }),
    );
    expect(state.conversations[CHAT]).toBeUndefined();
  });

  it('moves a folder into another one and reveals it', () => {
    const state = stateOf(
      moveFolderInto({ state: sample(), folderId: 'later', targetParentId: 'specs' }),
    );
    expect(state.folders.later?.parentId).toBe('specs');
    expect(state.folders.specs?.open).toBe(true);
    expect(state.folders.work?.open).toBe(true);
  });

  it('moves a folder to the root', () => {
    const state = stateOf(
      moveFolderInto({ state: sample(), folderId: 'specs', targetParentId: null }),
    );
    expect(state.folders.specs?.parentId).toBeNull();
  });

  it('rejects a move into the folder itself or a descendant, without throwing', () => {
    expect(moveFolderInto({ state: sample(), folderId: 'work', targetParentId: 'specs' })).toEqual({
      ok: false,
      reason: 'invalid-move',
    });
  });
});
