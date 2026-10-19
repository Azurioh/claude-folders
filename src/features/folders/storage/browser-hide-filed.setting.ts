import { storage } from 'wxt/utils/storage';
import { warnInvalidStoredValue } from '@/features/folders/storage/invalid-stored-value.warning';

const HIDE_FILED_KEY = 'local:settings:hideFiled';
const HIDE_FILED_SCHEMA_VERSION = 1;
const HIDE_FILED_DEFAULT = true;

/**
 * Builds the storage item of the setting. A fresh definition per operation lets WXT record the
 * schema version again after `remove` deleted it (a definition records it on its first write only).
 */
function hideFiledItem() {
  return storage.defineItem<boolean>(HIDE_FILED_KEY, {
    version: HIDE_FILED_SCHEMA_VERSION,
    migrations: {},
  });
}

/** Turns a raw stored value into the setting; anything but a boolean yields the default. */
function toHideFiled(raw: unknown): boolean {
  if (raw === null || raw === undefined) {
    return HIDE_FILED_DEFAULT;
  }
  if (typeof raw !== 'boolean') {
    warnInvalidStoredValue(HIDE_FILED_KEY);
    return HIDE_FILED_DEFAULT;
  }
  return raw;
}

/**
 * The "hide filed conversations" display setting, stored in `browser.storage.local` under
 * `settings:hideFiled`. When enabled, conversations filed in a folder are hidden from claude.ai's
 * own lists. Defaults to `true`; reads are validated and never write back.
 */
export class BrowserHideFiledSetting {
  /**
   * Reads the setting.
   * @returns The stored value, or `true` when nothing valid is stored.
   */
  async load(): Promise<boolean> {
    const raw: unknown = await hideFiledItem().getValue();
    return toHideFiled(raw);
  }

  /**
   * Stores the setting.
   * @param hideFiled - Whether filed conversations are hidden from claude.ai's lists.
   */
  async save(hideFiled: boolean): Promise<void> {
    await hideFiledItem().setValue(hideFiled);
  }

  /** Deletes the stored value and its schema metadata; the setting then reads as `true`. */
  async remove(): Promise<void> {
    await hideFiledItem().removeValue({ removeMeta: true });
  }

  /**
   * Listens to changes of the setting, including those made by other tabs.
   * @param listener - Called with the new value on every change.
   * @returns A function that stops the watch.
   */
  watch(listener: (hideFiled: boolean) => void): () => void {
    return hideFiledItem().watch((raw: unknown) => {
      listener(toHideFiled(raw));
    });
  }
}
