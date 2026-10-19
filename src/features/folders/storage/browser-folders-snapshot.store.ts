import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import type { FoldersSnapshot } from '@/features/folders/domain/folders-snapshot';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';

/**
 * {@link FoldersSnapshotStore} over `browser.storage.local`. Every read and write goes through
 * {@link BrowserFoldersRepository} and {@link BrowserHideFiledSetting}, so reads are validated
 * and writes record the schema version of each key, exactly as the content script's own writes.
 */
export class BrowserFoldersSnapshotStore implements FoldersSnapshotStore {
  private readonly repository = new BrowserFoldersRepository();
  private readonly hideFiled = new BrowserHideFiledSetting();

  /** @inheritDoc */
  async read(): Promise<FoldersSnapshot> {
    const projectIds = await this.repository.listProjectIds();
    const entries = await Promise.all(
      projectIds.map(
        async (projectId): Promise<[ProjectId, ProjectFolders]> => [
          projectId,
          await this.repository.load(projectId),
        ],
      ),
    );
    return { projects: Object.fromEntries(entries), hideFiled: await this.hideFiled.load() };
  }

  /**
   * @inheritDoc
   * @throws {InvalidProjectIdError} When a project id of the snapshot is not a UUID (as a
   * rejection); validate snapshots built from outside data first.
   */
  async replace(snapshot: FoldersSnapshot): Promise<void> {
    const stored = await this.repository.listProjectIds();
    await Promise.all(
      Object.entries(snapshot.projects).map(([projectId, state]) =>
        this.repository.save({ projectId, state }),
      ),
    );
    await this.hideFiled.save(snapshot.hideFiled);
    const kept = new Set(
      Object.keys(snapshot.projects).map((projectId) => projectId.toLowerCase()),
    );
    await Promise.all(
      stored
        .filter((projectId) => !kept.has(projectId))
        .map((projectId) => this.repository.remove(projectId)),
    );
  }

  /** @inheritDoc */
  async clear(): Promise<void> {
    const stored = await this.repository.listProjectIds();
    await Promise.all(stored.map((projectId) => this.repository.remove(projectId)));
    await this.hideFiled.remove();
  }
}
