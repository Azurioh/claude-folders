import type { WxtBrowser } from 'wxt/browser';

const CLAUDE_HOSTNAME = 'claude.ai';

/** The action's enabled state: per tab with a tab id, global (the default of every tab) without. */
export interface ToolbarActionState {
  enable(tabId?: number): Promise<void>;
  disable(tabId?: number): Promise<void>;
}

/** The browser APIs the action scope needs: the action's state and the tabs' URLs. */
export interface ActionScopeApis {
  action: ToolbarActionState;
  tabs: Pick<WxtBrowser['tabs'], 'query' | 'onUpdated'>;
}

/**
 * Whether a tab URL is a claude.ai page. A tab's URL is only exposed for pages the extension has
 * a host permission on (`https://claude.ai/*`), so `undefined` means "not claude.ai".
 */
export function isClaudeUrl(url: string | undefined): boolean {
  if (url === undefined || !URL.canParse(url)) {
    return false;
  }
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && parsed.hostname === CLAUDE_HOSTNAME;
}

/**
 * Enables or disables the action of one tab from its URL. A tab can close between the event and
 * the call, which rejects; there is nothing left to update then, so the rejection is dropped.
 */
async function applyTabScope(
  action: ToolbarActionState,
  tabId: number,
  url: string | undefined,
): Promise<void> {
  const update = isClaudeUrl(url) ? action.enable(tabId) : action.disable(tabId);
  await update.catch(() => undefined);
}

/**
 * Keeps the toolbar action enabled on claude.ai tabs only, without the `tabs` permission.
 *
 * The listener is registered first, synchronously, so the event that wakes the background up is
 * not missed. Every `tabs.onUpdated` event re-applies the tab's state from its URL, which covers
 * full and in-page navigations whatever the browser does with per-tab state on navigation. On
 * each background start the action is disabled globally (the default for every tab), then the
 * tabs already open are re-applied: after an install, an update or a service worker restart,
 * claude.ai tabs open at that moment are enabled again without a reload.
 */
export async function startToolbarActionScope({ action, tabs }: ActionScopeApis): Promise<void> {
  tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    void applyTabScope(action, tabId, tab.url);
  });
  await action.disable();
  const openTabs = await tabs.query({});
  await Promise.all(
    openTabs.map((tab) =>
      tab.id === undefined ? Promise.resolve() : applyTabScope(action, tab.id, tab.url),
    ),
  );
}
