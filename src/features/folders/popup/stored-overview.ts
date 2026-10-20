import { i18n } from '#i18n';
import { countSnapshot, type SnapshotCounts } from '@/features/folders/domain/folders-snapshot';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import {
  createSection,
  createSectionHeading,
  LINK_ICON_SIZE,
} from '@/features/folders/popup/popup-controls';
import { createElement } from '@/features/folders/ui/element';
import { createIcon } from '@/features/folders/ui/icons';

const TITLE_ID = 'nfc-stored-title';
const CLAUDE_URL = 'https://claude.ai/';
const EMPTY_ICON_SIZE = 18;

/** The "Stored in this browser" overview. */
export type StoredOverview = {
  readonly element: HTMLElement;
  /** Reads the storage again and shows what it holds. */
  refresh(): Promise<void>;
};

function stat(params: { document: Document; label: string; value: string }): HTMLElement {
  const { document } = params;
  return createElement({
    document,
    tag: 'div',
    className: 'nfc-stat',
    children: [
      createElement({ document, tag: 'dt', className: 'nfc-stat-label', children: [params.label] }),
      createElement({ document, tag: 'dd', className: 'nfc-stat-value', children: [params.value] }),
    ],
  });
}

function statList(params: {
  document: Document;
  counts: SnapshotCounts;
  locale: string;
}): HTMLElement {
  const { document, counts } = params;
  const format = new Intl.NumberFormat(params.locale);
  return createElement({
    document,
    tag: 'dl',
    className: 'nfc-stats',
    children: [
      stat({
        document,
        label: i18n.t('statProjects', counts.projects),
        value: format.format(counts.projects),
      }),
      stat({
        document,
        label: i18n.t('statFolders', counts.folders),
        value: format.format(counts.folders),
      }),
      stat({
        document,
        label: i18n.t('statConversations', counts.conversations),
        value: format.format(counts.conversations),
      }),
    ],
  });
}

function emptyState(document: Document): HTMLElement {
  return createElement({
    document,
    tag: 'div',
    className: 'nfc-empty',
    children: [
      createElement({
        document,
        tag: 'span',
        className: 'nfc-empty-icon',
        children: [
          createIcon({ document, name: 'folderPlus', size: EMPTY_ICON_SIZE, className: '' }),
        ],
      }),
      createElement({
        document,
        tag: 'div',
        className: 'nfc-empty-text',
        children: [
          createElement({
            document,
            tag: 'p',
            className: 'nfc-empty-title',
            children: [i18n.t('emptyTitle')],
          }),
          createElement({
            document,
            tag: 'p',
            className: 'nfc-muted',
            children: [i18n.t('emptyHint')],
          }),
          createElement({
            document,
            tag: 'a',
            className: 'nfc-link',
            attributes: { href: CLAUDE_URL, target: '_blank', rel: 'noopener noreferrer' },
            children: [
              i18n.t('linkOpenClaude'),
              createIcon({ document, name: 'external', size: LINK_ICON_SIZE, className: '' }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Builds the "Stored in this browser" overview: the number of projects, folders and filed
 * conversations, or, while no folder exists, a hint on how to create the first one. It reads the
 * storage once built, and again on `refresh` (after an import or a deletion).
 * @param params.document - The owner document.
 * @param params.store - Whole-storage access, for the counts.
 * @param params.locale - The interface language, for the numbers.
 * @returns The overview and its refresher.
 */
export function storedOverview(params: {
  document: Document;
  store: FoldersSnapshotStore;
  locale: string;
}): StoredOverview {
  const { document, store, locale } = params;
  const body = createElement({
    document,
    tag: 'div',
    className: 'nfc-overview',
    attributes: { 'aria-busy': 'true' },
  });
  const refresh = async () => {
    const counts = countSnapshot(await store.read());
    body.replaceChildren(
      counts.folders === 0 ? emptyState(document) : statList({ document, counts, locale }),
    );
    body.setAttribute('aria-busy', 'false');
  };
  void refresh();
  return {
    element: createSection({
      document,
      id: TITLE_ID,
      className: 'nfc-card-overview',
      children: [
        createSectionHeading({
          document,
          id: TITLE_ID,
          title: i18n.t('sectionStoredTitle'),
          description: null,
        }),
        body,
      ],
    }),
    refresh,
  };
}
