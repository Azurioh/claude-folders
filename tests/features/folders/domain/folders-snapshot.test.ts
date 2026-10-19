import { describe, expect, it } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { countSnapshot } from '@/features/folders/domain/folders-snapshot';

function project(params: { folders: number; conversations: number }): ProjectFolders {
  const folderIds = Array.from({ length: params.folders }, (_, index) => `f${index}`);
  return {
    ...emptyProject(),
    folders: Object.fromEntries(
      folderIds.map((id) => [id, { id, name: id, parentId: null, open: true }]),
    ),
    conversations: Object.fromEntries(
      Array.from({ length: params.conversations }, (_, index) => [
        `c${index}`,
        { title: `C${index}`, folderId: 'f0' },
      ]),
    ),
  };
}

describe('countSnapshot', () => {
  it('counts nothing in an empty snapshot', () => {
    expect(countSnapshot({ projects: {}, hideFiled: true })).toEqual({
      projects: 0,
      folders: 0,
      conversations: 0,
    });
  });

  it('sums folders and filed conversations over every project', () => {
    expect(
      countSnapshot({
        projects: {
          a: project({ folders: 2, conversations: 3 }),
          b: project({ folders: 1, conversations: 0 }),
        },
        hideFiled: false,
      }),
    ).toEqual({ projects: 2, folders: 3, conversations: 3 });
  });
});
