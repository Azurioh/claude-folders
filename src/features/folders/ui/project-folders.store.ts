import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import type { OperationResult } from '@/features/folders/domain/folders.operations';
import type {
  FoldersRepository,
  ProjectId,
  Unsubscribe,
} from '@/features/folders/domain/folders.repository';

interface TrackedProject {
  state: ProjectFolders | null;
  readonly unwatch: Unsubscribe;
}

/**
 * In-memory copy of the folder trees shown by the page, kept in sync with the repository.
 *
 * A project is loaded and watched the first time it is looked up; `onChange` fires whenever a
 * tracked tree changes, whether loaded, updated here or written by another tab. User actions go
 * through `apply`: a pure domain operation, then a save.
 */
export class ProjectFoldersStore {
  private readonly repository: FoldersRepository;
  private readonly onChange: () => void;
  private readonly projects = new Map<ProjectId, TrackedProject>();
  private disposed = false;

  /**
   * @param params.repository - Where the trees are persisted.
   * @param params.onChange - Called after any tracked tree changed.
   */
  constructor(params: { repository: FoldersRepository; onChange: () => void }) {
    this.repository = params.repository;
    this.onChange = params.onChange;
  }

  /**
   * Returns the tree of a project, starting to load and watch it on first access.
   * @param projectId - The project to look up.
   * @returns The tree, or `null` while it is still loading.
   */
  find(projectId: ProjectId): ProjectFolders | null {
    const tracked = this.projects.get(projectId) ?? this.track(projectId);
    return tracked.state;
  }

  /**
   * Applies a domain operation to a loaded project and persists the result. Rejected operations
   * and projects that are not loaded yet are ignored.
   * @param params.projectId - The project to update.
   * @param params.operation - The pure update to apply.
   * @returns `true` when the operation was applied, `false` when it was ignored.
   */
  apply(params: {
    projectId: ProjectId;
    operation: (state: ProjectFolders) => OperationResult;
  }): boolean {
    const { projectId, operation } = params;
    const tracked = this.projects.get(projectId);
    if (tracked === undefined || tracked.state === null) {
      return false;
    }
    const result = operation(tracked.state);
    if (!result.ok) {
      return false;
    }
    this.update({ tracked, state: result.state });
    void this.repository.save({ projectId, state: result.state });
    return true;
  }

  /** Stops every watch; later loads and changes are ignored. */
  dispose(): void {
    this.disposed = true;
    for (const tracked of this.projects.values()) {
      tracked.unwatch();
    }
    this.projects.clear();
  }

  private track(projectId: ProjectId): TrackedProject {
    const tracked: TrackedProject = {
      state: null,
      unwatch: this.repository.watch({
        projectId,
        listener: (state) => {
          this.update({ tracked, state });
        },
      }),
    };
    this.projects.set(projectId, tracked);
    void this.repository.load(projectId).then((state) => {
      if (tracked.state === null) {
        this.update({ tracked, state });
      }
    });
    return tracked;
  }

  private update(params: { tracked: TrackedProject; state: ProjectFolders }): void {
    if (this.disposed) {
      return;
    }
    params.tracked.state = params.state;
    this.onChange();
  }
}
