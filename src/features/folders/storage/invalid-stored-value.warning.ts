const LOG_PREFIX = '[nest-for-claude]';

/**
 * Reports a stored value that failed validation. The value itself is not logged.
 * @param key - The storage key holding the invalid value.
 */
export function warnInvalidStoredValue(key: string): void {
  console.warn(`${LOG_PREFIX} Ignoring invalid data stored under "${key}"; it was left untouched.`);
}
