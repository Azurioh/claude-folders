/** Attribute naming a rendered control, so focus can be restored on its replacement. */
export const FOCUS_KEY_ATTRIBUTE = 'data-nfc-key';

function keyedElementOf(params: { container: Element; key: string }): HTMLElement | null {
  for (const element of params.container.querySelectorAll<HTMLElement>(
    `[${FOCUS_KEY_ATTRIBUTE}]`,
  )) {
    if (element.getAttribute(FOCUS_KEY_ATTRIBUTE) === params.key) {
      return element;
    }
  }
  return null;
}

/**
 * Replaces the content of a container while keeping keyboard focus on the control that had it:
 * when the focused element carries `FOCUS_KEY_ATTRIBUTE`, its replacement with the same key is
 * focused again.
 * @param params.container - The element whose children are replaced.
 * @param params.children - The new children.
 */
export function replaceKeepingFocus(params: {
  container: HTMLElement;
  children: readonly Node[];
}): void {
  const { container, children } = params;
  const focused = container.ownerDocument.activeElement;
  const key =
    focused !== null && container.contains(focused)
      ? focused.getAttribute(FOCUS_KEY_ATTRIBUTE)
      : null;
  container.replaceChildren(...children);
  if (key !== null) {
    keyedElementOf({ container, key })?.focus();
  }
}

/**
 * Focuses the first control of a container carrying one of the given focus keys, e.g. the button
 * a panel was opened from, rendered again since, or a fallback when that control is gone.
 * @param params.container - Where the controls are searched.
 * @param params.keys - Focus keys, in order of preference.
 */
export function focusFirstKeyed(params: { container: Element; keys: readonly string[] }): void {
  const { container, keys } = params;
  for (const key of keys) {
    const element = keyedElementOf({ container, key });
    if (element !== null) {
      element.focus();
      return;
    }
  }
}
