import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';

/** Everything the extension stores: the folder tree of every project and the display setting. */
export type FoldersSnapshot = {
  readonly projects: Readonly<Record<ProjectId, ProjectFolders>>;
  readonly hideFiled: boolean;
};

/** How much a snapshot holds, as shown to the user before and after a backup operation. */
export type SnapshotCounts = {
  readonly projects: number;
  readonly folders: number;
  readonly conversations: number;
};

/**
 * Counts the projects, folders and filed conversations of a snapshot.
 * @param snapshot - The snapshot to count.
 * @returns The totals over every project.
 */
export function countSnapshot(snapshot: FoldersSnapshot): SnapshotCounts {
  const projects = Object.values(snapshot.projects);
  return {
    projects: projects.length,
    folders: projects.reduce((total, project) => total + Object.keys(project.folders).length, 0),
    conversations: projects.reduce(
      (total, project) => total + Object.keys(project.conversations).length,
      0,
    ),
  };
}
