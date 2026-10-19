import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';
import {
  PAGE_DIAGNOSTIC_REQUEST,
  parsePageDiagnostic,
} from '@/shared/page-diagnostic/page-diagnostic.message';

/**
 * Tabs the content script runs in. Querying by URL needs no `tabs` permission: the host
 * permission on claude.ai is enough.
 */
const CLAUDE_TABS_PATTERN = 'https://claude.ai/*';

/** The part of `browser.tabs` the request needs. */
export type ClaudeTabs = {
  query(queryInfo: {
    url: string;
  }): Promise<readonly { id?: number | undefined; active: boolean }[]>;
  sendMessage(tabId: number, message: typeof PAGE_DIAGNOSTIC_REQUEST): Promise<unknown>;
};

async function askTab(params: { tabs: ClaudeTabs; tabId: number }): Promise<DomDiagnostic | null> {
  try {
    return parsePageDiagnostic(
      await params.tabs.sendMessage(params.tabId, PAGE_DIAGNOSTIC_REQUEST),
    );
  } catch {
    return null;
  }
}

/**
 * Asks an open claude.ai tab for its page diagnostic, from an extension page. The active tab is
 * asked first; a tab without the content script (opened before the extension was installed or
 * reloaded) or with an invalid answer is skipped.
 * @param tabs - `browser.tabs`.
 * @returns The first valid diagnostic, or `null` when no claude.ai tab answered.
 */
export async function requestPageDiagnostic(tabs: ClaudeTabs): Promise<DomDiagnostic | null> {
  const found = await tabs.query({ url: CLAUDE_TABS_PATTERN });
  const tabIds = [...found]
    .sort((a, b) => Number(b.active) - Number(a.active))
    .map((tab) => tab.id)
    .filter((tabId) => tabId !== undefined);
  let diagnostic: DomDiagnostic | null = null;
  for (let index = 0; diagnostic === null && index < tabIds.length; index += 1) {
    const tabId = tabIds[index];
    if (tabId !== undefined) {
      diagnostic = await askTab({ tabs, tabId });
    }
  }
  return diagnostic;
}
