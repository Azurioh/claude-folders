import {
  CHAT_HREF_PATTERN,
  CHAT_PATHNAME_PATTERN,
  PROJECT_HREF_PATTERN,
  PROJECT_PATHNAME_PATTERN,
} from '@/shared/claude-dom/selectors';

function firstGroupOf(params: { pattern: RegExp; value: string }): string | null {
  const { pattern, value } = params;
  return pattern.exec(value)?.[1]?.toLowerCase() ?? null;
}

/**
 * Reads the conversation id a link points to.
 * @param link - Any element with an `href` attribute.
 * @returns The lowercase conversation UUID, or `null` when the link is not a conversation link.
 */
export function chatIdOf(link: Element): string | null {
  return firstGroupOf({ pattern: CHAT_HREF_PATTERN, value: link.getAttribute('href') ?? '' });
}

/**
 * Reads the project id a link points to.
 * @param link - Any element with an `href` attribute.
 * @returns The lowercase project UUID, or `null` when the link is not a project link.
 */
export function projectIdOf(link: Element): string | null {
  return firstGroupOf({ pattern: PROJECT_HREF_PATTERN, value: link.getAttribute('href') ?? '' });
}

/**
 * Reads the conversation shown by the current page.
 * @param pathname - `location.pathname` of the page.
 * @returns The lowercase conversation UUID, or `null` when the page is not a conversation.
 */
export function currentChatId(pathname: string): string | null {
  return firstGroupOf({ pattern: CHAT_PATHNAME_PATTERN, value: pathname });
}

/**
 * Reads the project shown by the current page.
 * @param pathname - `location.pathname` of the page.
 * @returns The lowercase project UUID, or `null` when the page is not a project page.
 */
export function currentProjectId(pathname: string): string | null {
  return firstGroupOf({ pattern: PROJECT_PATHNAME_PATTERN, value: pathname });
}
