import type { ProjectFolders } from '@/features/folders/domain/folders.model';

/** Identifier of a claude.ai project, as it appears in the project URL. */
export type ProjectId = string;

/** Receives the latest folder tree of a project after it changed, in this tab or another one. */
export type ProjectFoldersListener = (state: ProjectFolders) => void;

/** Stops a watch started with {@link FoldersRepository.watch}. */
export type Unsubscribe = () => void;

/** Persistence of each project's folder tree. */
export interface FoldersRepository {
  /**
   * Reads the folder tree of a project.
   * @param projectId - The project to read.
   * @returns The stored tree, or an empty project when nothing valid is stored.
   */
  load(projectId: ProjectId): Promise<ProjectFolders>;

  /**
   * Replaces the stored folder tree of a project.
   * @param params.projectId - The project to write.
   * @param params.state - The tree to store.
   */
  save(params: { projectId: ProjectId; state: ProjectFolders }): Promise<void>;

  /**
   * Listens to changes of a project's folder tree, including those made by other tabs.
   * @param params.projectId - The project to watch.
   * @param params.listener - Called with the new tree on every change.
   * @returns A function that stops the watch.
   */
  watch(params: { projectId: ProjectId; listener: ProjectFoldersListener }): Unsubscribe;
}
