import { describe, expect, it, vi } from 'vitest';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';
import { PAGE_DIAGNOSTIC_REQUEST } from '@/shared/page-diagnostic/page-diagnostic.message';
import {
  type ClaudeTabs,
  requestPageDiagnostic,
} from '@/shared/page-diagnostic/page-diagnostic.requester';

const DIAGNOSTIC: DomDiagnostic = {
  chatLinks: 3,
  projectLinks: 1,
  expandedSidebarProjects: 1,
  projectRecentsFound: true,
  pageKind: 'project',
};

type FakeTab = { id: number; active: boolean };

function fakeTabs(params: {
  tabs: readonly FakeTab[];
  answers: readonly (() => Promise<unknown>)[];
}): ClaudeTabs & { query: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> } {
  const answers = [...params.answers];
  return {
    query: vi.fn(async () => params.tabs),
    sendMessage: vi.fn(async () => {
      const answer = answers.shift();
      if (answer === undefined) {
        throw new Error('No receiver');
      }
      return answer();
    }),
  };
}

describe('requestPageDiagnostic', () => {
  it('returns null when no claude.ai tab is open', async () => {
    const tabs = fakeTabs({ tabs: [], answers: [] });

    expect(await requestPageDiagnostic(tabs)).toBeNull();
    expect(tabs.query).toHaveBeenCalledWith({ url: 'https://claude.ai/*' });
  });

  it('asks the active claude.ai tab first', async () => {
    const tabs = fakeTabs({
      tabs: [
        { id: 1, active: false },
        { id: 2, active: true },
      ],
      answers: [async () => DIAGNOSTIC],
    });

    expect(await requestPageDiagnostic(tabs)).toEqual(DIAGNOSTIC);
    expect(tabs.sendMessage).toHaveBeenCalledTimes(1);
    expect(tabs.sendMessage).toHaveBeenCalledWith(2, PAGE_DIAGNOSTIC_REQUEST);
  });

  it('falls back to the next tab when a tab has no content script or answers garbage', async () => {
    const tabs = fakeTabs({
      tabs: [
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: false },
      ],
      answers: [
        async () => {
          throw new Error('Could not establish connection');
        },
        async () => ({ chatLinks: 'many' }),
        async () => DIAGNOSTIC,
      ],
    });

    expect(await requestPageDiagnostic(tabs)).toEqual(DIAGNOSTIC);
    expect(tabs.sendMessage).toHaveBeenCalledTimes(3);
  });

  it('returns null when no tab answers', async () => {
    const tabs = fakeTabs({ tabs: [{ id: 1, active: true }], answers: [] });

    expect(await requestPageDiagnostic(tabs)).toBeNull();
  });

  it('keeps only the counted fields of the answer', async () => {
    const tabs = fakeTabs({
      tabs: [{ id: 1, active: true }],
      answers: [async () => ({ ...DIAGNOSTIC, title: 'Secret conversation' })],
    });

    expect(await requestPageDiagnostic(tabs)).toEqual(DIAGNOSTIC);
  });
});
