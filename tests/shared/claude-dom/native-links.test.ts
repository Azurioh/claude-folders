// @vitest-environment happy-dom

import { el, elementOf, fakeId, linkTo, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { isOwnUi, nativeChatLinks, rowOf } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

const ID_A = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const ID_B = '1f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const OWN_UI_CLASS = OWN_UI_SELECTOR.slice(1);

describe('isOwnUi', () => {
  it('is true inside the extension root', () => {
    const inner = el({ tag: 'span' });
    el({ tag: 'div', attributes: { class: OWN_UI_CLASS }, children: [inner] });
    expect(isOwnUi(inner)).toBe(true);
  });

  it('is false for claude.ai nodes', () => {
    expect(isOwnUi(el({ tag: 'span' }))).toBe(false);
  });
});

describe('nativeChatLinks', () => {
  it('ignores /chat/ links inside the extension UI', () => {
    const root = el({
      tag: 'div',
      children: [
        el({ tag: 'a', attributes: { href: `/chat/${ID_A}` } }),
        el({
          tag: 'div',
          attributes: { class: OWN_UI_CLASS },
          children: [el({ tag: 'a', attributes: { href: `/chat/${ID_B}` } })],
        }),
      ],
    });
    expect(nativeChatLinks(root).map(chatIdOf)).toEqual([ID_A]);
  });

  it('ignores /chat/ links without a conversation id', () => {
    const root = el({
      tag: 'div',
      children: [el({ tag: 'a', attributes: { href: '/chat/new' } })],
    });
    expect(nativeChatLinks(root)).toEqual([]);
  });

  it('finds every conversation link of the project page, sidebar and main area', () => {
    expect(nativeChatLinks(loadFixture('project-page'))).toHaveLength(33);
  });

  it('finds every conversation link of the chat page', () => {
    expect(nativeChatLinks(loadFixture('chat-page'))).toHaveLength(23);
  });

  it('finds the 13 conversations of the sidebar Recents on the chat page', () => {
    const recents = elementOf({
      root: loadFixture('chat-page'),
      selector: '[data-testid="sidebar-recents"]',
    });
    expect(nativeChatLinks(recents).map(chatIdOf)).toEqual(
      Array.from({ length: 13 }, (_, index) => fakeId(0x14 + index)),
    );
  });
});

describe('rowOf', () => {
  it('stops at the list item of a sidebar project conversation', () => {
    const doc = loadFixture('project-page');
    const row = rowOf(linkTo({ root: doc, href: `/chat/${fakeId(0x0a)}` }));
    expect(row.tagName).toBe('LI');
    expect(row.getAttribute('data-select-row-key')).toBe(`chat:${fakeId(0x0a)}`);
  });

  it('stops at the table row of a project page Recents conversation', () => {
    const main = elementOf({ root: loadFixture('project-page'), selector: 'main' });
    const row = rowOf(linkTo({ root: main, href: `/chat/${fakeId(0x21)}` }));
    expect(row.tagName).toBe('TR');
  });

  it('stops below the list of a sidebar Recents conversation', () => {
    const doc = loadFixture('chat-page');
    const row = rowOf(linkTo({ root: doc, href: `/chat/${fakeId(0x15)}` }));
    expect(row.getAttribute('data-row-key')).toBe(`chat:${fakeId(0x15)}`);
  });

  it('does not climb into the extension UI', () => {
    const link = el({ tag: 'a', attributes: { href: `/chat/${ID_A}` } });
    el({ tag: 'div', attributes: { class: OWN_UI_CLASS }, children: [link] });
    expect(rowOf(link)).toBe(link);
  });

  it('stops before a container holding a project link', () => {
    const link = el({ tag: 'a', attributes: { href: `/chat/${ID_A}` } });
    const wrapper = el({ tag: 'div', children: [link] });
    el({
      tag: 'div',
      children: [el({ tag: 'a', attributes: { href: `/project/${ID_B}` } }), wrapper],
    });
    expect(rowOf(link)).toBe(wrapper);
  });

  it('climbs at most four levels', () => {
    const link = el({ tag: 'a', attributes: { href: `/chat/${ID_A}` } });
    const fourth = el({
      tag: 'div',
      children: [
        el({
          tag: 'div',
          children: [el({ tag: 'div', children: [el({ tag: 'div', children: [link] })] })],
        }),
      ],
    });
    el({ tag: 'div', children: [fourth] });
    expect(rowOf(link)).toBe(fourth);
  });
});
