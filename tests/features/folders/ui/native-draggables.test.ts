// @vitest-environment happy-dom

import { el } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { NativeDraggables } from '@/features/folders/ui/native-draggables';

const ID_A = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const ID_B = '1f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';

describe('NativeDraggables', () => {
  it('makes the conversation links of a list draggable and restores them exactly', () => {
    const locked = el({ tag: 'a', attributes: { href: `/chat/${ID_A}`, draggable: 'false' } });
    const plain = el({ tag: 'a', attributes: { href: `/chat/${ID_B}` } });
    const list = el({ tag: 'ul', children: [locked, plain] });
    document.body.append(list);
    const draggables = new NativeDraggables();

    draggables.enable(list);
    draggables.enable(list);

    expect(locked.getAttribute('draggable')).toBe('true');
    expect(plain.getAttribute('draggable')).toBe('true');

    draggables.restoreAll();

    expect(locked.getAttribute('draggable')).toBe('false');
    expect(plain.hasAttribute('draggable')).toBe(false);
    list.remove();
  });

  it('enables a link again after claude.ai reset it, still restoring its first value', () => {
    const link = el({ tag: 'a', attributes: { href: `/chat/${ID_A}`, draggable: 'false' } });
    const list = el({ tag: 'ul', children: [link] });
    document.body.append(list);
    const draggables = new NativeDraggables();
    draggables.enable(list);

    link.setAttribute('draggable', 'false');
    draggables.enable(list);

    expect(link.getAttribute('draggable')).toBe('true');
    draggables.restoreAll();
    expect(link.getAttribute('draggable')).toBe('false');
    list.remove();
  });
});
