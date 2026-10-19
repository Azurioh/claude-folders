import { nativeChatLinks, nativeProjectLinks } from '@/shared/claude-dom/native-links';
import { findProjectRecents } from '@/shared/claude-dom/project-recents';
import { findSidebarProjectGroups } from '@/shared/claude-dom/sidebar-project-groups';

/** What the claude.ai detection sees on a page, for bug reports. */
export interface DomDiagnostic {
  /** Native conversation links. */
  readonly chatLinks: number;
  /** Native project links. */
  readonly projectLinks: number;
  /** Expanded projects found in the sidebar. */
  readonly expandedSidebarProjects: number;
  /** Whether the project page's "Recents" block was found. */
  readonly projectRecentsFound: boolean;
}

/**
 * Runs every detection on a page and counts what it finds.
 * @param params.root - The document.
 * @param params.pathname - `location.pathname` of the page.
 * @returns The counts.
 */
export function diagnose(params: { root: ParentNode; pathname: string }): DomDiagnostic {
  const { root, pathname } = params;
  const recents = findProjectRecents({ root, pathname });
  const groups =
    recents === null
      ? findSidebarProjectGroups({ root })
      : findSidebarProjectGroups({ root, exclude: recents.list });
  return {
    chatLinks: nativeChatLinks(root).length,
    projectLinks: nativeProjectLinks(root).length,
    expandedSidebarProjects: groups.length,
    projectRecentsFound: recents !== null,
  };
}
