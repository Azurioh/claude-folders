import { nativeChatLinks } from '@/shared/claude-dom/native-links';

const DRAGGABLE_ATTRIBUTE = 'draggable';
const DRAGGABLE_VALUE = 'true';

/**
 * Makes claude.ai's conversation links draggable (claude.ai sets `draggable="false"` on them), so
 * they can be dropped on folders, and puts every link back the way it was on `restoreAll`. The
 * first value seen on a link is the one restored, even when claude.ai resets it in between.
 */
export class NativeDraggables {
  private readonly originals = new Map<Element, string | null>();

  /**
   * Makes the native conversation links of a list draggable.
   * @param list - A native conversation list next to which a folders section is shown.
   */
  enable(list: ParentNode): void {
    for (const link of this.originals.keys()) {
      if (!link.isConnected) {
        this.originals.delete(link);
      }
    }
    for (const link of nativeChatLinks(list)) {
      const value = link.getAttribute(DRAGGABLE_ATTRIBUTE);
      if (value !== DRAGGABLE_VALUE) {
        if (!this.originals.has(link)) {
          this.originals.set(link, value);
        }
        link.setAttribute(DRAGGABLE_ATTRIBUTE, DRAGGABLE_VALUE);
      }
    }
  }

  /** Gives every link made draggable its original `draggable` attribute back. */
  restoreAll(): void {
    for (const [link, value] of this.originals) {
      if (value === null) {
        link.removeAttribute(DRAGGABLE_ATTRIBUTE);
      } else {
        link.setAttribute(DRAGGABLE_ATTRIBUTE, value);
      }
    }
    this.originals.clear();
  }
}
