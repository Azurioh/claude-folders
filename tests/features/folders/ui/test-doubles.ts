import { loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { FolderIdProvider } from '@/features/folders/domain/folder-id.provider';
import {
  emptyProject,
  type FolderId,
  type ProjectFolders,
} from '@/features/folders/domain/folders.model';
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

/**
 * Builds the layer floating panels are rendered in, as the content script does: a container
 * inside an open shadow root attached to an element of the document body.
 * @returns The container, inside its shadow root.
 */
export function createPanelLayer(): HTMLElement {
  const host = document.createElement('nfc-panels');
  document.body.append(host);
  const container = document.createElement('div');
  host.attachShadow({ mode: 'open' }).append(container);
  return container;
}

/**
 * Returns the element focused inside the shadow root holding `layer`.
 * @param layer - The panel layer.
 * @returns The focused element of that shadow root, or `null`.
 */
export function focusedInLayer(layer: HTMLElement): Element | null {
  const root = layer.getRootNode();
  return root instanceof ShadowRoot ? root.activeElement : null;
}

/**
 * Presses a key on an element, as the keyboard would.
 * @param params.target - The element receiving the key.
 * @param params.key - The `KeyboardEvent.key` value.
 */
export function pressKey(params: { target: Element; key: string }): void {
  params.target.dispatchEvent(
    new KeyboardEvent('keydown', { key: params.key, bubbles: true, composed: true }),
  );
}

/**
 * Presses a pointer on an element, as a mouse or a finger would before a click.
 * @param target - The element pressed.
 */
export function pressPointer(target: Element): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
}

/** {@link FolderIdProvider} returning `folder-1`, `folder-2`… in order. */
export class SequentialFolderIdProvider implements FolderIdProvider {
  private count = 0;

  nextId(): FolderId {
    this.count += 1;
    return `folder-${this.count}`;
  }
}

/**
 * Fires a drag and drop event, as the browser would. happy-dom has no `DragEvent` (its
 * `window.DragEvent` is plain `Event`), so the event is an `Event` carrying the given
 * `dataTransfer`, which happy-dom does implement.
 * @param params.target - The element under the pointer.
 * @param params.type - `dragstart`, `dragenter`, `dragover`, `drop` or `dragend`.
 * @param params.transfer - The drag data, shared by every event of one drag.
 * @returns The dispatched event, to check `defaultPrevented`.
 */
export function fireDrag(params: { target: Element; type: string; transfer: DataTransfer }): Event {
  const event = new Event(params.type, { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'dataTransfer', { value: params.transfer });
  params.target.dispatchEvent(event);
  return event;
}

/** A clock whose time only moves when told to. */
export class ManualClock {
  private time = 0;

  /** @returns The current time, in milliseconds. */
  now(): number {
    return this.time;
  }

  /**
   * Moves the time forward.
   * @param ms - How many milliseconds pass.
   */
  advance(ms: number): void {
    this.time += ms;
  }
}
