/**
 * MAINT002 — Code Duplication
 *
 * Detects files that contain blocks of code identical to blocks found in
 * other files (cross-file duplication) or repeated within the same file
 * (within-file duplication).
 *
 * Algorithm — sliding-window line-hash approach:
 *  1. Normalise each line: strip single-line comments (`//…`) and inline
 *     block comments (`/* … *\/`), then `trim()`. Filter out empty lines.
 *  2. Build all consecutive windows of BLOCK_SIZE normalised lines from each
 *     file (sliding window, step = 1).
 *  3. Hash each window (the joined string serves as its own hash key via a
 *     `Map<string, string>`).
 *  4. On the first occurrence of a window, record the source file path.
 *     On a subsequent occurrence (same or different file), flag both the
 *     current file and the first-seen file.
 *  5. Within the same file, use a per-file `Set` to detect repeated windows
 *     before they reach the cross-file map.
 *
 * BLOCK_SIZE = 6 non-empty normalised lines — large enough to avoid trivial
 * false positives (e.g. single-line returns) while catching meaningful copy-
 * paste duplication.
 *
 * Time complexity:  O(F × L × B) ≈ O(F × L) where F = files, L = lines per
 *   file, B = BLOCK_SIZE (constant 6).
 * Space complexity: O(U × B) where U = unique blocks across all files.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum number of consecutive identical non-empty, normalised lines that
 * constitutes a duplicate block worth flagging.
 */
const BLOCK_SIZE = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a single source line for duplication comparison:
 *  - Strip trailing single-line comments.
 *  - Strip inline block comments.
 *  - Trim surrounding whitespace.
 *
 * O(n) in line length.
 */
function normalizeLine(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '')
    .trim();
}

/**
 * Build all BLOCK_SIZE-line sliding-window blocks from `content`.
 * Empty lines (after normalisation) are skipped.
 * Returns an array of joined window strings (one per window position).
 *
 * O(L × BLOCK_SIZE) ≈ O(L) where L = number of non-empty lines.
 */
function buildBlocks(content: string): string[] {
  const lines = content
    .split('\n')
    .map(normalizeLine)
    .filter((l) => l.length > 0);

  if (lines.length < BLOCK_SIZE) return [];

  const blocks: string[] = [];
  for (let i = 0; i <= lines.length - BLOCK_SIZE; i++) {
    blocks.push(lines.slice(i, i + BLOCK_SIZE).join('\n'));
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const maint002: Rule = {
  id: 'MAINT002',
  name: 'Code Duplication',
  description:
    `Detects repeated code blocks (≥${BLOCK_SIZE} identical consecutive non-empty lines) within a file or across files. ` +
    'Duplicated logic increases maintenance cost: a bug fix or behaviour change must be applied in every copy.',
  severity: 'low',

  check(context: AnalysisContext): Finding[] {
    // blockToFirstFile: maps a block's canonical string → path of the first
    // file in which it appeared.  Used for cross-file duplicate detection.
    const blockToFirstFile = new Map<string, string>();

    // flaggedFiles: paths already assigned a finding (at most one per file).
    const flaggedFiles = new Set<string>();

    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const path = parsedFile.sourceFile.path;
      const blocks = buildBlocks(parsedFile.content);

      // Per-file set for within-file duplicate detection.
      // Reset on each file so we don't conflate cross-file matches.
      const seenInThisFile = new Set<string>();

      for (const block of blocks) {
        // ── Within-file duplicate ──────────────────────────────────────────
        if (seenInThisFile.has(block)) {
          if (!flaggedFiles.has(path)) {
            findings.push({
              ruleId: 'MAINT002',
              severity: 'low',
              message: `Duplicate code block (≥${BLOCK_SIZE} lines) detected within the same file. Copy-paste duplication increases maintenance burden.`,
              file: path,
              recommendation:
                'Extract the repeated logic into a shared helper function or module that both call sites can import.',
            });
            flaggedFiles.add(path);
          }
          // No need to continue scanning this file once it is flagged.
          break;
        }
        seenInThisFile.add(block);

        // ── Cross-file duplicate ───────────────────────────────────────────
        const firstFile = blockToFirstFile.get(block);
        if (firstFile !== undefined && firstFile !== path) {
          if (!flaggedFiles.has(path)) {
            findings.push({
              ruleId: 'MAINT002',
              severity: 'low',
              message: `Duplicate code block (≥${BLOCK_SIZE} lines) also found in another file. Cross-file copy-paste duplication splits maintenance effort across multiple locations.`,
              file: path,
              recommendation:
                'Move the shared logic into a dedicated module and import it in both places.',
            });
            flaggedFiles.add(path);
          }
          if (!flaggedFiles.has(firstFile)) {
            findings.push({
              ruleId: 'MAINT002',
              severity: 'low',
              message: `Duplicate code block (≥${BLOCK_SIZE} lines) also found in another file. Cross-file copy-paste duplication splits maintenance effort across multiple locations.`,
              file: firstFile,
              recommendation:
                'Move the shared logic into a dedicated module and import it in both places.',
            });
            flaggedFiles.add(firstFile);
          }
        } else if (firstFile === undefined) {
          blockToFirstFile.set(block, path);
        }
      }
    }

    return findings;
  },
};
