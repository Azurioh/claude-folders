// @vitest-environment happy-dom

import { fakeId, linkTo, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import { clearFiledMarks, markFiled } from '@/features/folders/ui/filed-marks';
import { rowOf } from '@/shared/claude-dom/native-links';
import { findSidebarProjectGroups } from '@/shared/claude-dom/sidebar-project-groups';

const FILED_CHAT = fakeId(0x0b);
const UNFILED_CHAT = fakeId(0x0c);

function stateFiling(conversationId: string): ProjectFolders {
  return {
    ...emptyProject(),
    folders: { work: { id: 'work', name: 'Work', parentId: null, open: true } },
    conversations: { [conversationId]: { title: 'Filed', folderId: 'work' } },
  };
}

function sidebarList(root: Document): HTMLElement {
  const [group] = findSidebarProjectGroups({ root });
  if (group === undefined) {
    throw new Error('No expanded sidebar project in the fixture');
  }
  return group.list;
}

describe('markFiled', () => {
  it('hides the rows of filed conversations when hiding is on', () => {
    const root = loadFixture('chat-page');
    const list = sidebarList(root);

    markFiled({ list, state: stateFiling(FILED_CHAT), hideFiled: true });

    const filed = linkTo({ root, href: `/chat/${FILED_CHAT}` });
    expect(rowOf(filed).hasAttribute('data-nfc-hidden')).toBe(true);
    expect(filed.hasAttribute('data-nfc-filed')).toBe(false);
    expect(
      rowOf(linkTo({ root, href: `/chat/${UNFILED_CHAT}` })).hasAttribute('data-nfc-hidden'),
    ).toBe(false);
  });

  it('dims filed conversations instead when hiding is off', () => {
    const root = loadFixture('chat-page');
    const list = sidebarList(root);

    markFiled({ list, state: stateFiling(FILED_CHAT), hideFiled: false });

    const filed = linkTo({ root, href: `/chat/${FILED_CHAT}` });
    expect(rowOf(filed).hasAttribute('data-nfc-hidden')).toBe(false);
    expect(filed.hasAttribute('data-nfc-filed')).toBe(true);
  });

  it('unmarks a conversation that is no longer filed', () => {
    const root = loadFixture('chat-page');
    const list = sidebarList(root);
    markFiled({ list, state: stateFiling(FILED_CHAT), hideFiled: true });

    markFiled({ list, state: emptyProject(), hideFiled: true });

    expect(root.querySelector('[data-nfc-hidden], [data-nfc-filed]')).toBeNull();
  });

  it('leaves the lists without a folders section untouched', () => {
    const root = loadFixture('chat-page');
    const list = sidebarList(root);
    const outside = fakeId(0x14);

    markFiled({ list, state: stateFiling(outside), hideFiled: true });

    expect(rowOf(linkTo({ root, href: `/chat/${outside}` })).hasAttribute('data-nfc-hidden')).toBe(
      false,
    );
  });
});

describe('clearFiledMarks', () => {
  it('removes every mark it set', () => {
    const root = loadFixture('chat-page');
    const list = sidebarList(root);
    markFiled({ list, state: stateFiling(FILED_CHAT), hideFiled: true });
    markFiled({ list, state: stateFiling(UNFILED_CHAT), hideFiled: false });

    clearFiledMarks(root);

    expect(root.querySelector('[data-nfc-hidden], [data-nfc-filed]')).toBeNull();
  });
});
