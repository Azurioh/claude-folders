// @vitest-environment happy-dom

import { el, fakeId, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { nativeChatLinks } from '@/shared/claude-dom/native-links';
import { findProjectRecents } from '@/shared/claude-dom/project-recents';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const PROJECT_ID = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const PROJECT_PATHNAME = `/project/${PROJECT_ID}`;
const SIDEBAR_CHAT = 'a1111111-4b5a-4987-8a6b-5c4d3e2f1a0b';
const MAIN_CHAT_A = 'b2222222-4b5a-4987-8a6b-5c4d3e2f1a0b';
const MAIN_CHAT_B = 'c3333333-4b5a-4987-8a6b-5c4d3e2f1a0b';

function chatLink(id: string): HTMLElement {
  return el({ tag: 'a', attributes: { href: `/chat/${id}` }, children: [id] });
}

function projectPage(params: { mainChildren: HTMLElement[] }): HTMLElement {
  return el({
    tag: 'div',
    children: [
      el({
        tag: 'aside',
        children: [
          el({ tag: 'div', children: [el({ tag: 'span', children: ['Recents'] })] }),
          chatLink(SIDEBAR_CHAT),
        ],
      }),
      el({ tag: 'main', children: params.mainChildren }),
    ],
  });
}

function recentsSection(heading: HTMLElement): HTMLElement {
  return el({
    tag: 'section',
    children: [
      heading,
      el({ tag: 'div', children: [chatLink(MAIN_CHAT_A), chatLink(MAIN_CHAT_B)] }),
    ],
  });
}

describe('findProjectRecents', () => {
  it('is null outside a project page', () => {
    const root = projectPage({
      mainChildren: [recentsSection(el({ tag: 'h2', children: ['Recents'] }))],
    });
    expect(findProjectRecents({ root, pathname: `/chat/${MAIN_CHAT_A}` })).toBeNull();
  });

  it('finds the Recents heading of the main area, not the sidebar one', () => {
    const heading = el({ tag: 'h2', children: ['Recents'] });
    const section = recentsSection(heading);
    const root = projectPage({ mainChildren: [section] });

    const recents = findProjectRecents({ root, pathname: PROJECT_PATHNAME.toUpperCase() });

    expect(recents?.projectId).toBe(PROJECT_ID);
    expect(recents?.heading).toBe(heading);
    expect(recents?.list).toBe(section);
    expect(nativeChatLinks(recents?.list ?? root).map(chatIdOf)).toEqual([
      MAIN_CHAT_A,
      MAIN_CHAT_B,
    ]);
  });

  it('recognises the French heading', () => {
    const heading = el({ tag: 'h2', children: [' Récents '] });
    const root = projectPage({ mainChildren: [recentsSection(heading)] });
    expect(findProjectRecents({ root, pathname: PROJECT_PATHNAME })?.heading).toBe(heading);
  });

  it('ignores a heading whose own text is not exactly a Recents label', () => {
    const root = projectPage({
      mainChildren: [recentsSection(el({ tag: 'h2', children: ['Recents chats'] }))],
    });
    expect(findProjectRecents({ root, pathname: PROJECT_PATHNAME })).toBeNull();
  });

  it('ignores a Recents heading inside the extension UI', () => {
    const ownSection = el({
      tag: 'div',
      attributes: { class: OWN_UI_SELECTOR.slice(1) },
      children: [recentsSection(el({ tag: 'h2', children: ['Recents'] }))],
    });
    const heading = el({ tag: 'h2', children: ['Recents'] });
    const root = projectPage({ mainChildren: [ownSection, recentsSection(heading)] });
    expect(findProjectRecents({ root, pathname: PROJECT_PATHNAME })?.heading).toBe(heading);
  });

  it('does not climb out of the main area when its Recents list is empty', () => {
    const root = projectPage({
      mainChildren: [el({ tag: 'section', children: [el({ tag: 'h2', children: ['Recents'] })] })],
    });
    expect(findProjectRecents({ root, pathname: PROJECT_PATHNAME })).toBeNull();
  });

  it('finds the Recents table of the project page main area', () => {
    const root = loadFixture('project-page');
    const recents = findProjectRecents({ root, pathname: `/project/${fakeId(9)}` });

    expect(recents?.projectId).toBe(fakeId(9));
    expect(recents?.heading.tagName).toBe('H2');
    expect(recents?.heading.closest('main')).not.toBeNull();
    expect(recents?.list.tagName).toBe('SECTION');
    expect(nativeChatLinks(recents?.list ?? root).map(chatIdOf)).toEqual(
      [0x21, 0x0e, 0x0c, 0x0b, 0x0a, 0x0d, 0x0f, 0x10, 0x11, 0x22].map(fakeId),
    );
  });

  it('is null on the project page fixture without a project pathname', () => {
    const root = loadFixture('project-page');
    expect(findProjectRecents({ root, pathname: '/new' })).toBeNull();
  });

  it('is null on the chat page fixture', () => {
    const root = loadFixture('chat-page');
    expect(findProjectRecents({ root, pathname: `/chat/${fakeId(0x0a)}` })).toBeNull();
  });

  it('is null on the chat page fixture even with a project pathname', () => {
    const root = loadFixture('chat-page');
    expect(findProjectRecents({ root, pathname: `/project/${fakeId(9)}` })).toBeNull();
  });
});
