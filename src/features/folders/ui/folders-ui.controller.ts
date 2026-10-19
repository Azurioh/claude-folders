import type { FolderIdProvider } from '@/features/folders/domain/folder-id.provider';
import type { ProjectFolders, Section } from '@/features/folders/domain/folders.model';
import { toggleFolderOpen, toggleSection } from '@/features/folders/domain/folders.operations';
import type { FoldersRepository, ProjectId } from '@/features/folders/domain/folders.repository';
import type { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';
import { clearFiledMarks, markFiled } from '@/features/folders/ui/filed-marks';
import { FloatingPanels } from '@/features/folders/ui/floating-panel';
import { FolderActions } from '@/features/folders/ui/folder-actions';
import { FolderDragDrop } from '@/features/folders/ui/folder-drag-drop';
import {
  type FoldersSectionHandlers,
  renderFoldersSection,
} from '@/features/folders/ui/folders-section.view';
import { MoveActions } from '@/features/folders/ui/move-actions';
import { NativeDraggables } from '@/features/folders/ui/native-draggables';
import { copyNativeRowLook } from '@/features/folders/ui/native-row-look';
import { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';
import { openThroughNativeLink } from '@/features/folders/ui/spa-navigation';
import { currentChatId } from '@/shared/claude-dom/claude-ids';
import { findProjectRecents, type ProjectRecents } from '@/shared/claude-dom/project-recents';
import { COLOR_SCHEME_QUERY, THEME_ROOT_ATTRIBUTES } from '@/shared/claude-dom/selectors';
import {
  findSidebarProjectGroups,
  type SidebarProjectGroup,
} from '@/shared/claude-dom/sidebar-project-groups';

/** Delay after the last DOM mutation before the sections are synced again. */
const MUTATION_DEBOUNCE_MS = 150;
const SECTION_CLASS = 'nfc-section';

/** Where the "hide filed conversations" setting is read from. */
type HideFiledSource = Pick<BrowserHideFiledSetting, 'load' | 'watch'>;

/** What a section was last rendered from; it is rendered again only when one of them changes. */
interface RenderInputs {
  readonly state: ProjectFolders;
  readonly currentChatId: string | null;
  readonly headingClass: string;
}

/** A folders section mounted next to one native conversation list. */
interface Mount {
  readonly key: string;
  readonly projectId: ProjectId;
  readonly section: Section;
  readonly element: HTMLElement;
  readonly handlers: FoldersSectionHandlers;
  list: HTMLElement;
  headingClass: string;
  rendered: RenderInputs | null;
  lookCopied: boolean;
}

/** The running folders UI of a claude.ai tab. */
export interface FoldersUi {
  /** Mounts, updates and removes the sections to match the page; safe to call at any time. */
  sync(): void;
  /**
   * Closes the open panel, removes every section and mark, restores the native links made
   * draggable and stops observing the page, the drags and storage.
   */
  stop(): void;
}

function mountKey(params: { section: Section; projectId: ProjectId }): string {
  return `${params.section}:${params.projectId}`;
}

function sameInputs(params: { previous: RenderInputs | null; next: RenderInputs }): boolean {
  const { previous, next } = params;
  return (
    previous !== null &&
    previous.state === next.state &&
    previous.currentChatId === next.currentChatId &&
    previous.headingClass === next.headingClass
  );
}

class FoldersUiController implements FoldersUi {
  private readonly document: Document;
  private readonly pathname: () => string;
  private readonly store: ProjectFoldersStore;
  private readonly panels: FloatingPanels;
  private readonly actions: FolderActions;
  private readonly moves: MoveActions;
  private readonly dragDrop: FolderDragDrop;
  private readonly nativeDraggables = new NativeDraggables();
  private readonly mounts = new Map<string, Mount>();
  private readonly observer: MutationObserver;
  private readonly themeObserver: MutationObserver;
  private readonly colorScheme: MediaQueryList;
  private readonly onColorSchemeChange = (): void => {
    this.scheduleLookCopy();
  };
  private readonly unwatchHideFiled: () => void;
  private hideFiled: boolean | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  constructor(params: {
    document: Document;
    pathname: () => string;
    repository: FoldersRepository;
    hideFiled: HideFiledSource;
    panelLayer: HTMLElement;
    folderIds: FolderIdProvider;
    now: () => number;
  }) {
    this.document = params.document;
    this.pathname = params.pathname;
    this.store = new ProjectFoldersStore({
      repository: params.repository,
      onChange: () => {
        this.sync();
      },
    });
    this.panels = new FloatingPanels(params.panelLayer);
    this.actions = new FolderActions({
      store: this.store,
      panels: this.panels,
      folderIds: params.folderIds,
      listsOf: (projectId) => this.listsOf(projectId),
    });
    this.moves = new MoveActions({ store: this.store, panels: this.panels });
    this.dragDrop = new FolderDragDrop({
      window: this.document.defaultView ?? window,
      store: this.store,
      now: params.now,
      sections: () =>
        [...this.mounts.values()].map((mount) => ({
          projectId: mount.projectId,
          element: mount.element,
        })),
      listsOf: (projectId) => this.listsOf(projectId),
    });
    this.observer = new MutationObserver(() => {
      this.scheduleSync();
    });
    this.observer.observe(this.document.body, { childList: true, subtree: true });
    this.themeObserver = new MutationObserver(() => {
      this.scheduleLookCopy();
    });
    for (const root of [this.document.documentElement, this.document.body]) {
      this.themeObserver.observe(root, { attributeFilter: [...THEME_ROOT_ATTRIBUTES] });
    }
    this.colorScheme = (this.document.defaultView ?? window).matchMedia(COLOR_SCHEME_QUERY);
    this.colorScheme.addEventListener('change', this.onColorSchemeChange);
    this.unwatchHideFiled = params.hideFiled.watch((hideFiled) => {
      this.applyHideFiled(hideFiled);
    });
    void params.hideFiled.load().then((hideFiled) => {
      this.applyHideFiled(hideFiled);
    });
  }

  sync(): void {
    if (this.stopped) {
      return;
    }
    const pathname = this.pathname();
    const recents = findProjectRecents({ root: this.document, pathname });
    const groups = findSidebarProjectGroups(
      recents === null ? { root: this.document } : { root: this.document, exclude: recents.list },
    );
    const placed = new Set<string>();
    for (const group of groups) {
      this.placeSidebarSection({ group, placed });
    }
    if (recents !== null) {
      this.placeProjectPageSection({ recents, placed });
    }
    this.removeMountsExcept(placed);
    const chatId = currentChatId(pathname);
    for (const mount of this.mounts.values()) {
      this.refresh({ mount, currentChatId: chatId });
    }
  }

  stop(): void {
    this.stopped = true;
    this.panels.close();
    this.dragDrop.stop();
    this.observer.disconnect();
    this.themeObserver.disconnect();
    this.colorScheme.removeEventListener('change', this.onColorSchemeChange);
    clearTimeout(this.syncTimer);
    this.store.dispose();
    this.unwatchHideFiled();
    this.removeMountsExcept(new Set());
    clearFiledMarks(this.document);
    this.nativeDraggables.restoreAll();
  }

  private scheduleSync(): void {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.sync();
    }, MUTATION_DEBOUNCE_MS);
  }

  /** The theme may have changed: copy the native row look again at the next (debounced) sync. */
  private scheduleLookCopy(): void {
    for (const mount of this.mounts.values()) {
      mount.lookCopied = false;
    }
    this.scheduleSync();
  }

  private applyHideFiled(hideFiled: boolean): void {
    this.hideFiled = hideFiled;
    this.sync();
  }

  private placeSidebarSection(params: { group: SidebarProjectGroup; placed: Set<string> }): void {
    const { group, placed } = params;
    const mount = this.mountFor({
      section: 'sidebar',
      projectId: group.projectId,
      list: group.list,
    });
    if (mount === null) {
      return;
    }
    if (group.list.firstElementChild !== mount.element) {
      group.list.prepend(mount.element);
    }
    placed.add(mount.key);
  }

  private placeProjectPageSection(params: { recents: ProjectRecents; placed: Set<string> }): void {
    const { recents, placed } = params;
    const mount = this.mountFor({
      section: 'projectPage',
      projectId: recents.projectId,
      list: recents.list,
    });
    if (mount === null) {
      return;
    }
    mount.headingClass = recents.heading.className;
    if (mount.element.nextElementSibling !== recents.heading) {
      recents.heading.before(mount.element);
    }
    placed.add(mount.key);
  }

  /** Finds or creates the mount of a section; `null` while its project is still loading. */
  private mountFor(params: {
    section: Section;
    projectId: ProjectId;
    list: HTMLElement;
  }): Mount | null {
    const { section, projectId, list } = params;
    if (this.store.find(projectId) === null) {
      return null;
    }
    const key = mountKey({ section, projectId });
    const mount = this.mounts.get(key) ?? this.createMount({ key, section, projectId, list });
    if (mount.list !== list) {
      clearFiledMarks(mount.list);
      mount.list = list;
    }
    return mount;
  }

  private createMount(params: {
    key: string;
    section: Section;
    projectId: ProjectId;
    list: HTMLElement;
  }): Mount {
    const { key, section, projectId, list } = params;
    const element = this.document.createElement(section === 'sidebar' ? 'li' : 'div');
    element.className = `${SECTION_CLASS} nfc-${section === 'sidebar' ? 'sidebar' : 'project-page'}`;
    const mount: Mount = {
      key,
      projectId,
      section,
      element,
      handlers: this.handlersFor({ projectId, section: element }),
      list,
      headingClass: '',
      rendered: null,
      lookCopied: false,
    };
    this.mounts.set(key, mount);
    return mount;
  }

  /** The native lists next to which the sections of a project are currently mounted. */
  private listsOf(projectId: ProjectId): HTMLElement[] {
    return [...this.mounts.values()]
      .filter((mount) => mount.projectId === projectId && mount.list.isConnected)
      .map((mount) => mount.list);
  }

  private handlersFor(params: {
    projectId: ProjectId;
    section: HTMLElement;
  }): FoldersSectionHandlers {
    const { projectId } = params;
    return {
      ...this.actions.handlersFor(params),
      ...this.moves.handlersFor(params),
      onToggleFolder: (folderId) => {
        this.store.apply({
          projectId,
          operation: (state) => toggleFolderOpen({ state, folderId }),
        });
      },
      onToggleSection: (section) => {
        this.store.apply({ projectId, operation: (state) => toggleSection({ state, section }) });
      },
      onOpenConversation: ({ conversationId, event }) => {
        openThroughNativeLink({ root: this.document, conversationId, event });
      },
    };
  }

  private removeMountsExcept(kept: ReadonlySet<string>): void {
    for (const [key, mount] of this.mounts) {
      if (!kept.has(key)) {
        mount.element.remove();
        clearFiledMarks(mount.list);
        this.mounts.delete(key);
      }
    }
  }

  private refresh(params: { mount: Mount; currentChatId: string | null }): void {
    const { mount } = params;
    const state = this.store.find(mount.projectId);
    if (state === null) {
      return;
    }
    const inputs: RenderInputs = {
      state,
      currentChatId: params.currentChatId,
      headingClass: mount.headingClass,
    };
    if (!sameInputs({ previous: mount.rendered, next: inputs })) {
      renderFoldersSection({
        container: mount.element,
        section: mount.section,
        state,
        currentChatId: inputs.currentChatId,
        headingClass: inputs.headingClass,
        handlers: mount.handlers,
      });
      mount.rendered = inputs;
    }
    this.nativeDraggables.enable(mount.list);
    if (!mount.lookCopied) {
      mount.lookCopied = copyNativeRowLook({ section: mount.element, list: mount.list });
    }
    if (this.hideFiled !== null) {
      markFiled({ list: mount.list, state, hideFiled: this.hideFiled });
    }
  }
}

