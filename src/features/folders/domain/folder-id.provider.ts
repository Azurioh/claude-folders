import type { FolderId } from '@/features/folders/domain/folders.model';

/** Source of ids for new folders; the domain receives them, it never generates them. */
export interface FolderIdProvider {
  /**
   * Generates an id that no folder uses yet.
   * @returns A new folder id.
   */
  nextId(): FolderId;
}
