import { browser, defineBackground } from '#imports';
import { startToolbarActionScope } from '@/features/toolbar-action/action-scope';

/**
 * Background entrypoint (service worker in Chrome, event page in Firefox): the composition root
 * of the toolbar action scope, which keeps the action enabled on claude.ai tabs only.
 */
export default defineBackground(() => {
  void startToolbarActionScope({ action: browser.action, tabs: browser.tabs });
});
