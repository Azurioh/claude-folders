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
