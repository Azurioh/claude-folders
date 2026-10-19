import { i18n } from '#i18n';
import { getConversation } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import { listedConversationTitle } from '@/features/folders/ui/conversation-candidates';
import {
  type DropTarget,
  findDragSource,
  findDropTarget,
} from '@/features/folders/ui/drag-markers';
import {
  type DragPayload,
  type OwnDragPayload,
  readDragPayload,
  writeDragPayload,
} from '@/features/folders/ui/drag-payload';
import { dropOperation } from '@/features/folders/ui/drop-operation';
import type { ProjectFoldersStore } from '@/features/folders/ui/project-folders.store';
import type { TreeOperation } from '@/features/folders/ui/tree-moves';
import { chatIdOf } from '@/shared/claude-dom/claude-ids';
import { draggedNativeChatLink, isOwnUi } from '@/shared/claude-dom/native-links';
import { OWN_UI_SELECTOR } from '@/shared/claude-dom/selectors';

/**
 * How long what was dragged is remembered after its `dragstart`, in case `dragend` never comes
 * (e.g. the drag left the window).
 */
const DRAG_EXPIRY_MS = 60_000;
/** Set on the sections that accept the current drag: their header shows the drop affordance. */
const DRAGGING_ATTRIBUTE = 'data-nfc-dragging';
/** Set on the drop target under the pointer while it accepts the current drag. */
const OVER_CLASS = 'nfc-over';
const MOVE_EFFECT = 'move';

/** The drag events handled, all on the window in the capture phase. */
type DragEventType = 'dragstart' | 'dragenter' | 'dragover' | 'drop' | 'dragend';
const DRAG_EVENT_TYPES: readonly DragEventType[] = [
  'dragstart',
  'dragenter',
  'dragover',
  'drop',
  'dragend',
];

/** A mounted folders section. */
export interface DropSection {
  readonly projectId: ProjectId;
  readonly element: HTMLElement;
}

interface DragSession {
  readonly payload: DragPayload;
  readonly startedAt: number;
}

/** A drop target of a section, with the project of that section. */
interface SectionTarget {
  readonly target: DropTarget;
  readonly projectId: ProjectId;
}

function elementOf(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }
  return target instanceof Node ? target.parentElement : null;
}

/**
 * Drag and drop of the folders sections. Sources: our folder and conversation rows, and
 * claude.ai's conversation links. Targets: folder rows (move or file into that folder, which
 * opens) and section headers (folder to the top level, conversation out of its folder).
 *
 * Every handler is registered on the window in the capture phase, so it runs before claude.ai's
 * own drag handlers, which would otherwise swallow the events. What is dragged is remembered at
 * `dragstart`, before claude.ai can touch `dataTransfer`, and because drag data cannot be read
 * before `drop`: `dragover` only cancels the event (allowing the drop) when the target accepts it,
 * so refused drops show the "not allowed" cursor. On `drop`, the drag data wins when readable.
 */
export class FolderDragDrop {
  private readonly window: Window;
  private readonly store: ProjectFoldersStore;
  private readonly now: () => number;
  private readonly sections: () => readonly DropSection[];
  private readonly listsOf: (projectId: ProjectId) => readonly ParentNode[];
  private readonly listeners: Readonly<Record<DragEventType, (event: DragEvent) => void>> = {
    dragstart: (event) => {
      this.start(event);
    },
    dragenter: (event) => {
      this.hover(event);
    },
    dragover: (event) => {
      this.hover(event);
    },
    drop: (event) => {
      this.drop(event);
    },
    dragend: () => {
      this.end();
    },
  };
  private session: DragSession | null = null;
  private over: HTMLElement | null = null;

  /**
   * Starts listening to drag events.
   * @param params.window - The claude.ai window.
   * @param params.store - The displayed folder trees.
   * @param params.now - Reads the current time, in milliseconds.
   * @param params.sections - The mounted folders sections.
   * @param params.listsOf - The native lists next to which a project's sections are mounted.
   */
  constructor(params: {
    window: Window;
    store: ProjectFoldersStore;
    now: () => number;
    sections: () => readonly DropSection[];
    listsOf: (projectId: ProjectId) => readonly ParentNode[];
  }) {
    this.window = params.window;
    this.store = params.store;
    this.now = params.now;
    this.sections = params.sections;
    this.listsOf = params.listsOf;
    for (const type of DRAG_EVENT_TYPES) {
      this.window.addEventListener(type, this.listeners[type], true);
    }
  }

