// @vitest-environment happy-dom

import { fakeId, linkTo, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { copyNativeRowLook } from '@/features/folders/ui/native-row-look';
import { rowOf } from '@/shared/claude-dom/native-links';
import { findSidebarProjectGroups } from '@/shared/claude-dom/sidebar-project-groups';

const ROW_HEIGHT = 36;

function sidebarList(root: Document): HTMLElement {
  const [group] = findSidebarProjectGroups({ root });
  if (group === undefined) {
    throw new Error('No expanded sidebar project in the fixture');
  }
  return group.list;
}

function showRow(row: Element): void {
  Object.defineProperty(row, 'offsetHeight', { value: ROW_HEIGHT });
  row.getBoundingClientRect = () => new DOMRect(0, 0, 200, ROW_HEIGHT);
}

describe('copyNativeRowLook', () => {
  it('does nothing while no native row is laid out (test DOMs have no layout)', () => {
    const root = loadFixture('chat-page');
    const section = root.createElement('div');

    expect(copyNativeRowLook({ section, list: sidebarList(root) })).toBe(false);
    expect(section.getAttribute('style')).toBeNull();
  });

  it("copies a laid-out row's height, font size and color into custom properties", () => {
    const root = loadFixture('chat-page');
    const list = document.importNode(sidebarList(root), true);
    document.body.replaceChildren(list);
    const link = linkTo({ root: list, href: `/chat/${fakeId(0x0a)}` });
    link.style.fontSize = '14px';
    link.style.color = 'rgb(10, 20, 30)';
    showRow(rowOf(link));
    const section = document.createElement('div');

    expect(copyNativeRowLook({ section, list })).toBe(true);
    expect(section.style.getPropertyValue('--nfc-row-h')).toBe(`${ROW_HEIGHT}px`);
    expect(section.style.getPropertyValue('--nfc-font')).toBe('14px');
    expect(section.style.getPropertyValue('--nfc-color')).toBe('rgb(10, 20, 30)');
  });

  it('drops a copied bottom border once the native row no longer has one', () => {
    const root = loadFixture('chat-page');
    const list = document.importNode(sidebarList(root), true);
    document.body.replaceChildren(list);
    const row = rowOf(linkTo({ root: list, href: `/chat/${fakeId(0x0a)}` }));
    if (!(row instanceof HTMLElement)) {
      throw new Error('The native row is not an HTML element');
    }
    showRow(row);
    row.style.borderBottom = '1px solid rgb(1, 2, 3)';
    const section = document.createElement('div');
    copyNativeRowLook({ section, list });
    expect(section.style.getPropertyValue('--nfc-border')).not.toBe('');

    row.style.borderBottom = '0px none rgb(1, 2, 3)';
    copyNativeRowLook({ section, list });

    expect(section.style.getPropertyValue('--nfc-border')).toBe('');
  });
});
