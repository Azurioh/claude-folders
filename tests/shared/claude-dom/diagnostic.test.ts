// @vitest-environment happy-dom

import { el, fakeId, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { diagnose } from '@/shared/claude-dom/diagnostic';

describe('diagnose', () => {
  it('counts what the project page exposes', () => {
    expect(
      diagnose({ root: loadFixture('project-page'), pathname: `/project/${fakeId(9)}` }),
    ).toEqual({
      chatLinks: 33,
      projectLinks: 9,
      expandedSidebarProjects: 1,
      projectRecentsFound: true,
    });
  });

  it('counts what the chat page exposes', () => {
    expect(diagnose({ root: loadFixture('chat-page'), pathname: `/chat/${fakeId(0x0a)}` })).toEqual(
      {
        chatLinks: 23,
        projectLinks: 10,
        expandedSidebarProjects: 1,
        projectRecentsFound: false,
      },
    );
  });

  it('reports a project page Recents block', () => {
    const projectId = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
    const main = el({
      tag: 'main',
      children: [
        el({ tag: 'h2', children: ['Recents'] }),
        el({ tag: 'a', attributes: { href: '/chat/a1111111-4b5a-4987-8a6b-5c4d3e2f1a0b' } }),
      ],
    });
    const container = el({ tag: 'div', children: [main] });
    expect(diagnose({ root: container, pathname: `/project/${projectId}` })).toEqual({
      chatLinks: 1,
      projectLinks: 0,
      expandedSidebarProjects: 0,
      projectRecentsFound: true,
    });
  });
});
