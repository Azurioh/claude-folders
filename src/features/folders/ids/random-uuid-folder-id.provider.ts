import type { FolderIdProvider } from '@/features/folders/domain/folder-id.provider';
import type { FolderId } from '@/features/folders/domain/folders.model';

/** {@link FolderIdProvider} generating random v4 UUIDs with the Web Crypto API. */
export class RandomUuidFolderIdProvider implements FolderIdProvider {
  /**
   * Generates a random v4 UUID.
   * @returns A new folder id.
   */
  nextId(): FolderId {
    return crypto.randomUUID();
  }
}
