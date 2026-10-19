/**
 * Browsers told apart by their user agent token, most specific first: Edge and Opera also carry
 * the `Chrome/` token.
 */
const BROWSER_TOKENS: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: 'Firefox', pattern: /\bFirefox\/(\d+)/ },
  { name: 'Edge', pattern: /\bEdg\/(\d+)/ },
  { name: 'Opera', pattern: /\bOPR\/(\d+)/ },
  { name: 'Chrome', pattern: /\bChrome\/(\d+)/ },
];

const UNKNOWN_BROWSER = 'Unknown browser';

/**
 * Names the browser for a bug report: its name and major version only, nothing else from the
 * user agent (no OS, no full version), to avoid fingerprinting details.
 * @param userAgent - `navigator.userAgent`.
 * @returns e.g. `Firefox 131`, or `Unknown browser`.
 */
export function browserLabel(userAgent: string): string {
  const match = BROWSER_TOKENS.map(({ name, pattern }) => ({
    name,
    version: pattern.exec(userAgent)?.[1],
  })).find(({ version }) => version !== undefined);
  return match === undefined ? UNKNOWN_BROWSER : `${match.name} ${match.version}`;
}
