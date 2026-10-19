import { describe, expect, it } from 'vitest';
import { backupFileName, serializeBackup } from '@/features/folders/backup/backup-file';

const PROJECT = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';

describe('serializeBackup', () => {
  it('writes the versioned backup format', () => {
    const exportedAt = new Date('2026-10-19T08:30:00.000Z');
    const project = {
      folders: {},
      conversations: {},
      sectionOpen: { sidebar: true, projectPage: true },
    };

    expect(
      JSON.parse(
        serializeBackup({
          snapshot: { projects: { [PROJECT]: project }, hideFiled: false },
          exportedAt,
        }),
      ),
    ).toEqual({
      format: 'nest-for-claude-backup',
      version: 1,
      exportedAt: '2026-10-19T08:30:00.000Z',
      projects: { [PROJECT]: project },
      settings: { hideFiled: false },
    });
  });
});

describe('backupFileName', () => {
  it('names the file after the local date, zero-padded', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe(
      'nest-for-claude-backup-2026-01-05.json',
    );
  });
});
