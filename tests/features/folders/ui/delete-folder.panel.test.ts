// @vitest-environment happy-dom

import { stubI18n } from '@@/tests/features/folders/ui/test-doubles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFolderPanel } from '@/features/folders/ui/delete-folder.panel';

function confirmationText(params: { subfolders: number; conversations: number }): string {
  const render = deleteFolderPanel({
    document,
    folderName: 'Specs',
    impact: params,
    onConfirm: vi.fn(),
  });
  const { body } = render({ close: vi.fn() });
  const text = body.find((node) => node instanceof HTMLParagraphElement);
  return text?.textContent ?? '';
}

describe('deleteFolderPanel', () => {
  beforeEach(() => {
    stubI18n();
  });

  it('only asks for confirmation when the folder is empty', () => {
    expect(confirmationText({ subfolders: 0, conversations: 0 })).toBe(
      'deleteFolderConfirm(Specs,0)',
    );
  });

  it('names the sub-folders deleted with the folder', () => {
    expect(confirmationText({ subfolders: 1, conversations: 0 })).toBe(
      'deleteFolderConfirm(Specs,1)',
    );
    expect(confirmationText({ subfolders: 3, conversations: 0 })).toBe(
      'deleteFolderConfirm(Specs,3)',
    );
  });

  it('tells that the conversations go back to the claude.ai lists', () => {
    expect(confirmationText({ subfolders: 0, conversations: 1 })).toBe(
      'deleteFolderConfirm(Specs,0) deleteFolderUnfiledConversations(1)',
    );
    expect(confirmationText({ subfolders: 2, conversations: 5 })).toBe(
      'deleteFolderConfirm(Specs,2) deleteFolderUnfiledConversations(5)',
    );
  });
});
