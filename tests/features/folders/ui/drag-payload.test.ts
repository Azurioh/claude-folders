// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { readDragPayload, writeDragPayload } from '@/features/folders/ui/drag-payload';

const PROJECT = '00000000-0000-4000-8000-000000000009';
const CHAT = '00000000-0000-4000-8000-00000000000c';

describe('drag payloads', () => {
  it('round-trips a folder of ours', () => {
    const transfer = new DataTransfer();
    writeDragPayload({
      transfer,
      payload: { kind: 'folder', projectId: PROJECT, folderId: 'a|b' },
    });
    expect(readDragPayload(transfer)).toEqual({
      kind: 'folder',
      projectId: PROJECT,
      folderId: 'a|b',
    });
  });

  it('round-trips a conversation of ours, even when the browser added its URL', () => {
    const transfer = new DataTransfer();
    transfer.setData('text/uri-list', `https://claude.ai/chat/${CHAT}`);
    writeDragPayload({
      transfer,
      payload: { kind: 'conversation', projectId: PROJECT, conversationId: CHAT },
    });
    expect(readDragPayload(transfer)).toEqual({
      kind: 'conversation',
      projectId: PROJECT,
      conversationId: CHAT,
    });
  });

  it('reads a native conversation from its URL, as a URI list or as text', () => {
    const uriList = new DataTransfer();
    uriList.setData('text/uri-list', `# comment\nhttps://claude.ai/chat/${CHAT}`);
    const text = new DataTransfer();
    text.setData('text/plain', `https://claude.ai/chat/${CHAT}`);
    expect(readDragPayload(uriList)).toEqual({ kind: 'native', conversationId: CHAT });
    expect(readDragPayload(text)).toEqual({ kind: 'native', conversationId: CHAT });
  });

  it('is null for unrelated or malformed data', () => {
    const empty = new DataTransfer();
    const title = new DataTransfer();
    title.setData('text/plain', 'Just a title');
    const malformed = new DataTransfer();
    malformed.setData('application/x-nfc-folder', 'project=&id=x');
    expect(readDragPayload(empty)).toBeNull();
    expect(readDragPayload(title)).toBeNull();
    expect(readDragPayload(malformed)).toBeNull();
  });
});
