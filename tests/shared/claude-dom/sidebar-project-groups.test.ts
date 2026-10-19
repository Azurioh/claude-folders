// @vitest-environment happy-dom

import { el, elementOf, fakeId, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';
import { findSidebarProjectGroups } from '@/shared/claude-dom/sidebar-project-groups';

const EXPANDED_PROJECT = fakeId(9);
const EXPANDED_PROJECT_CHATS = Array.from({ length: 8 }, (_, index) => fakeId(0x0a + index));

describe('findSidebarProjectGroups', () => {
  it('finds only the expanded project of the project page', () => {
    const groups = findSidebarProjectGroups({ root: loadFixture('project-page') });

    expect(groups.map((group) => group.projectId)).toEqual([EXPANDED_PROJECT]);
    expect(groups[0]?.list.tagName).toBe('UL');
    expect(nativeChatLinks(groups[0]?.list ?? document).map(chatIdOf)).toEqual(
      EXPANDED_PROJECT_CHATS,
    );
  });

  it('still finds the expanded project on the chat page', () => {
    const groups = findSidebarProjectGroups({ root: loadFixture('chat-page') });

    expect(groups.map((group) => group.projectId)).toEqual([EXPANDED_PROJECT]);
    expect(nativeChatLinks(groups[0]?.list ?? document)).toHaveLength(8);
  });

  it('keeps the sidebar group apart from the project page Recents list', () => {
    const root = loadFixture('project-page');
    const recents = elementOf({ root, selector: 'main section' });
    expect(findSidebarProjectGroups({ root, exclude: recents }).map((g) => g.projectId)).toEqual([
      EXPANDED_PROJECT,
    ]);
  });

  it('skips a group whose list is the excluded node', () => {
    const root = loadFixture('chat-page');
    const list = elementOf({ root, selector: `[data-group-list="${EXPANDED_PROJECT}"] ul` });
    expect(findSidebarProjectGroups({ root, exclude: list })).toEqual([]);
  });

  it('skips a group whose list contains the excluded node', () => {
    const root = loadFixture('chat-page');
    const row = elementOf({ root, selector: `[data-group-list="${EXPANDED_PROJECT}"] ul li` });
    expect(findSidebarProjectGroups({ root, exclude: row })).toEqual([]);
  });

  it('skips a group whose list sits inside the excluded node', () => {
    const root = loadFixture('chat-page');
    const sidebar = elementOf({ root, selector: '[data-testid="sidebar"]' });
    expect(findSidebarProjectGroups({ root, exclude: sidebar })).toEqual([]);
  });

  it('ignores groups rendered inside the extension UI', () => {
    const projectId = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
    const root = el({
      tag: 'div',
      attributes: { class: OWN_UI_SELECTOR.slice(1) },
      children: [
        el({
          tag: 'div',
          attributes: { 'data-group-list': projectId },
          children: [
            el({ tag: 'a', attributes: { href: `/project/${projectId}` } }),
            el({ tag: 'ul' }),
          ],
        }),
      ],
    });
    expect(findSidebarProjectGroups({ root })).toEqual([]);
  });

  it('skips a group without a project link', () => {
    const root = el({
      tag: 'div',
      children: [
        el({ tag: 'div', attributes: { 'data-group-list': 'x' }, children: [el({ tag: 'ul' })] }),
      ],
    });
    expect(findSidebarProjectGroups({ root })).toEqual([]);
  });
});
