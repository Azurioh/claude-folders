import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { isClaudeUrl, startToolbarActionScope } from '@/features/toolbar-action/action-scope';

function fakeAction() {
  return {
    enable: vi.fn<(tabId?: number) => Promise<void>>(async () => undefined),
    disable: vi.fn<(tabId?: number) => Promise<void>>(async () => undefined),
  };
}

/** Opens a fake tab (without a URL when none is given) and returns its id. */
async function openTab(url?: string): Promise<number> {
  const tab = await fakeBrowser.tabs.create(url === undefined ? {} : { url });
  if (tab.id === undefined) {
    throw new Error('The fake browser created a tab without an id');
  }
  return tab.id;
}

describe('isClaudeUrl', () => {
  it.each([
    'https://claude.ai/',
    'https://claude.ai/new',
    'https://claude.ai/project/0f8e2c1a-1b2c-4d5e-8f90-a1b2c3d4e5f6',
  ])('accepts %s', (url) => {
    expect(isClaudeUrl(url)).toBe(true);
  });

  it.each([
    'http://claude.ai/new',
    'https://www.claude.ai/new',
    'https://claude.ai.example.com/',
    'https://example.com/?next=https://claude.ai/',
    'chrome://newtab/',
    'about:blank',
    'not a url',
    '',
  ])('rejects %s', (url) => {
    expect(isClaudeUrl(url)).toBe(false);
  });

  it('rejects a tab whose url is hidden from the extension', () => {
    expect(isClaudeUrl(undefined)).toBe(false);
  });
});

describe('startToolbarActionScope', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('disables the action globally on start', async () => {
    const action = fakeAction();

    await startToolbarActionScope({ action, tabs: fakeBrowser.tabs });

    expect(action.disable).toHaveBeenCalledWith();
  });

  it('enables the claude.ai tabs already open and disables the others on start', async () => {
    const claude = await openTab('https://claude.ai/new');
    const other = await openTab('https://example.com/');
    const hidden = await openTab();
    const action = fakeAction();

    await startToolbarActionScope({ action, tabs: fakeBrowser.tabs });

    expect(action.enable.mock.calls).toEqual([[claude]]);
    expect(action.disable.mock.calls).toEqual(expect.arrayContaining([[], [other], [hidden]]));
    expect(action.disable).not.toHaveBeenCalledWith(claude);
  });

  it('enables a tab that navigates to claude.ai and disables it once it leaves', async () => {
    const tab = await openTab('https://example.com/');
    const action = fakeAction();
    await startToolbarActionScope({ action, tabs: fakeBrowser.tabs });
    action.enable.mockClear();
    action.disable.mockClear();

    await fakeBrowser.tabs.update(tab, { url: 'https://claude.ai/new' });
    expect(action.enable.mock.calls).toEqual([[tab]]);
    expect(action.disable).not.toHaveBeenCalled();

    await fakeBrowser.tabs.update(tab, { url: 'https://example.com/' });
    expect(action.disable.mock.calls).toEqual([[tab]]);
  });

  it('disables a tab whose url the extension cannot see', async () => {
    const tabId = await openTab('https://claude.ai/new');
    const tab = await fakeBrowser.tabs.get(tabId);
    const action = fakeAction();
    await startToolbarActionScope({ action, tabs: fakeBrowser.tabs });
    action.disable.mockClear();

    await fakeBrowser.tabs.onUpdated.trigger(
      tabId,
      { status: 'loading' },
      { ...tab, url: undefined },
    );

    expect(action.disable.mock.calls).toEqual([[tabId]]);
  });

  it('ignores a tab closed before its action could be updated', async () => {
    await openTab('https://claude.ai/new');
    const action = fakeAction();
    action.enable.mockRejectedValue(new Error('No tab with id'));

    await expect(startToolbarActionScope({ action, tabs: fakeBrowser.tabs })).resolves.toBe(
      undefined,
    );
  });
});
