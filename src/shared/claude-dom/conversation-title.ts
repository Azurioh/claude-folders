import { rowOf } from '@/shared/claude-dom/native-links';
import {
  NON_TITLE_TEXT_SELECTOR,
  RELATIVE_TIME_EN_SUFFIX_PATTERN,
  RELATIVE_TIME_FR_SUFFIX_PATTERN,
  ROW_LABEL_SELECTOR,
  SCHEDULED_SUFFIX_PATTERN,
} from '@/shared/claude-dom/selectors';

const WHITESPACE_RUN = /\s+/g;
const TITLE_SUFFIX_PATTERNS = [
  SCHEDULED_SUFFIX_PATTERN,
  RELATIVE_TIME_EN_SUFFIX_PATTERN,
  RELATIVE_TIME_FR_SUFFIX_PATTERN,
] as const;

function textNodesOf(element: Element): string[] {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const ignored = node.parentElement?.closest(NON_TITLE_TEXT_SELECTOR) ?? null;
    if (ignored === null || !element.contains(ignored)) {
      texts.push(node.textContent ?? '');
    }
  }
  return texts;
}

function titleSourceOf(link: Element): Element {
  const label = link.querySelector(ROW_LABEL_SELECTOR);
  if (label !== null) {
    return label;
  }
  return link.textContent?.trim() ? link : rowOf(link);
}

function stripTitleSuffixes(text: string): string {
  let title = text;
  for (const pattern of TITLE_SUFFIX_PATTERNS) {
    title = title.replace(pattern, '');
  }
  return title;
}

/**
 * Reads the clean title of a native conversation link.
 *
 * The title source is the link's row label (`ROW_LABEL_SELECTOR`, sidebar rows), else the link
 * itself when it has text, else its row (`rowOf`): project page Recents rows are table rows whose
 * link is an empty overlay next to the title. Text is built from `textContent`, not `innerText`
 * (absent from test DOMs, and layout dependent): the source's text nodes, minus those inside
 * `NON_TITLE_TEXT_SELECTOR` (times, buttons, icons), are joined with one space and whitespace
 * runs are collapsed, as the inline spans render. A trailing "Scheduled" badge (and what follows
 * it) and a trailing relative time ("32 minutes ago", "il y a 3 heures") are then removed.
 * @param link - A native conversation link.
 * @returns The title, possibly empty.
 */
export function conversationTitle(link: Element): string {
  const text = textNodesOf(titleSourceOf(link)).join(' ').replace(WHITESPACE_RUN, ' ');
  return stripTitleSuffixes(text).trim();
}