  /** Stops listening and removes every drag feedback. */
  stop(): void {
    for (const type of DRAG_EVENT_TYPES) {
      this.window.removeEventListener(type, this.listeners[type], true);
    }
    this.end();
  }

  private start(event: DragEvent): void {
    const transfer = event.dataTransfer;
    this.end();
    const element = elementOf(event.target);
    if (element === null) {
      return;
    }
    const payload = isOwnUi(element) ? this.ownPayloadOf(element) : this.nativePayloadOf(element);
    if (payload === null) {
      return;
    }
    if (payload.kind !== 'native') {
      event.stopPropagation();
      if (transfer !== null) {
        writeDragPayload({ transfer, payload });
        transfer.effectAllowed = MOVE_EFFECT;
      }
    }
    this.session = { payload, startedAt: this.now() };
    for (const section of this.sections()) {
      section.element.toggleAttribute(DRAGGING_ATTRIBUTE, this.belongs({ payload, section }));
    }
  }

  private hover(event: DragEvent): void {
    const transfer = event.dataTransfer;
    const located = this.locate(event);
    const payload = this.liveSession()?.payload ?? null;
    if (located === null || payload === null || this.operationFor({ payload, located }) === null) {
      this.setOver(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (transfer !== null && payload.kind !== 'native') {
      transfer.dropEffect = MOVE_EFFECT;
    }
    this.setOver(located.target.element);
  }

  private drop(event: DragEvent): void {
    const transfer = event.dataTransfer;
    const located = this.locate(event);
    if (located === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const payload =
      (transfer === null ? null : readDragPayload(transfer)) ?? this.liveSession()?.payload ?? null;
    const operation = payload === null ? null : this.operationFor({ payload, located });
    this.end();
    if (operation !== null) {
      this.store.apply({ projectId: located.projectId, operation });
    }
  }

  private end(): void {
    this.session = null;
    this.setOver(null);
    for (const section of this.sections()) {
      section.element.removeAttribute(DRAGGING_ATTRIBUTE);
    }
  }

  private ownPayloadOf(element: Element): OwnDragPayload | null {
    const source = findDragSource(element);
    const projectId = this.projectOf(element);
    if (source === null || projectId === null) {
      return null;
    }
    return source.kind === 'folder'
      ? { kind: 'folder', projectId, folderId: source.folderId }
      : { kind: 'conversation', projectId, conversationId: source.conversationId };
  }

  private nativePayloadOf(element: Element): DragPayload | null {
    const link = draggedNativeChatLink(element);
    const conversationId = link === null ? null : chatIdOf(link);
    return conversationId === null ? null : { kind: 'native', conversationId };
  }

  private projectOf(element: Element): ProjectId | null {
    const root = element.closest(OWN_UI_SELECTOR);
    return this.sections().find((section) => section.element === root)?.projectId ?? null;
  }

  private belongs(params: { payload: DragPayload; section: DropSection }): boolean {
    const { payload, section } = params;
    if (payload.kind !== 'native') {
      return payload.projectId === section.projectId;
    }
    const state = this.store.find(section.projectId);
    const { conversationId } = payload;
    return (
      (state !== null && getConversation({ state, conversationId }) !== undefined) ||
      listedConversationTitle({ lists: this.listsOf(section.projectId), conversationId }) !== null
    );
  }

  private liveSession(): DragSession | null {
    const { session } = this;
    return session !== null && this.now() - session.startedAt <= DRAG_EXPIRY_MS ? session : null;
  }

  private locate(event: Event): SectionTarget | null {
    const element = elementOf(event.target);
    const target = element === null ? null : findDropTarget(element);
    const projectId = target === null ? null : this.projectOf(target.element);
    return target === null || projectId === null ? null : { target, projectId };
  }

  private operationFor(params: {
    payload: DragPayload;
    located: SectionTarget;
  }): TreeOperation | null {
    const { payload, located } = params;
    const { projectId } = located;
    const state = this.store.find(projectId);
    if (state === null) {
      return null;
    }
    return dropOperation({
      payload,
      destination: { projectId, folderId: located.target.folderId },
      state,
      listedTitleOf: (conversationId) =>
        listedConversationTitle({ lists: this.listsOf(projectId), conversationId }),
      fallbackTitle: i18n.t('conversationUntitled'),
    });
  }

  private setOver(element: HTMLElement | null): void {
    if (this.over === element) {
      return;
    }
    this.over?.classList.remove(OVER_CLASS);
    this.over = element;
    element?.classList.add(OVER_CLASS);
  }
}
