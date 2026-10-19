import type { ProjectId } from '@/features/folders/domain/folders.repository';

const PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Validates a claude.ai project id. Ids are lowercased, so `ABC…` and `abc…` name one project.
 * @param projectId - A candidate project id.
 * @returns The lowercase UUID, or `null` when the id is not exactly a UUID.
 */
export function normalizeProjectId(projectId: string): ProjectId | null {
  const normalized = projectId.toLowerCase();
  return PROJECT_ID_PATTERN.test(normalized) ? normalized : null;
}
