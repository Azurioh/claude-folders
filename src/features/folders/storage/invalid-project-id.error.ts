/** Thrown when a storage call receives a project id that is not a claude.ai project UUID. */
export class InvalidProjectIdError extends Error {
  readonly code = 'project_invalid_id';

  constructor() {
    super('Project id must be a UUID.');
    this.name = 'InvalidProjectIdError';
  }
}
