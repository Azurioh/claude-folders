import { projectIdOf } from '@/shared/claude-dom/claude-ids';
import { isOwnUi, nativeProjectLinks } from '@/shared/claude-dom/native-links';
import {
  SIDEBAR_PROJECT_GROUP_SELECTOR,
  SIDEBAR_PROJECT_LIST_SELECTOR,
} from '@/shared/claude-dom/selectors';

/** An expanded project of the sidebar and the list of its conversations. */
export interface SidebarProjectGroup {
  /** Lowercase id of the project. */
  readonly projectId: string;
  /** The list holding the project's conversation rows. */
  readonly list: HTMLElement;
}

function overlaps(params: { list: Node; exclude: Node | undefined }): boolean {
  const { list, exclude } = params;
  return exclude !== undefined && (list.contains(exclude) || exclude.contains(list));
}

function groupOf(params: {
  group: Element;
  exclude: Node | undefined;
}): SidebarProjectGroup | null {
  const { group, exclude } = params;
  const [projectLink] = nativeProjectLinks(group);
  const projectId = projectLink === undefined ? null : projectIdOf(projectLink);
  const list = group.querySelector<HTMLElement>(SIDEBAR_PROJECT_LIST_SELECTOR);
  if (projectId === null || list === null || overlaps({ list, exclude })) {
    return null;
  }
  return { projectId, list };
}

/**
 * Lists the expanded projects of the sidebar. Each project is a `SIDEBAR_PROJECT_GROUP_SELECTOR`
 * block holding its project link; it is expanded when it also holds its nested conversation list
 * (`SIDEBAR_PROJECT_LIST_SELECTOR`). Collapsed projects have no such list and are skipped.
 * @param params.root - The document (or a subtree containing the sidebar).
 * @param params.exclude - A node to keep away from, e.g. the project page's Recents list: a group
 *   whose list contains it or sits inside it is skipped.
 * @returns The expanded groups, in document order.
 */
export function findSidebarProjectGroups(params: {
  root: ParentNode;
  exclude?: Node;
}): SidebarProjectGroup[] {
  const { root, exclude } = params;
  const groups: SidebarProjectGroup[] = [];
  for (const group of root.querySelectorAll(SIDEBAR_PROJECT_GROUP_SELECTOR)) {
    const found = isOwnUi(group) ? null : groupOf({ group, exclude });
    if (found !== null) {
      groups.push(found);
    }
  }
  return groups;
}
