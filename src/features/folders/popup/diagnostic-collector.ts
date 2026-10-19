import { countSnapshot } from '@/features/folders/domain/folders-snapshot';
import type { FoldersSnapshotStore } from '@/features/folders/domain/folders-snapshot.store';
import { browserLabel } from '@/features/folders/popup/browser-label';
import { diagnosticReport } from '@/features/folders/popup/diagnostic-report';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';

/**
 * Gathers everything the diagnostic report holds: stored counts and setting, the page
 * diagnostic of an open claude.ai tab, the versions.
 * @param params.store - Whole-storage access.
 * @param params.pageDiagnostic - Asks an open claude.ai tab for its page diagnostic.
 * @param params.extensionVersion - The manifest version.
 * @param params.userAgent - `navigator.userAgent`, reduced to the browser name and major version.
 * @returns The report text.
 */
export async function collectDiagnostic(params: {
  store: FoldersSnapshotStore;
  pageDiagnostic: () => Promise<DomDiagnostic | null>;
  extensionVersion: string;
  userAgent: string;
}): Promise<string> {
  const [snapshot, page] = await Promise.all([params.store.read(), params.pageDiagnostic()]);
  return diagnosticReport({
    extensionVersion: params.extensionVersion,
    browser: browserLabel(params.userAgent),
    counts: countSnapshot(snapshot),
    hideFiled: snapshot.hideFiled,
    page,
  });
}
