/**
 * PERF004 — Memory Leak Patterns (Event Listener Not Removed)
 *
 * Detects `addEventListener` calls that do not have a corresponding
 * `removeEventListener` call in the same file. When listeners are attached
 * without being detached (e.g. in component mount / server request handlers),
 * they accumulate over time and prevent the referenced objects from being
 * garbage-collected.
 *
 * Heuristic:
 *  - For each file, count occurrences of `addEventListener`.
 *  - If the number of `addEventListener` calls is greater than the number of
 *    `removeEventListener` calls, flag the imbalance.
 *
 * This rule uses content-based (regex) analysis since the pattern is
 * straightforward and does not require full AST traversal.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const ADD_LISTENER = /\baddEventListener\s*\(/g;
const REMOVE_LISTENER = /\bremoveEventListener\s*\(/g;

// Also detect Node.js EventEmitter patterns
const ON_PATTERN = /\b(on|once)\s*\(\s*['"`][^'"` ]+['"`]/g;
const OFF_PATTERN = /\b(off|removeListener|removeAllListeners)\s*\(/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countMatches(content: string, pattern: RegExp): number {
  return (content.match(pattern) ?? []).length;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const perf004: Rule = {
  id: 'PERF004',
  name: 'Memory Leak — Event Listener Not Removed',
  description:
    'Detects addEventListener calls without a corresponding removeEventListener in the same file, which can cause memory leaks.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const content = parsedFile.content;

      const addCount = countMatches(content, ADD_LISTENER);
      const removeCount = countMatches(content, REMOVE_LISTENER);

      // Additional check for Node.js EventEmitter pattern
      const onCount = countMatches(content, ON_PATTERN);
      const offCount = countMatches(content, OFF_PATTERN);

      const domImbalance = addCount - removeCount;
      const emitterImbalance = onCount - offCount;

      if (domImbalance > 0) {
        findings.push({
          ruleId: 'PERF004',
          severity: 'medium',
          message: `${addCount} addEventListener call(s) found but only ${removeCount} removeEventListener call(s). Unremoved listeners may cause memory leaks.`,
          file: parsedFile.sourceFile.path,
          recommendation:
            'Ensure every addEventListener is paired with a removeEventListener in a cleanup callback (e.g. component unmount, AbortSignal, or WeakRef pattern).',
        });
      }

      if (emitterImbalance > 0) {
        findings.push({
          ruleId: 'PERF004',
          severity: 'low',
          message: `${onCount} EventEmitter.on/once call(s) found but only ${offCount} removeListener/off call(s). Unremoved listeners may prevent garbage collection.`,
          file: parsedFile.sourceFile.path,
          recommendation:
            'Pair EventEmitter.on() calls with emitter.off() / emitter.removeListener() in a cleanup function, or use emitter.once() for single-fire handlers.',
        });
      }
    }

    return findings;
  },
};
