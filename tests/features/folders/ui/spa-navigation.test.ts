// @vitest-environment happy-dom

import { fakeId, linkTo, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it, vi } from 'vitest';
import { openThroughNativeLink } from '@/features/folders/ui/spa-navigation';

const LISTED_CHAT = fakeId(0x0b);
const UNLISTED_CHAT = '0f0f0f0f-0000-4000-8000-0000000000ff';

function click(init: MouseEventInit): MouseEvent {
  return new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
}

describe('openThroughNativeLink', () => {
  it("clicks claude.ai's own link so its router navigates without a reload", () => {
    const root = loadFixture('chat-page');
    const native = linkTo({ root, href: `/chat/${LISTED_CHAT}` });
    const nativeClick = vi.fn((event: Event) => {
      event.preventDefault();
    });
    native.addEventListener('click', nativeClick);
    const event = click({ button: 0 });

    openThroughNativeLink({ root, conversationId: LISTED_CHAT, event });

    expect(nativeClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }])(
    'lets the browser handle a modified click %o (new tab or window)',
    (init) => {
      const root = loadFixture('chat-page');
      const nativeClick = vi.fn();
      linkTo({ root, href: `/chat/${LISTED_CHAT}` }).addEventListener('click', nativeClick);
      const event = click(init);

      openThroughNativeLink({ root, conversationId: LISTED_CHAT, event });

      expect(nativeClick).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it('falls back to the plain link when claude.ai lists no link to the conversation', () => {
    const event = click({ button: 0 });

    openThroughNativeLink({ root: loadFixture('chat-page'), conversationId: UNLISTED_CHAT, event });

    expect(event.defaultPrevented).toBe(false);
  });
});
