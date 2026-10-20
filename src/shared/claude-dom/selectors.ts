/**
 * Every assumption about claude.ai's markup and routes lives here. When claude.ai changes, update
 * this file (and the fixtures under `tests/fixtures/claude-dom/`), not the callers.
 * Anchors are structural (landmarks, `href` shapes, `data-*` attributes); Tailwind class names
 * are never used because they change too often.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Rejects a UUID that is only the start of a longer id-like token. */
const UUID_END = '(?![0-9a-f-])';

/** Root marker of the extension's own UI; anything inside it is never treated as claude.ai's. */
export const OWN_UI_SELECTOR = '.nfc-section';

export const CHAT_LINK_SELECTOR = 'a[href*="/chat/"]';
export const PROJECT_LINK_SELECTOR = 'a[href*="/project/"]';

/** Conversation id in a link `href`, relative or absolute. */
export const CHAT_HREF_PATTERN = new RegExp(`/chat/(${UUID})${UUID_END}`, 'i');
/** Project id in a link `href`, relative or absolute. */
export const PROJECT_HREF_PATTERN = new RegExp(`/project/(${UUID})${UUID_END}`, 'i');
/** Conversation id of the current page, from `location.pathname`. */
export const CHAT_PATHNAME_PATTERN = new RegExp(`^/chat/(${UUID})${UUID_END}`, 'i');
/** Project id of the current page, from `location.pathname`. */
export const PROJECT_PATHNAME_PATTERN = new RegExp(`^/project/(${UUID})${UUID_END}`, 'i');

/** Main content landmark; the sidebar is an `aside` outside of it. */
export const MAIN_SELECTOR = 'main';

/**
 * The message composer (an editable `role="textbox"`), searched inside `MAIN_SELECTOR`: on a
 * project page it starts a new session of that project, on a chat page it answers the chat.
 */
export const COMPOSER_SELECTOR = '[data-testid="chat-input"]';
/** The composer's frame around its field, attachments and send button. */
export const COMPOSER_FRAME_SELECTOR = 'fieldset';

/**
 * One sidebar project: holds the project link and, while the project is expanded, the nested
 * list of its conversations. Its value is the project id.
 */
export const SIDEBAR_PROJECT_GROUP_SELECTOR = '[data-group-list]';
/** The conversation list nested in an expanded sidebar project. */
export const SIDEBAR_PROJECT_LIST_SELECTOR = 'ul';

/** Text of the element wrapping a conversation title inside its link. */
export const ROW_LABEL_SELECTOR = '[data-row-label]';
/**
 * Row content that is never part of a title: relative times, action buttons and icons. Needed when
 * the title is read from the row because the link is an empty overlay (project page Recents).
 */
export const NON_TITLE_TEXT_SELECTOR = 'time, button, [aria-hidden="true"]';

/** Labels of the "Recents" heading, in every supported claude.ai language. */
export const RECENTS_LABELS: readonly string[] = ['Recents', 'Récents', 'Recent', 'Récent'];

/** Trailing "Scheduled" badge of a conversation row (EN/FR) and anything after it. */
export const SCHEDULED_SUFFIX_PATTERN = /\s+(?:Scheduled|Programmé)(?=\s|$).*$/i;
/** Trailing English relative time, e.g. "32 minutes ago". */
export const RELATIVE_TIME_EN_SUFFIX_PATTERN =
  /\s+\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago\s*$/i;
/** Trailing French relative time, e.g. "il y a 3 heures". */
export const RELATIVE_TIME_FR_SUFFIX_PATTERN = /\s+il y a\s+.*$/i;

/** How far `rowOf` climbs from a conversation link to its row. */
export const ROW_MAX_DEPTH = 4;
/** How far `findProjectRecents` climbs from the heading to the list it labels. */
export const RECENTS_LIST_MAX_DEPTH = 4;

/**
 * Attributes of `<html>` and `<body>` through which claude.ai switches its theme: `data-mode`
 * (`light`/`dark`) and `data-theme` on the root, plus the classes and inline styles that carry
 * the theme tokens. Other root attributes (build ids, boot state) change without restyling rows.
 */
export const THEME_ROOT_ATTRIBUTES: readonly string[] = [
  'data-mode',
  'data-theme',
  'class',
  'style',
];
/** Media query whose changes follow the OS theme, which claude.ai's "system" appearance mirrors. */
export const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
