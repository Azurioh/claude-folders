import { browser } from 'wxt/browser';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';
import { isPageDiagnosticRequest } from '@/shared/page-diagnostic/page-diagnostic.message';

/**
 * Answers the page diagnostic requests of this extension's pages (the options page), from the
 * content script of a claude.ai tab. Messages from anything else are ignored.
 * @param diagnose - Computes the diagnostic of the current page, on each request.
 * @returns A function that stops answering.
 */
export function answerPageDiagnosticRequests(diagnose: () => DomDiagnostic): () => void {
  const listener = (
    message: unknown,
    sender: { id?: string },
    sendResponse: (response: DomDiagnostic) => void,
  ): false => {
    if (sender.id === browser.runtime.id && isPageDiagnosticRequest(message)) {
      sendResponse(diagnose());
    }
    return false;
  };
  browser.runtime.onMessage.addListener(listener);
  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}
