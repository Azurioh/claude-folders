import type { FoldersSnapshot } from '@/features/folders/domain/folders-snapshot';

/**
 * Whole-storage access, for backups and data deletion. Per-project reads and writes go through
 * `FoldersRepository` instead.
 */
export interface FoldersSnapshotStore {
  /**
   * Reads everything stored.
   * @returns Every stored project (invalid ones read as empty projects) and the setting.
   */
  read(): Promise<FoldersSnapshot>;

  /**
   * Replaces everything stored: projects absent from the snapshot are removed.
   * @param snapshot - The new content of the storage.
   */
  replace(snapshot: FoldersSnapshot): Promise<void>;

  /** Deletes every project and the setting. */
  clear(): Promise<void>;
}
