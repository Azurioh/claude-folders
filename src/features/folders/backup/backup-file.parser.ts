/**
 * Validation of an imported backup file. The file comes from outside the extension, so it is
 * parsed as `unknown` and checked part by part; the first wrong part is reported by a code (and,
 * for a project, by its 1-based position in the file), never by echoing the file's content.
 */
import * as z from 'zod/mini';
import { BACKUP_FORMAT, BACKUP_VERSION } from '@/features/folders/backup/backup-file';
import type { ProjectFolders } from '@/features/folders/domain/folders.model';
import type { ProjectId } from '@/features/folders/domain/folders.repository';
import type { FoldersSnapshot } from '@/features/folders/domain/folders-snapshot';
import { normalizeProjectId } from '@/features/folders/storage/project-id';
import { parseStoredProject } from '@/features/folders/storage/stored-project.parser';

/** What is wrong with a rejected backup file. */
export type BackupFileError =
  | { readonly code: 'too-large' }
  | { readonly code: 'unreadable' }
  | { readonly code: 'not-json' }
  | { readonly code: 'wrong-format' }
  | { readonly code: 'unsupported-version' }
  | { readonly code: 'invalid-exported-at' }
  | { readonly code: 'invalid-settings' }
  | { readonly code: 'invalid-projects' }
  | {
      readonly code: 'invalid-project-id' | 'duplicate-project-id' | 'invalid-project';
      readonly position: number;
    };

/** A validated backup, ready to replace the stored data. */
export type ParsedBackup = {
  readonly exportedAt: Date;
  readonly snapshot: FoldersSnapshot;
};

/** Outcome of reading a backup file. */
export type BackupParseResult =
  | { readonly ok: true; readonly backup: ParsedBackup }
  | { readonly ok: false; readonly error: BackupFileError };

type UnknownRecord = Readonly<Record<string, unknown>>;

const recordSchema = z.custom<UnknownRecord>(
  (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
);
const formatSchema = z.object({ format: z.literal(BACKUP_FORMAT) });
const versionSchema = z.object({ version: z.literal(BACKUP_VERSION) });
const exportedAtSchema = z.object({ exportedAt: z.iso.datetime() });
const settingsSchema = z.object({ settings: z.object({ hideFiled: z.boolean() }) });
const projectsSchema = z.object({ projects: recordSchema });

function failure(error: BackupFileError): BackupParseResult {
  return { ok: false, error };
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    const value: unknown = JSON.parse(text);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

type ProjectsResult =
  | { readonly ok: true; readonly projects: Record<ProjectId, ProjectFolders> }
  | { readonly ok: false; readonly error: BackupFileError };

function parseProjects(raw: UnknownRecord): ProjectsResult {
  const entries: [ProjectId, ProjectFolders][] = [];
  const seen = new Set<ProjectId>();
  for (const [index, [rawId, rawProject]] of Object.entries(raw).entries()) {
    const position = index + 1;
    const projectId = normalizeProjectId(rawId);
    if (projectId === null) {
      return { ok: false, error: { code: 'invalid-project-id', position } };
    }
    if (seen.has(projectId)) {
      return { ok: false, error: { code: 'duplicate-project-id', position } };
    }
    const project = parseStoredProject(rawProject);
    if (project === null) {
      return { ok: false, error: { code: 'invalid-project', position } };
    }
    seen.add(projectId);
    entries.push([projectId, project]);
  }
  return { ok: true, projects: Object.fromEntries(entries) };
}

/**
 * Validates the whole text of a backup file. Unknown fields are dropped and project ids
 * lowercased; nothing is written.
 * @param text - The file content.
 * @returns The backup, or the first problem found.
 */
export function parseBackup(text: string): BackupParseResult {
  const json = parseJson(text);
  if (!json.ok) {
    return failure({ code: 'not-json' });
  }
  const file = json.value;
  if (!recordSchema.safeParse(file).success || !formatSchema.safeParse(file).success) {
    return failure({ code: 'wrong-format' });
  }
  if (!versionSchema.safeParse(file).success) {
    return failure({ code: 'unsupported-version' });
  }
  const exportedAt = exportedAtSchema.safeParse(file);
  if (!exportedAt.success) {
    return failure({ code: 'invalid-exported-at' });
  }
  const settings = settingsSchema.safeParse(file);
  if (!settings.success) {
    return failure({ code: 'invalid-settings' });
  }
  const rawProjects = projectsSchema.safeParse(file);
  if (!rawProjects.success) {
    return failure({ code: 'invalid-projects' });
  }
  const projects = parseProjects(rawProjects.data.projects);
  if (!projects.ok) {
    return failure(projects.error);
  }
  return {
    ok: true,
    backup: {
      exportedAt: new Date(exportedAt.data.exportedAt),
      snapshot: { projects: projects.projects, hideFiled: settings.data.settings.hideFiled },
    },
  };
}
