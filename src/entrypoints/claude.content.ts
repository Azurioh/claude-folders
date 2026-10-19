import { defineContentScript } from '#imports';

/**
 * Content script registered on claude.ai pages.
 *
 * It declares the extension's only match pattern; it does not modify the page.
 */
export default defineContentScript({
  matches: ['https://claude.ai/*'],
  main() {},
});
