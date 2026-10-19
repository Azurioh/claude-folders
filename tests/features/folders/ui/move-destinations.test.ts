import { describe, expect, it } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { moveDestinations } from '@/features/folders/ui/move-destinations';

const CHAT = 'chat-1';
const ROOT = 'Top level';

function sample(): ProjectFolders {
  return {
    folders: {
      work: { id: 'work', name: 'Work', parentId: null, open: true },
      specs: { id: 'specs', name: 'Specs', parentId: 'work', open: false },
      drafts: { id: 'drafts', name: 'Drafts', parentId: 'specs', open: false },
      later: { id: 'later', name: 'Later', parentId: null, open: false },
    },
    conversations: { [CHAT]: { title: 'Chat', folderId: 'specs' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

describe('moveDestinations', () => {
  it('lists the root then every folder in tree order, labelled with its path', () => {
    const destinations = moveDestinations({
      state: sample(),
      subject: { kind: 'conversation', conversationId: CHAT },
      rootLabel: ROOT,
    });
    expect(destinations.map((destination) => destination.label)).toEqual([
      ROOT,
      'Later',
      'Work',
      'Work / Specs',
      'Work / Specs / Drafts',
    ]);
  });

  it("marks a conversation's folder as the current location", () => {
    const destinations = moveDestinations({
      state: sample(),
      subject: { kind: 'conversation', conversationId: CHAT },
      rootLabel: ROOT,
    });
    expect(destinations.filter((destination) => destination.current)).toEqual([
      { folderId: 'specs', label: 'Work / Specs', current: true },
    ]);
  });

  it('excludes a folder itself and its descendants, and marks its parent as current', () => {
    const destinations = moveDestinations({
      state: sample(),
      subject: { kind: 'folder', folderId: 'specs' },
      rootLabel: ROOT,
    });
    expect(destinations).toEqual([
      { folderId: null, label: ROOT, current: false },
      { folderId: 'later', label: 'Later', current: false },
      { folderId: 'work', label: 'Work', current: true },
    ]);
  });

  it('is empty for an unknown subject', () => {
    expect(
      moveDestinations({
        state: sample(),
        subject: { kind: 'folder', folderId: 'x' },
        rootLabel: ROOT,
      }),
    ).toEqual([]);
    expect(
      moveDestinations({
        state: sample(),
        subject: { kind: 'conversation', conversationId: 'x' },
        rootLabel: ROOT,
      }),
    ).toEqual([]);
  });
});
