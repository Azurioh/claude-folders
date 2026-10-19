import { describe, expect, it } from 'vitest';
import { RandomUuidFolderIdProvider } from '@/features/folders/ids/random-uuid-folder-id.provider';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAMPLE_SIZE = 50;

describe('RandomUuidFolderIdProvider', () => {
  it('generates random v4 UUIDs', () => {
    const provider = new RandomUuidFolderIdProvider();

    expect(provider.nextId()).toMatch(UUID_V4);
  });

  it('never repeats an id', () => {
    const provider = new RandomUuidFolderIdProvider();
    const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => provider.nextId()));

    expect(ids.size).toBe(SAMPLE_SIZE);
  });
});
