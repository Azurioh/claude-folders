// @vitest-environment happy-dom

import { el, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { findComposer } from '@/shared/claude-dom/composer';

function composerField(): HTMLElement {
  return el({ tag: 'div', attributes: { 'data-testid': 'chat-input', role: 'textbox' } });
}

describe('findComposer', () => {
  it("finds the project page's new-session composer in the main area", () => {
    const composer = findComposer(loadFixture('project-page'));

    expect(composer?.field.getAttribute('role')).toBe('textbox');
    expect(composer?.field.closest('main')).not.toBeNull();
  });

  it('frames the field with the whole composer, send button included', () => {
    const composer = findComposer(loadFixture('project-page'));

    expect(composer?.frame.tagName).toBe('FIELDSET');
    expect(composer?.frame.contains(composer.field)).toBe(true);
    expect(composer?.frame.querySelector('[data-testid="chat-input-send"]')).not.toBeNull();
  });

  it('finds the composer of a chat page too', () => {
    expect(findComposer(loadFixture('chat-page'))?.field.getAttribute('role')).toBe('textbox');
  });

  it('frames the field with itself when it has no fieldset', () => {
    const field = composerField();
    const page = el({ tag: 'div', children: [el({ tag: 'main', children: [field] })] });

    expect(findComposer(page)).toEqual({ field, frame: field });
  });

  it('ignores a composer outside the main area', () => {
    const page = el({
      tag: 'div',
      children: [el({ tag: 'aside', children: [composerField()] }), el({ tag: 'main' })],
    });

    expect(findComposer(page)).toBeNull();
  });

  it('gives nothing while the page has no main area', () => {
    expect(findComposer(el({ tag: 'div', children: [composerField()] }))).toBeNull();
  });
});
