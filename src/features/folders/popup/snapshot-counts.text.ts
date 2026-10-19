import { i18n } from '#i18n';
import type { SnapshotCounts } from '@/features/folders/domain/folders-snapshot';

/**
 * Words the three counts of a snapshot, for messages taking them as `$1`, `$2`, `$3`.
 * @param counts - The counts.
 * @returns e.g. `["2 projects", "5 folders", "9 filed conversations"]`.
 */
export function countsText(counts: SnapshotCounts): [string, string, string] {
  return [
    i18n.t('countProjects', counts.projects),
    i18n.t('countFolders', counts.folders),
    i18n.t('countConversations', counts.conversations),
  ];
}

/**
 * Words what the storage holds, e.g. "Stored in this browser: 2 projects, 5 folders, 9 filed
 * conversations."
 * @param counts - The stored counts.
 * @returns The sentence.
 */
export function storedSummaryText(counts: SnapshotCounts): string {
  return i18n.t('storedSummary', countsText(counts));
}
