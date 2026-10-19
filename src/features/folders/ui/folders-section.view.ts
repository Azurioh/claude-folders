import { i18n } from '#i18n';
import type { ProjectFolders, Section } from '@/features/folders/domain/folders.model';
import { createElement } from '@/features/folders/ui/element';
import { FOCUS_KEY_ATTRIBUTE, replaceKeepingFocus } from '@/features/folders/ui/focus-key';
import {
  createChevron,
  type FolderTreeHandlers,
  renderFolderTree,
} from '@/features/folders/ui/folder-tree.view';

const PROJECT_PAGE_HEADING_LEVEL = '2';

/** Reactions of a rendered folders section to user actions. */
export interface FoldersSectionHandlers extends FolderTreeHandlers {
  /** The sidebar section header was activated. */
  onToggleSection(section: Section): void;
}

function headerLabel(document: Document): HTMLElement {
  return createElement({
    document,
    tag: 'span',
    className: 'nfc-header-label',
    children: [i18n.t('foldersSectionTitle')],
  });
}

function sidebarHeader(params: {
  document: Document;
  open: boolean;
  handlers: FoldersSectionHandlers;
}): HTMLButtonElement {
  const { document, open, handlers } = params;
  const header = createElement({
    document,
    tag: 'button',
    className: 'nfc-header',
    attributes: { type: 'button', 'aria-expanded': String(open), [FOCUS_KEY_ATTRIBUTE]: 'header' },
    children: [createChevron({ document, open }), headerLabel(document)],
  });
  header.addEventListener('click', () => {
    handlers.onToggleSection('sidebar');
  });
  return header;
}

function projectPageHeader(params: { document: Document; headingClass: string }): HTMLElement {
  const { document, headingClass } = params;
  return createElement({
    document,
    tag: 'div',
    className: `nfc-header ${headingClass}`.trim(),
    attributes: { role: 'heading', 'aria-level': PROJECT_PAGE_HEADING_LEVEL },
    children: [headerLabel(document)],
  });
}

function sectionBody(params: {
  document: Document;
  section: Section;
  state: ProjectFolders;
  currentChatId: string | null;
  handlers: FoldersSectionHandlers;
}): HTMLElement[] {
  const { document, section, state, currentChatId, handlers } = params;
  if (section === 'sidebar' && !state.sectionOpen.sidebar) {
    return [];
  }
  const nodes = renderFolderTree({ document, state, parentId: null, currentChatId, handlers });
  if (nodes.length > 0 || section === 'sidebar') {
    return nodes;
  }
  return [
    createElement({
      document,
      tag: 'div',
      className: 'nfc-empty',
      children: [i18n.t('projectFoldersEmpty')],
    }),
  ];
}

/**
 * Renders a folders section into its container, replacing what was there and keeping keyboard
 * focus on the same control. The sidebar variant has a collapsible header button; the project
 * page variant has a heading that carries claude.ai's own heading classes, so it looks native,
 * and an explanation when the project has no folder.
 * @param params.container - The section root to fill.
 * @param params.section - Which of the two sections is rendered.
 * @param params.state - The project to render.
 * @param params.currentChatId - The conversation shown by the page, if any.
 * @param params.headingClass - Classes of the native heading the project page header mimics.
 * @param params.handlers - Reactions to user actions.
 */
export function renderFoldersSection(params: {
  container: HTMLElement;
  section: Section;
  state: ProjectFolders;
  currentChatId: string | null;
  headingClass: string;
  handlers: FoldersSectionHandlers;
}): void {
  const { container, section, state, headingClass, handlers } = params;
  const document = container.ownerDocument;
  const header =
    section === 'sidebar'
      ? sidebarHeader({ document, open: state.sectionOpen.sidebar, handlers })
      : projectPageHeader({ document, headingClass });
  replaceKeepingFocus({
    container,
    children: [header, ...sectionBody({ ...params, document })],
  });
}
