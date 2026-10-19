import { i18n } from '#i18n';
import { BACKUP_MAX_BYTES } from '@/features/folders/backup/backup-file';
import type { BackupFileError } from '@/features/folders/backup/backup-file.parser';

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Explains why a backup file was rejected, naming the wrong part (and the project's position)
 * without quoting the file.
 * @param error - The parse error.
 * @returns The message shown under the import button.
 */
export function backupErrorText(error: BackupFileError): string {
  switch (error.code) {
    case 'too-large':
      return i18n.t('backupErrorTooLarge', [String(BACKUP_MAX_BYTES / BYTES_PER_MEGABYTE)]);
    case 'unreadable':
      return i18n.t('backupErrorUnreadable');
    case 'not-json':
      return i18n.t('backupErrorNotJson');
    case 'wrong-format':
      return i18n.t('backupErrorWrongFormat');
    case 'unsupported-version':
      return i18n.t('backupErrorUnsupportedVersion');
    case 'invalid-exported-at':
      return i18n.t('backupErrorInvalidExportedAt');
    case 'invalid-settings':
      return i18n.t('backupErrorInvalidSettings');
    case 'invalid-projects':
      return i18n.t('backupErrorInvalidProjects');
    case 'invalid-project-id':
      return i18n.t('backupErrorInvalidProjectId', [String(error.position)]);
    case 'duplicate-project-id':
      return i18n.t('backupErrorDuplicateProjectId', [String(error.position)]);
    case 'invalid-project':
      return i18n.t('backupErrorInvalidProject', [String(error.position)]);
  }
}
