import { describe, expect, it } from 'vitest';
import { diagnosticReport } from '@/features/folders/popup/diagnostic-report';

const BASE = {
  extensionVersion: '0.1.0',
  browser: 'Firefox 131',
  counts: { projects: 2, folders: 5, conversations: 9 },
  hideFiled: true,
};

describe('diagnosticReport', () => {
  it('describes the extension, the storage and the claude.ai page', () => {
    expect(
      diagnosticReport({
        ...BASE,
        page: {
          chatLinks: 33,
          projectLinks: 9,
          expandedSidebarProjects: 1,
          projectRecentsFound: true,
          pageKind: 'project',
        },
      }),
    ).toBe(
      [
        'Nest for Claude 0.1.0',
        'Browser: Firefox 131',
        'Stored: 2 projects, 5 folders, 9 filed conversations',
        'Hide filed conversations: on',
        'claude.ai tab: project page',
        '  Conversation links: 33',
        '  Project links: 9',
        '  Expanded sidebar projects: 1',
        '  Project page Recents found: yes',
      ].join('\n'),
    );
  });

  it('says when no claude.ai tab answered', () => {
    expect(diagnosticReport({ ...BASE, hideFiled: false, page: null })).toBe(
      [
        'Nest for Claude 0.1.0',
        'Browser: Firefox 131',
        'Stored: 2 projects, 5 folders, 9 filed conversations',
        'Hide filed conversations: off',
        'claude.ai tab: none found (open claude.ai, reload it, then refresh this diagnostic)',
      ].join('\n'),
    );
  });

  it('names chat and other pages', () => {
    const page = {
      chatLinks: 0,
      projectLinks: 0,
      expandedSidebarProjects: 0,
      projectRecentsFound: false,
    };

    expect(diagnosticReport({ ...BASE, page: { ...page, pageKind: 'chat' } })).toContain(
      'claude.ai tab: conversation',
    );
    expect(diagnosticReport({ ...BASE, page: { ...page, pageKind: 'other' } })).toContain(
      'claude.ai tab: other page',
    );
  });
});
