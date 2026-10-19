import { describe, expect, it } from 'vitest';
import { normalizeProjectId } from '@/features/folders/storage/project-id';

const PROJECT = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';

describe('normalizeProjectId', () => {
  it('keeps a lowercase UUID', () => {
    expect(normalizeProjectId(PROJECT)).toBe(PROJECT);
  });

  it('lowercases an uppercase UUID', () => {
    expect(normalizeProjectId(PROJECT.toUpperCase())).toBe(PROJECT);
  });

  it('rejects anything that is not exactly a UUID', () => {
    for (const id of ['', 'abc', '__proto__', `${PROJECT}x`, ` ${PROJECT}`]) {
      expect(normalizeProjectId(id)).toBeNull();
    }
  });
});
