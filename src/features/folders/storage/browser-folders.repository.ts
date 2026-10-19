import { storage } from 'wxt/utils/storage';
import { emptyProject, type ProjectFolders } from '@/features/folders/domain/folders.model';
import type {
  FoldersRepository,
  ProjectFoldersListener,
  ProjectId,
  Unsubscribe,
} from '@/features/folders/domain/folders.repository';
import { InvalidProjectIdError } from '@/features/folders/storage/invalid-project-id.error';
import { warnInvalidStoredValue } from '@/features/folders/storage/invalid-stored-value.warning';
import { normalizeProjectId } from '@/features/folders/storage/project-id';
import { parseStoredProject } from '@/features/folders/storage/stored-project.parser';

const STORAGE_AREA = 'local';
const PROJECT_KEY = 'projects:';
const PROJECT_KEY_PREFIX = `${STORAGE_AREA}:${PROJECT_KEY}`;
const PROJECT_SCHEMA_VERSION = 1;

/**
 * Builds the storage item of one project. Each project has its own key, so tabs writing different
 * projects never overwrite each other. The id is lowercased first, so an uppercase UUID shares
 * the key of its lowercase form. Schema changes bump the version and add a migration here.
 */
function projectItem(projectId: ProjectId) {
  const normalizedId = normalizeProjectId(projectId);
  if (normalizedId === null) {
    throw new InvalidProjectIdError();
  }
  return storage.defineItem<ProjectFolders>(`${PROJECT_KEY_PREFIX}${normalizedId}`, {
    version: PROJECT_SCHEMA_VERSION,
    migrations: {},
  });
}

/** Turns a raw stored value into a folder tree; invalid data yields an empty project. */
function toProjectFolders(params: { key: string; raw: unknown }): ProjectFolders {
  if (params.raw === null || params.raw === undefined) {
    return emptyProject();
  }
  const parsed = parseStoredProject(params.raw);
  if (parsed === null) {
    warnInvalidStoredValue(params.key);
    return emptyProject();
  }
  return parsed;
}

/**
 * {@link FoldersRepository} over `browser.storage.local`, one versioned key per project
 * (`projects:<projectId>`). Reads are always validated and never write back.
 */
export class BrowserFoldersRepository implements FoldersRepository {
  /**
   * @inheritDoc
   * @throws {InvalidProjectIdError} When `projectId` is not a UUID (as a rejection).
   */
  async load(projectId: ProjectId): Promise<ProjectFolders> {
    const item = projectItem(projectId);
    const raw: unknown = await item.getValue();
    return toProjectFolders({ key: item.key, raw });
  }

  /**
   * @inheritDoc
   * @throws {InvalidProjectIdError} When `projectId` is not a UUID (as a rejection).
   */
  async save(params: { projectId: ProjectId; state: ProjectFolders }): Promise<void> {
    await projectItem(params.projectId).setValue(params.state);
  }

  /**
   * @inheritDoc
   * @throws {InvalidProjectIdError} When `projectId` is not a UUID.
   */
  watch(params: { projectId: ProjectId; listener: ProjectFoldersListener }): Unsubscribe {
    const item = projectItem(params.projectId);
    return item.watch((raw: unknown) => {
      params.listener(toProjectFolders({ key: item.key, raw }));
    });
  }

  /**
   * Lists the projects that have a stored folder tree, valid or not.
   * @returns The ids of the stored projects. Keys this repository never writes (not a lowercase
   * UUID, metadata) are skipped.
   */
  async listProjectIds(): Promise<ProjectId[]> {
    const stored = await storage.snapshot(STORAGE_AREA);
    return Object.keys(stored)
      .filter((key) => key.startsWith(PROJECT_KEY))
      .map((key) => key.slice(PROJECT_KEY.length))
      .filter((projectId) => normalizeProjectId(projectId) === projectId);
  }

  /**
   * Deletes the stored folder tree of a project and its schema metadata.
   * @param projectId - The project to delete.
   * @throws {InvalidProjectIdError} When `projectId` is not a UUID (as a rejection).
   */
  async remove(projectId: ProjectId): Promise<void> {
    await projectItem(projectId).removeValue({ removeMeta: true });
  }
}
