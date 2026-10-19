// @vitest-environment happy-dom

import { el, elementOf, fakeId, linkTo, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { conversationTitle } from '@/shared/claude-dom/conversation-title';
import { rowOf } from '@/shared/claude-dom/native-links';

const HREF = '/chat/0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';

function linkWithText(...texts: string[]): HTMLElement {
  return el({
    tag: 'a',
    attributes: { href: HREF },
    children: texts.map((text) => el({ tag: 'span', children: [text] })),
  });
}

describe('conversationTitle', () => {
  it('strips an English relative time', () => {
    expect(conversationTitle(linkWithText('Fix the build', '32 minutes ago'))).toBe(
      'Fix the build',
    );
  });

  it('strips a singular English relative time', () => {
    expect(conversationTitle(linkWithText('Plan', '1 day ago'))).toBe('Plan');
  });

  it('strips a French relative time', () => {
    expect(conversationTitle(linkWithText('Corriger le build', 'il y a 3 heures'))).toBe(
      'Corriger le build',
    );
  });

  it('strips the Scheduled badge and what follows it', () => {
    expect(conversationTitle(linkWithText('Daily digest', 'Scheduled', 'in 2 hours'))).toBe(
      'Daily digest',
    );
  });

  it('strips the French Scheduled badge', () => {
    expect(conversationTitle(linkWithText('Résumé', 'Programmé'))).toBe('Résumé');
  });

  it('keeps words that only start like a badge', () => {
    expect(conversationTitle(linkWithText('Scheduler design'))).toBe('Scheduler design');
  });

  it('collapses whitespace between and inside text nodes', () => {
    expect(conversationTitle(linkWithText('  Multi\n  line ', '\ttitle '))).toBe(
      'Multi line title',
    );
  });

  it('reads only the row label when the link has one', () => {
    const link = el({
      tag: 'a',
      attributes: { href: HREF },
      children: [
        el({ tag: 'span', children: ['icon'] }),
        el({ tag: 'span', attributes: { 'data-row-label': '' }, children: ['Real title'] }),
      ],
    });
    expect(conversationTitle(link)).toBe('Real title');
  });

  it('reads the titles of the sidebar project conversations', () => {
    const doc = loadFixture('project-page');
    const titles = Array.from({ length: 8 }, (_, index) =>
      conversationTitle(linkTo({ root: doc, href: `/chat/${fakeId(0x0a + index)}` })),
    );
    expect(titles).toEqual(Array.from({ length: 8 }, (_, index) => `Conversation ${index + 1}`));
  });

  it('reads the title of a starred conversation from its row label, not its icon', () => {
    const doc = loadFixture('chat-page');
    expect(conversationTitle(linkTo({ root: doc, href: `/chat/${fakeId(0x12)}` }))).toBe(
      'Conversation 9',
    );
  });

  it('reads the row of an empty overlay link, without its relative time and icons', () => {
    const main = elementOf({ root: loadFixture('project-page'), selector: 'main' });
    const link = linkTo({ root: main, href: `/chat/${fakeId(0x21)}` });
    expect(link.textContent).toBe('');
    expect(rowOf(link).textContent).toContain('3 hours ago');
    expect(conversationTitle(link)).toBe('Text');
  });

  it('strips a relative time held by a time element of the row', () => {
    const row = el({
      tag: 'tr',
      children: [
        el({
          tag: 'td',
          children: [
            el({ tag: 'a', attributes: { href: HREF } }),
            el({
              tag: 'span',
              children: [
                el({ tag: 'span', children: ['Weekly review'] }),
                el({ tag: 'time', children: ['5 days ago'] }),
                el({
                  tag: 'button',
                  children: [
                    el({ tag: 'span', attributes: { 'aria-hidden': 'true' }, children: ['icon'] }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    el({ tag: 'tbody', children: [row] });
    expect(conversationTitle(linkTo({ root: row, href: HREF }))).toBe('Weekly review');
  });

  it('keeps the title when the whole list is hidden from assistive technologies', () => {
    const link = linkWithText('Hidden sidebar');
    el({ tag: 'div', attributes: { 'aria-hidden': 'true' }, children: [link] });
    expect(conversationTitle(link)).toBe('Hidden sidebar');
  });

  it('reads the titles of the sidebar Recents conversations', () => {
    const doc = loadFixture('chat-page');
    expect(conversationTitle(linkTo({ root: doc, href: `/chat/${fakeId(0x14)}` }))).toBe(
      'Conversation 11',
    );
    expect(conversationTitle(linkTo({ root: doc, href: `/chat/${fakeId(0x20)}` }))).toBe(
      'Conversation 23',
    );
  });
});
