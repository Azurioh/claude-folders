import type { SnapshotCounts } from '@/features/folders/domain/folders-snapshot';
import type { DomDiagnostic, PageKind } from '@/shared/claude-dom/diagnostic';

/**
 * The report is pasted into GitHub issues read by the maintainers, so it is always in English,
 * whatever the interface language.
 */
const PAGE_KIND_LABELS: Readonly<Record<PageKind, string>> = {
  project: 'project page',
  chat: 'conversation',
  other: 'other page',
};
const NO_TAB_LINE =
  'claude.ai tab: none found (open claude.ai, reload it, then refresh this diagnostic)';
const PAGE_DETAIL_INDENT = '  ';

function onOff(value: boolean): string {
  return value ? 'on' : 'off';
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function pageLines(page: DomDiagnostic | null): string[] {
  if (page === null) {
    return [NO_TAB_LINE];
  }
  return [
    `claude.ai tab: ${PAGE_KIND_LABELS[page.pageKind]}`,
    ...[
      `Conversation links: ${page.chatLinks}`,
      `Project links: ${page.projectLinks}`,
      `Expanded sidebar projects: ${page.expandedSidebarProjects}`,
      `Project page Recents found: ${yesNo(page.projectRecentsFound)}`,
    ].map((line) => `${PAGE_DETAIL_INDENT}${line}`),
  ];
}

/**
 * Builds the diagnostic text users paste into bug reports. It holds counts, flags and versions
 * only: no project or conversation id, no title, no folder name.
 * @param params.extensionVersion - The manifest version.
 * @param params.browser - The browser name and major version.
 * @param params.counts - What is stored.
 * @param params.hideFiled - The display setting.
 * @param params.page - The diagnostic of an open claude.ai tab, or `null` when none answered.
 * @returns One fact per line.
 */
export function diagnosticReport(params: {
  extensionVersion: string;
  browser: string;
  counts: SnapshotCounts;
  hideFiled: boolean;
  page: DomDiagnostic | null;
}): string {
  const { counts } = params;
  return [
    `Nest for Claude ${params.extensionVersion}`,
    `Browser: ${params.browser}`,
    `Stored: ${counts.projects} projects, ${counts.folders} folders, ${counts.conversations} filed conversations`,
    `Hide filed conversations: ${onOff(params.hideFiled)}`,
    ...pageLines(params.page),
  ].join('\n');
}
