import { BACKUP_MEDIA_TYPE } from '@/features/folders/backup/backup-file';

/** Delay before the object URL is released; Firefox cancels a download whose URL is revoked during the click. */
const REVOKE_DELAY_MS = 1000;

/** A text file handed to the user. */
export type DownloadedFile = { readonly fileName: string; readonly content: string };

/**
 * Hands a JSON file to the user through a temporary object URL and a `download` link: no
 * `downloads` permission and no network involved.
 * @param params.document - The page document.
 * @param params.file - The file name and its content.
 */
export function downloadJsonFile(params: { document: Document; file: DownloadedFile }): void {
  const { document, file } = params;
  const url = URL.createObjectURL(new Blob([file.content], { type: BACKUP_MEDIA_TYPE }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}
