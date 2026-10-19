import { describe, expect, it, vi } from 'vitest';
import { BACKUP_MAX_BYTES, serializeBackup } from '@/features/folders/backup/backup-file';
import { readBackupFile } from '@/features/folders/backup/backup-file.reader';

describe('readBackupFile', () => {
  it('parses the text of a file within the size limit', async () => {
    const text = serializeBackup({
      snapshot: { projects: {}, hideFiled: true },
      exportedAt: new Date('2026-10-19T08:30:00.000Z'),
    });

    expect(await readBackupFile({ size: text.length, text: async () => text })).toEqual({
      ok: true,
      backup: {
        exportedAt: new Date('2026-10-19T08:30:00.000Z'),
        snapshot: { projects: {}, hideFiled: true },
      },
    });
  });

  it('rejects a file over the size limit without reading it', async () => {
    const text = vi.fn(async () => '');

    expect(await readBackupFile({ size: BACKUP_MAX_BYTES + 1, text })).toEqual({
      ok: false,
      error: { code: 'too-large' },
    });
    expect(text).not.toHaveBeenCalled();
  });

  it('reports a file that cannot be read as unreadable', async () => {
    expect(
      await readBackupFile({
        size: 1,
        text: async () => {
          throw new Error('read failed');
        },
      }),
    ).toEqual({ ok: false, error: { code: 'unreadable' } });
  });
});
