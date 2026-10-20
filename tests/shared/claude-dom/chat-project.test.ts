// @vitest-environment happy-dom

import { el, fakeId, loadFixture } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import { chatProjectId } from '@/shared/claude-dom/chat-project';

const PROJECT_ID = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const OTHER_PROJECT_ID = 'a1111111-4b5a-4987-8a6b-5c4d3e2f1a0b';

function projectLink(id: string): HTMLElement {
  return el({ tag: 'a', attributes: { href: `/project/${id}` }, children: ['Project'] });
}

describe('chatProjectId', () => {
  it("reads the chat page's project from its header breadcrumb", () => {
    expect(chatProjectId(loadFixture('chat-page'))).toBe(fakeId(9));
  });

  it('gives nothing on a project page, whose project links are all in the sidebar', () => {
    expect(chatProjectId(loadFixture('project-page'))).toBeNull();
  });

  it('ignores the project links of the sidebar', () => {
    const page = el({
      tag: 'div',
      children: [
        el({ tag: 'aside', children: [projectLink(OTHER_PROJECT_ID)] }),
        el({ tag: 'main', children: [el({ tag: 'header', children: [projectLink(PROJECT_ID)] })] }),
      ],
    });

    expect(chatProjectId(page)).toBe(PROJECT_ID);
  });

  it("ignores the extension's own UI", () => {
    const page = el({
      tag: 'main',
      children: [
        el({
          tag: 'div',
          attributes: { class: 'nfc-section' },
          children: [projectLink(PROJECT_ID)],
        }),
      ],
    });

    expect(chatProjectId(el({ tag: 'div', children: [page] }))).toBeNull();
  });

  it('gives nothing for a chat outside any project', () => {
    const page = el({
      tag: 'div',
      children: [el({ tag: 'main', children: [el({ tag: 'header' })] })],
    });

    expect(chatProjectId(page)).toBeNull();
  });
});
