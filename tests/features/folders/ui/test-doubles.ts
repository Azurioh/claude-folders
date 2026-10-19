import { loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import type {
  FoldersRepository,
  ProjectFoldersListener,
  ProjectId,
  Unsubscribe,
} from '@/features/folders/domain/folders.repository';

/**
 * Makes `i18n.t` return its key (plus the substitutions in parentheses), since the fake browser
 * has no `i18n.getMessage`. Assertions then name the message key they expect.
 */
export function stubI18n(): void {
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(
    (key: string, substitutions?: string | (string | number)[]) =>
      substitutions === undefined ? key : `${key}(${String(substitutions)})`,
  );
}

/** {@link FoldersRepository} kept in memory; `writeFromAnotherTab` simulates a remote change. */
export class InMemoryFoldersRepository implements FoldersRepository {
  readonly saved: { projectId: ProjectId; state: ProjectFolders }[] = [];
  private readonly states = new Map<ProjectId, ProjectFolders>();
  private readonly listeners = new Map<ProjectId, Set<ProjectFoldersListener>>();

  constructor(initial: Record<ProjectId, ProjectFolders>) {
    for (const [projectId, state] of Object.entries(initial)) {
      this.states.set(projectId, state);
    }
  }

  async load(projectId: ProjectId): Promise<ProjectFolders> {
    return this.states.get(projectId) ?? emptyProject();
  }

  async save(params: { projectId: ProjectId; state: ProjectFolders }): Promise<void> {
    this.saved.push(params);
    this.write(params);
  }

  watch(params: { projectId: ProjectId; listener: ProjectFoldersListener }): Unsubscribe {
    const listeners = this.listeners.get(params.projectId) ?? new Set();
    listeners.add(params.listener);
    this.listeners.set(params.projectId, listeners);
    return () => {
      listeners.delete(params.listener);
    };
  }

  /** Number of active watches, all projects included. */
  watcherCount(): number {
    return [...this.listeners.values()].reduce((total, set) => total + set.size, 0);
  }

  /**
   * Stores a tree and notifies the watchers, as `storage.onChanged` does for another tab's write.
   * @param params.projectId - The project written.
   * @param params.state - The new tree.
   */
  writeFromAnotherTab(params: { projectId: ProjectId; state: ProjectFolders }): void {
    this.write(params);
  }

  private write(params: { projectId: ProjectId; state: ProjectFolders }): void {
    this.states.set(params.projectId, params.state);
    for (const listener of this.listeners.get(params.projectId) ?? []) {
      listener(params.state);
    }
  }
}

/** In-memory "hide filed conversations" setting. */
export class InMemoryHideFiledSetting {
  private readonly listeners = new Set<(hideFiled: boolean) => void>();

  constructor(private value: boolean) {}

  async load(): Promise<boolean> {
    return this.value;
  }

  watch(listener: (hideFiled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Number of active watches. */
  watcherCount(): number {
    return this.listeners.size;
  }

  /**
   * Changes the value and notifies the watchers, as another tab would.
   * @param value - The new value.
   */
  set(value: boolean): void {
    this.value = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

/**
 * Replaces the global test document with a claude.ai fixture, so code observing `document.body`
 * and using the global timers runs against it.
 * @param name - The fixture to load.
 */
export function showFixture(name: Parameters<typeof loadFixture>[0]): void {
  const fixture = loadFixture(name);
  document.documentElement.replaceChildren(
    document.importNode(fixture.head, true),
    document.importNode(fixture.body, true),
  );
}

/** Lets pending promise callbacks (repository loads) run. */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
