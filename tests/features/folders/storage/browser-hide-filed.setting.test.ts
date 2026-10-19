import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';

const KEY = 'settings:hideFiled';

describe('BrowserHideFiledSetting', () => {
  const setting = new BrowserHideFiledSetting();

  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to true when nothing is stored', async () => {
    expect(await setting.load()).toBe(true);
  });

  it('persists a saved value', async () => {
    await setting.save(false);

    expect(await setting.load()).toBe(false);
    expect((await fakeBrowser.storage.local.get(KEY))[KEY]).toBe(false);
  });

  it('falls back to true and warns once on a non-boolean value, without overwriting it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await fakeBrowser.storage.local.set({ [KEY]: 'no' });

    expect(await setting.load()).toBe(true);
    expect((await fakeBrowser.storage.local.get(KEY))[KEY]).toBe('no');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('[nest-for-claude]');
  });

  it('notifies a watcher of a change written by another tab, until unsubscribed', async () => {
    const listener = vi.fn();
    const unsubscribe = setting.watch(listener);

    await fakeBrowser.storage.local.set({ [KEY]: false });
    expect(listener).toHaveBeenLastCalledWith(false);

    unsubscribe();
    await fakeBrowser.storage.local.set({ [KEY]: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes the value and its metadata, then reads the default again', async () => {
    await setting.save(false);

    await setting.remove();

    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect(await setting.load()).toBe(true);
  });

  it('records the schema version again when saved after a removal', async () => {
    await setting.save(false);
    await setting.remove();

    await setting.save(true);

    expect(await fakeBrowser.storage.local.get(null)).toEqual({
      [KEY]: true,
      [`${KEY}$`]: { v: 1 },
    });
  });
});
