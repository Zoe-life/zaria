/**
 * JSON reporter — Phase 11.2.
 *
 * Serialises an `AuditResult` to a deterministic, machine-readable JSON
 * string.  The output is compact by default; callers can pass `spaces` to
 * produce pretty-printed output.
 *
 * Time  O(F)  where F = total number of findings across all dimensions.
 * Space O(F)  — the output string is proportional to the number of findings.
 */

import type { AuditResult } from '../audit/types.js';

/**
 * Render `result` as a JSON string.
 *
 * @param result  The audit result to serialise.
 * @param spaces  Indentation spaces for `JSON.stringify` (default 2).
 * @returns       A UTF-8 JSON string ready to be written to a file or stdout.
 */
export function renderJson(result: AuditResult, spaces = 2): string {
  return JSON.stringify(result, null, spaces);
}
