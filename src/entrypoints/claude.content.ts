import '@/features/folders/ui/folders.css';
import { createShadowRootUi, defineContentScript } from '#imports';
import { RandomUuidFolderIdProvider } from '@/features/folders/ids/random-uuid-folder-id.provider';
import { BrowserFoldersRepository } from '@/features/folders/storage/browser-folders.repository';
import { BrowserHideFiledSetting } from '@/features/folders/storage/browser-hide-filed.setting';
import panelCss from '@/features/folders/ui/floating-panel.css?inline';
import { startFoldersUi } from '@/features/folders/ui/folders-ui.controller';
import { diagnose } from '@/shared/claude-dom/diagnostic';
import { answerPageDiagnosticRequests } from '@/shared/page-diagnostic/page-diagnostic.responder';

/** Tag of the element hosting the shadow root the floating panels render in. */
const PANEL_LAYER_NAME = 'nfc-panels';

/**
 * Content script registered on claude.ai pages: the composition root of the folders UI.
 *
 * It wires the browser storage adapters and the folder id provider into the UI, mounts the
 * shadow root hosting the floating panels (WXT's `createShadowRootUi`, with the panel styles
 * injected inside it and keyboard events kept from reaching claude.ai), re-syncs the UI on
 * claude.ai's client-side navigation (`wxt:locationchange`), answers the options page's
 * diagnostic requests with what the detection sees (counts only) and removes everything it added once
 * the extension context is invalidated (update, reload or uninstall).
 */
export default defineContentScript({
  matches: ['https://claude.ai/*'],
  async main(ctx) {
    const panelLayer = await createShadowRootUi(ctx, {
      name: PANEL_LAYER_NAME,
      position: 'inline',
      anchor: 'body',
      append: 'last',
      css: panelCss,
      isolateEvents: true,
      onMount: (container) => container,
    });
    panelLayer.mount();
    const ui = startFoldersUi({
      document,
      pathname: () => location.pathname,
      repository: new BrowserFoldersRepository(),
      hideFiled: new BrowserHideFiledSetting(),
      panelLayer: panelLayer.uiContainer,
      folderIds: new RandomUuidFolderIdProvider(),
      now: () => Date.now(),
    });
    const stopDiagnostic = answerPageDiagnosticRequests(() =>
      diagnose({ root: document, pathname: location.pathname }),
    );
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      ui.sync();
    });
    ctx.onInvalidated(() => {
      stopDiagnostic();
      ui.stop();
    });
  },
});
