import type { FoldersSnapshot } from '@/features/folders/domain/folders-snapshot';

/** Value of the `format` field identifying a Nest for Claude backup file. */
export const BACKUP_FORMAT = 'nest-for-claude-backup';
/** Version of the backup file layout; bumped on any incompatible change. */
export const BACKUP_VERSION = 1;
/** Largest backup file accepted for import, checked before the file is read. */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
/** Media type of the downloaded backup file. */
export const BACKUP_MEDIA_TYPE = 'application/json';

const JSON_INDENT = 2;
const DATE_PART_WIDTH = 2;

/** A backup as written to disk (version 1). */
export type BackupFile = {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: string;
  readonly projects: FoldersSnapshot['projects'];
  readonly settings: { readonly hideFiled: boolean };
};

/**
 * Builds the text of a backup file.
 * @param params.snapshot - Everything stored, as read from the snapshot store.
 * @param params.exportedAt - The export time, written as an ISO 8601 UTC date.
 * @returns Indented JSON.
 */
export function serializeBackup(params: { snapshot: FoldersSnapshot; exportedAt: Date }): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: params.exportedAt.toISOString(),
    projects: params.snapshot.projects,
    settings: { hideFiled: params.snapshot.hideFiled },
  };
  return JSON.stringify(file, null, JSON_INDENT);
}

function twoDigits(value: number): string {
  return String(value).padStart(DATE_PART_WIDTH, '0');
}

/**
 * Names a backup file after the local date of the export.
 * @param date - The export time.
 * @returns e.g. `nest-for-claude-backup-2026-10-19.json`.
 */
export function backupFileName(date: Date): string {
  const day = `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
  return `${BACKUP_FORMAT}-${day}.json`;
}
