// @vitest-environment happy-dom

import { el } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { unfiledCandidates } from '@/features/folders/ui/conversation-candidates';

const CHAT_A = '0a0a0a0a-0000-4000-8000-00000000000a';
const CHAT_B = '0b0b0b0b-0000-4000-8000-00000000000b';
const CHAT_C = '0c0c0c0c-0000-4000-8000-00000000000c';

function list(links: readonly { id: string; title: string }[]): HTMLElement {
  return el({
    tag: 'ul',
    children: links.map((link) =>
      el({
        tag: 'li',
        children: [
          el({ tag: 'a', attributes: { href: `/chat/${link.id}` }, children: [link.title] }),
        ],
      }),
    ),
  });
}

function filing(conversationId: string): ProjectFolders {
  return {
    ...emptyProject(),
    folders: { work: { id: 'work', name: 'Work', parentId: null, open: true } },
    conversations: { [conversationId]: { title: 'Filed', folderId: 'work' } },
  };
}

describe('unfiledCandidates', () => {
  it('lists the conversations of every list in order, with their clean title', () => {
    const lists = [
      list([{ id: CHAT_A, title: 'Alpha' }]),
      list([{ id: CHAT_B, title: 'Beta 3 hours ago' }]),
    ];

    expect(unfiledCandidates({ lists, state: emptyProject() })).toEqual([
      { conversationId: CHAT_A, title: 'Alpha' },
      { conversationId: CHAT_B, title: 'Beta' },
    ]);
  });

  it('skips the conversations already filed in the project', () => {
    const lists = [
      list([
        { id: CHAT_A, title: 'Alpha' },
        { id: CHAT_B, title: 'Beta' },
      ]),
    ];

    expect(unfiledCandidates({ lists, state: filing(CHAT_A) })).toEqual([
      { conversationId: CHAT_B, title: 'Beta' },
    ]);
  });

  it('lists a conversation shown in two lists once', () => {
    const lists = [
      list([{ id: CHAT_A, title: 'Alpha' }]),
      list([
        { id: CHAT_A, title: 'Alpha' },
        { id: CHAT_C, title: 'Gamma' },
      ]),
    ];

    expect(unfiledCandidates({ lists, state: emptyProject() })).toEqual([
      { conversationId: CHAT_A, title: 'Alpha' },
      { conversationId: CHAT_C, title: 'Gamma' },
    ]);
  });

  it('skips conversations without a title', () => {
    const lists = [list([{ id: CHAT_A, title: '' }])];

    expect(unfiledCandidates({ lists, state: emptyProject() })).toEqual([]);
  });
});