/**
 * Starts the folders UI of a claude.ai tab: a folders section is mounted in every expanded
 * sidebar project and on the project page, filed conversations are hidden (or dimmed) in the
 * native lists next to them, and everything follows DOM mutations (debounced), storage changes
 * from any tab and calls to `sync` (e.g. on SPA navigation). Folders and conversations are moved
 * by drag and drop (including claude.ai's own conversation links) or with the "Move to…" panel.
 * @param params.document - The claude.ai document.
 * @param params.pathname - Reads the current `location.pathname`.
 * @param params.repository - Where folder trees are read, watched and saved.
 * @param params.hideFiled - The "hide filed conversations" setting.
 * @param params.panelLayer - Where floating panels are rendered: a container inside a shadow root,
 *   so claude.ai's styles and the panels' do not collide.
 * @param params.folderIds - Generates the ids of new folders.
 * @param params.now - Reads the current time in milliseconds; dates what a drag remembers.
 * @returns The running UI; call `stop` when the content script is invalidated.
 */
export function startFoldersUi(params: {
  document: Document;
  pathname: () => string;
  repository: FoldersRepository;
  hideFiled: HideFiledSource;
  panelLayer: HTMLElement;
  folderIds: FolderIdProvider;
  now: () => number;
}): FoldersUi {
  const ui = new FoldersUiController(params);
  ui.sync();
  return ui;
}
