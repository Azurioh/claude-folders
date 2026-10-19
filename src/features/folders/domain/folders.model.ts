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
