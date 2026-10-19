/**
 * Builds an HTML element without `innerHTML`: attributes are set one by one and text is appended
 * as text nodes.
 * @param params.document - The document that owns the element.
 * @param params.tag - The tag name.
 * @param params.className - The `class` attribute.
 * @param params.attributes - Other attributes to set.
 * @param params.children - Child nodes or text, appended in order.
 * @returns The new element.
 */
export function createElement<Tag extends keyof HTMLElementTagNameMap>(params: {
  document: Document;
  tag: Tag;
  className: string;
  attributes?: Readonly<Record<string, string>>;
  children?: readonly (Node | string)[];
}): HTMLElementTagNameMap[Tag] {
  const element = params.document.createElement(params.tag);
  element.className = params.className;
  for (const [name, value] of Object.entries(params.attributes ?? {})) {
    element.setAttribute(name, value);
  }
  element.append(...(params.children ?? []));
  return element;
}
