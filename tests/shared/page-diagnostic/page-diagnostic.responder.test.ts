import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';
import { PAGE_DIAGNOSTIC_REQUEST } from '@/shared/page-diagnostic/page-diagnostic.message';
import { answerPageDiagnosticRequests } from '@/shared/page-diagnostic/page-diagnostic.responder';

const DIAGNOSTIC: DomDiagnostic = {
  chatLinks: 3,
  projectLinks: 1,
  expandedSidebarProjects: 1,
  projectRecentsFound: false,
  pageKind: 'chat',
};

describe('answerPageDiagnosticRequests', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('answers a diagnostic request from the extension with the page diagnostic', async () => {
    answerPageDiagnosticRequests(() => DIAGNOSTIC);
    const sendResponse = vi.fn();

    await fakeBrowser.runtime.onMessage.trigger(
      PAGE_DIAGNOSTIC_REQUEST,
      { id: fakeBrowser.runtime.id },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith(DIAGNOSTIC);
  });

  it('ignores other messages and other senders', async () => {
    const diagnose = vi.fn(() => DIAGNOSTIC);
    answerPageDiagnosticRequests(diagnose);
    const sendResponse = vi.fn();

    await fakeBrowser.runtime.onMessage.trigger(
      { type: 'other' },
      { id: fakeBrowser.runtime.id },
      sendResponse,
    );
    await fakeBrowser.runtime.onMessage.trigger(
      PAGE_DIAGNOSTIC_REQUEST,
      { id: 'another-extension' },
      sendResponse,
    );

    expect(diagnose).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('stops answering once stopped', async () => {
    const stop = answerPageDiagnosticRequests(() => DIAGNOSTIC);

    stop();

    expect(fakeBrowser.runtime.onMessage.hasListeners()).toBe(false);
  });
});
