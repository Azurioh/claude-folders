import { nativeChatLinks, rowOf } from '@/shared/claude-dom/native-links';
import { CHAT_LINK_SELECTOR } from '@/shared/claude-dom/selectors';

function laidOutRowOf(list: ParentNode): HTMLElement | null {
  for (const link of nativeChatLinks(list)) {
    const row = rowOf(link);
    if (row instanceof HTMLElement && row.offsetHeight > 0) {
      return row;
    }
  }
  return null;
}

function linkOf(row: HTMLElement): Element {
  return row.matches(CHAT_LINK_SELECTOR) ? row : (row.querySelector(CHAT_LINK_SELECTOR) ?? row);
}

/**
 * Copies the look of claude.ai's rows in a list (font size, text color, row height and bottom
 * border) into custom properties of a folders section, so its rows match the native ones.
 * The color is copied rather than inherited because the native link sets its own (secondary)
 * text color while the list around it inherits the page's primary one. Calling it again replaces
 * the previous copy, which is how the look follows a theme change.
 * This reads layout and computed styles, so it only works on a rendered page: while no native row
 * is laid out (hidden list, test DOM) nothing is copied and the CSS fallbacks apply.
 * @param params.section - The folders section receiving `--nfc-font`, `--nfc-color`,
 *   `--nfc-row-h` and `--nfc-border`.
 * @param params.list - The native list the section sits next to.
 * @returns `true` when the look was copied, `false` when no native row is laid out yet.
 */
export function copyNativeRowLook(params: { section: HTMLElement; list: ParentNode }): boolean {
  const { section, list } = params;
  const row = laidOutRowOf(list);
  if (row === null) {
    return false;
  }
  const view = row.ownerDocument.defaultView ?? window;
  const rowStyle = view.getComputedStyle(row);
  const linkStyle = view.getComputedStyle(linkOf(row));
  section.style.setProperty('--nfc-font', linkStyle.fontSize);
  section.style.setProperty('--nfc-color', linkStyle.color);
  section.style.setProperty('--nfc-row-h', `${Math.round(row.getBoundingClientRect().height)}px`);
  if (Number.parseFloat(rowStyle.borderBottomWidth) > 0) {
    section.style.setProperty(
      '--nfc-border',
      `${rowStyle.borderBottomWidth} ${rowStyle.borderBottomStyle} ${rowStyle.borderBottomColor}`,
    );
  } else {
    section.style.removeProperty('--nfc-border');
  }
  return true;
}
