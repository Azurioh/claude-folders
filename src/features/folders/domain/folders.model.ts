export type FolderId = string;
export type ConversationId = string;

export type Folder = {
  readonly id: FolderId;
  readonly name: string;
  readonly parentId: FolderId | null;
  readonly open: boolean;
  readonly emoji?: string;
  readonly color?: string;
};

export type FiledConversation = {
  readonly title: string;
  readonly folderId: FolderId;
};

export type Section = 'sidebar' | 'projectPage';

/** Folder tree of one claude.ai project. */
export type ProjectFolders = {
  readonly folders: Readonly<Record<FolderId, Folder>>;
  readonly conversations: Readonly<Record<ConversationId, FiledConversation>>;
  readonly sectionOpen: Readonly<Record<Section, boolean>>;
};

/**
 * Builds the state of a project that has no folder yet.
 * @returns A project with no folders, no filed conversations and both sections open.
 */
export function emptyProject(): ProjectFolders {
  return {
    folders: {},
    conversations: {},
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

/**
 * Looks up a folder by id. Only own entries count, so ids such as `toString` or `__proto__` never
 * resolve to inherited `Object.prototype` members.
 * @param params.state - The project to inspect.
 * @param params.folderId - The folder to find.
 * @returns The folder, or `undefined` when the project has no such folder.
 */
export function getFolder(params: {
  state: ProjectFolders;
  folderId: FolderId;
}): Folder | undefined {
  const { state, folderId } = params;
  return Object.hasOwn(state.folders, folderId) ? state.folders[folderId] : undefined;
}

/**
 * Looks up a filed conversation by id. Only own entries count, so ids such as `toString` or
 * `__proto__` never resolve to inherited `Object.prototype` members.
 * @param params.state - The project to inspect.
 * @param params.conversationId - The conversation to find.
 * @returns The conversation, or `undefined` when it is not filed in the project.
 */
export function getConversation(params: {
  state: ProjectFolders;
  conversationId: ConversationId;
}): FiledConversation | undefined {
  const { state, conversationId } = params;
  return Object.hasOwn(state.conversations, conversationId)
    ? state.conversations[conversationId]
    : undefined;
}
