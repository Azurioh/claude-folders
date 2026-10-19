import { describe, expect, it } from 'vitest';
import { parseBackup } from '@/features/folders/backup/backup-file.parser';

const PROJECT_A = '0b6f6a3e-4c1d-4b8a-9f2e-1a2b3c4d5e6f';
const PROJECT_B = 'f1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a7b';

function project(name: string) {
  return {
    folders: { root: { id: 'root', name, parentId: null, open: true } },
    conversations: { c1: { title: 'T', folderId: 'root' } },
    sectionOpen: { sidebar: true, projectPage: true },
  };
}

function validFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: 'nest-for-claude-backup',
    version: 1,
    exportedAt: '2026-10-19T08:30:00.000Z',
    projects: { [PROJECT_A]: project('A'), [PROJECT_B]: project('B') },
    settings: { hideFiled: false },
    ...overrides,
  };
}

function parse(value: unknown) {
  return parseBackup(JSON.stringify(value));
}

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    expect(parse(validFile())).toEqual({
      ok: true,
      backup: {
        exportedAt: new Date('2026-10-19T08:30:00.000Z'),
        snapshot: {
          projects: { [PROJECT_A]: project('A'), [PROJECT_B]: project('B') },
          hideFiled: false,
        },
      },
    });
  });

  it('lowercases project ids', () => {
    const result = parse(validFile({ projects: { [PROJECT_A.toUpperCase()]: project('A') } }));

    expect(result.ok && Object.keys(result.backup.snapshot.projects)).toEqual([PROJECT_A]);
  });

  it('drops unknown fields', () => {
    const result = parse(
      validFile({ extra: 1, projects: { [PROJECT_A]: { ...project('A'), extra: true } } }),
    );

    expect(result.ok && result.backup.snapshot.projects[PROJECT_A]).toEqual(project('A'));
  });

  const invalid: [string, string, unknown][] = [
    ['not-json', 'text that is not JSON', undefined],
    ['wrong-format', 'an array', []],
    ['wrong-format', 'another format', validFile({ format: 'something-else' })],
    ['wrong-format', 'a missing format', validFile({ format: undefined })],
    ['unsupported-version', 'version 2', validFile({ version: 2 })],
    ['unsupported-version', 'a string version', validFile({ version: '1' })],
    ['invalid-exported-at', 'a non-ISO date', validFile({ exportedAt: 'yesterday' })],
    ['invalid-settings', 'missing settings', validFile({ settings: undefined })],
    ['invalid-settings', 'a non-boolean setting', validFile({ settings: { hideFiled: 'no' } })],
    ['invalid-projects', 'projects as an array', validFile({ projects: [] })],
  ];

  for (const [code, label, value] of invalid) {
    it(`rejects ${label} with ${code}`, () => {
      const text = value === undefined ? '{ not json' : JSON.stringify(value);

      expect(parseBackup(text)).toEqual({ ok: false, error: { code } });
    });
  }

  it('rejects a non-UUID project id with its position', () => {
    expect(
      parse(validFile({ projects: { [PROJECT_A]: project('A'), 'not-a-uuid': project('B') } })),
    ).toEqual({ ok: false, error: { code: 'invalid-project-id', position: 2 } });
  });

  it('rejects two ids that are the same project once lowercased', () => {
    expect(
      parse(
        validFile({
          projects: { [PROJECT_A]: project('A'), [PROJECT_A.toUpperCase()]: project('B') },
        }),
      ),
    ).toEqual({ ok: false, error: { code: 'duplicate-project-id', position: 2 } });
  });

  it('rejects a project with an invalid folder, with its position', () => {
    expect(
      parse(
        validFile({
          projects: {
            [PROJECT_A]: {
              ...project('A'),
              folders: { root: { id: 'root', name: 42, parentId: null, open: true } },
            },
          },
        }),
      ),
    ).toEqual({ ok: false, error: { code: 'invalid-project', position: 1 } });
  });
});
