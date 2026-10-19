import { BACKUP_MAX_BYTES } from '@/features/folders/backup/backup-file';
import { type BackupParseResult, parseBackup } from '@/features/folders/backup/backup-file.parser';

/** The part of a `File` the reader needs. */
export type BackupSource = Pick<Blob, 'size' | 'text'>;

/**
 * Reads and validates a backup file picked or dropped by the user. The size is checked before
 * anything is read, so a huge file is never loaded into memory.
 * @param file - The file to read.
 * @returns The backup, or why it was rejected.
 */
export async function readBackupFile(file: BackupSource): Promise<BackupParseResult> {
  if (file.size > BACKUP_MAX_BYTES) {
    return { ok: false, error: { code: 'too-large' } };
  }
  try {
    return parseBackup(await file.text());
  } catch {
    return { ok: false, error: { code: 'unreadable' } };
  }
}
