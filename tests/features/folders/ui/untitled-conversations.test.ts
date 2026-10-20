// @vitest-environment happy-dom

import { fakeId, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import { listedConversationTitle } from '@/features/folders/ui/conversation-candidates';
import { nameUntitledConversations } from '@/features/folders/ui/untitled-conversations';

const PLACEHOLDER = 'Untitled';
const NEW_CHAT = fakeId(0x0a);
const RENAMED_CHAT = fakeId(0x0b);

function project(): ProjectFolders {
  return {
    folders: { work: { id: 'work', name: 'Work', parentId: null, open: true } },
    conversations: {
      [NEW_CHAT]: { title: PLACEHOLDER, folderId: 'work' },
      [RENAMED_CHAT]: { title: 'My own title', folderId: 'work' },
    },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

describe('nameUntitledConversations', () => {
  it('names a placeholder-titled conversation with the title claude.ai now shows', () => {
    const named = nameUntitledConversations({
      state: project(),
      placeholder: PLACEHOLDER,
      titleOf: () => '  Generated title ',
    });

    expect(named?.conversations[NEW_CHAT]).toEqual({ title: 'Generated title', folderId: 'work' });
  });

  it('never overwrites a title that is not the placeholder', () => {
    const named = nameUntitledConversations({
      state: project(),
      placeholder: PLACEHOLDER,
      titleOf: () => 'Generated title',
    });

    expect(named?.conversations[RENAMED_CHAT]?.title).toBe('My own title');
  });

  it.each([null, '', '   ', PLACEHOLDER])('changes nothing while claude.ai shows %o', (title) => {
    expect(
      nameUntitledConversations({
        state: project(),
        placeholder: PLACEHOLDER,
        titleOf: () => title,
      }),
    ).toBeNull();
  });

  it("reads claude.ai's title of a conversation from the chat page's lists", () => {
    const page = loadFixture('chat-page');
    const named = nameUntitledConversations({
      state: project(),
      placeholder: PLACEHOLDER,
      titleOf: (conversationId) => listedConversationTitle({ lists: [page], conversationId }),
    });

    expect(named?.conversations[NEW_CHAT]?.title).toBe('Conversation 1');
  });
});
