/**
 * Message asking the content script of a claude.ai tab for its page diagnostic, and validation
 * of the answer. The answer crosses a context boundary, so it is parsed like outside data and
 * only its counted fields are kept.
 */
import * as z from 'zod/mini';
import type { DomDiagnostic } from '@/shared/claude-dom/diagnostic';

const PAGE_DIAGNOSTIC_MESSAGE_TYPE = 'nfc:page-diagnostic';

/** The request sent to a claude.ai tab. */
export const PAGE_DIAGNOSTIC_REQUEST = { type: PAGE_DIAGNOSTIC_MESSAGE_TYPE } as const;

const requestSchema = z.object({ type: z.literal(PAGE_DIAGNOSTIC_MESSAGE_TYPE) });

const count = z.int().check(z.nonnegative());

const diagnosticSchema = z.object({
  chatLinks: count,
  projectLinks: count,
  expandedSidebarProjects: count,
  projectRecentsFound: z.boolean(),
  pageKind: z.enum(['project', 'chat', 'other']),
});

/**
 * Tells whether a runtime message is a page diagnostic request.
 * @param message - Any message received by the content script.
 * @returns `true` for {@link PAGE_DIAGNOSTIC_REQUEST}.
 */
export function isPageDiagnosticRequest(message: unknown): boolean {
  return requestSchema.safeParse(message).success;
}

/**
 * Validates the answer of a claude.ai tab.
 * @param raw - The response of `tabs.sendMessage`.
 * @returns The diagnostic without unknown fields, or `null` when the answer is not one.
 */
export function parsePageDiagnostic(raw: unknown): DomDiagnostic | null {
  const result = diagnosticSchema.safeParse(raw);
  return result.success ? result.data : null;
}
