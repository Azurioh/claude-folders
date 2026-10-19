import '@/features/folders/ui/folders.css';
import { defineContentScript } from '#imports';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';
import { startFoldersUi } from '@/features/folders/ui/folders-ui.controller';

/**
 * Content script registered on claude.ai pages: the composition root of the folders UI.
 *
 * It wires the browser storage adapters into the UI, re-syncs it on claude.ai's client-side
 * navigation (`wxt:locationchange`) and removes everything it added once the extension context is
 * invalidated (update, reload or uninstall).
 */
export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main(ctx) {
    const ui = startFoldersUi({
      document,
      pathname: () => location.pathname,
      repository: new BrowserFoldersRepository(),
      hideFiled: new BrowserHideFiledSetting(),
    });
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      ui.sync();
    });
    ctx.onInvalidated(() => {
      ui.stop();
    });
  },
});
