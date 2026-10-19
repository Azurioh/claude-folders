import chatPageHtml from '@@/tests/fixtures/claude-dom/chat-page.html?raw';
import projectPageHtml from '@@/tests/fixtures/claude-dom/project-page.html?raw';

const FIXTURES = {
  'chat-page': chatPageHtml,
  'project-page': projectPageHtml,
} as const;

const FAKE_ID_PREFIX = '00000000-0000-4000-8000-';
const FAKE_ID_DIGITS = 12;
const HEX_RADIX = 16;

/** Thrown when a fixture lacks a node a test relies on. */
export class MissingFixtureNodeError extends Error {
  override name = 'MissingFixtureNodeError';
}

/**
 * Fake UUID given to the n-th anonymised id by `scripts/capture-fixture.js`.
 * @param n - The 1-based order in which the capture script met the real id.
 * @returns The fake id, e.g. `00000000-0000-4000-8000-000000000009` for 9.
 */
export function fakeId(n: number): string {
  return `${FAKE_ID_PREFIX}${n.toString(HEX_RADIX).padStart(FAKE_ID_DIGITS, '0')}`;
}

/**
 * Parses a claude.ai snapshot from `tests/fixtures/claude-dom/`.
 * - `project-page`: the `/project/<id>` page of project `fakeId(9)`, with its "Recents" table in
 *   the main area; the same project is expanded in the sidebar.
 * - `chat-page`: conversation `fakeId(0x0a)` (`/chat/<id>`), project `fakeId(9)` still expanded
 *   in the sidebar.
 * @param name - The fixture file name without extension.
 * @returns The parsed document.
 */
export function loadFixture(name: keyof typeof FIXTURES): Document {
  return new DOMParser().parseFromString(FIXTURES[name], 'text/html');
}

/**
 * Builds an element for small hand-written DOMs.
 * @param params.tag - The tag name.
 * @param params.attributes - Attributes to set.
 * @param params.children - Child nodes or text, appended in order.
 * @returns The new element, owned by the global test document.
 */
export function el(params: {
  tag: string;
  attributes?: Record<string, string>;
  children?: (Node | string)[];
}): HTMLElement {
  const { tag, attributes, children } = params;
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes ?? {})) {
    element.setAttribute(name, value);
  }
  element.append(...(children ?? []));
  return element;
}

/**
 * Returns the anchor whose `href` is exactly `href`.
 * @param params.root - Where to search.
 * @param params.href - The exact `href` attribute value.
 * @returns The anchor.
 * @throws {MissingFixtureNodeError} When no such anchor exists.
 */
export function linkTo(params: { root: ParentNode; href: string }): HTMLAnchorElement {
  const { root, href } = params;
  const link = root.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
  if (link === null) {
    throw new MissingFixtureNodeError(`No link to ${href}`);
  }
  return link;
}

/**
 * Returns the first element matching `selector`.
 * @param params.root - Where to search.
 * @param params.selector - A CSS selector.
 * @returns The element.
 * @throws {MissingFixtureNodeError} When nothing matches.
 */
export function elementOf(params: { root: ParentNode; selector: string }): HTMLElement {
  const { root, selector } = params;
  const element = root.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new MissingFixtureNodeError(`Nothing matches ${selector}`);
  }
  return element;
}
