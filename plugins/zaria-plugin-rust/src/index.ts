/**
 * `zaria-plugin-rust` — official Rust plugin for Zaria.
 *
 * Provides static-analysis rules specific to Rust projects:
 *   RUST001  .unwrap() calls that can cause a runtime panic
 *   RUST002  unsafe blocks that bypass Rust's memory-safety guarantees
 *   RUST003  Unnecessary .clone() calls that may indicate avoidable allocation
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only Rust source files from the analysis context. */
function rustFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'rust');
}

const TEST_MOD_RE = /#\[cfg\s*\(\s*test\s*\)\]/;

/** Returns true if the file contains a `#[cfg(test)]` attribute — heuristic for test modules. */
function isTestFile(content: string): boolean {
  return TEST_MOD_RE.test(content);
}

// ---------------------------------------------------------------------------
// RUST001 — .unwrap() calls
// ---------------------------------------------------------------------------

const rust001: Rule = {
  id: 'RUST001',
  name: 'Avoid .unwrap() on Result or Option',
  description:
    '.unwrap() panics when the value is Err or None. In production code this crashes the ' +
    'thread (and the process if it is the main thread). Use the ? operator, match, ' +
    'if let, or unwrap_or_else() to handle failures gracefully.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const UNWRAP_RE = /\.unwrap\s*\(\s*\)/;

    for (const file of rustFiles(context)) {
      if (isTestFile(file.content)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        if (UNWRAP_RE.test(line)) {
          findings.push({
            ruleId: 'RUST001',
            severity: 'high',
            message: '.unwrap() call detected — this will panic on Err/None.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Use the ? operator to propagate errors, or handle explicitly:\n' +
              '  let val = result?;                       // propagate\n' +
              '  let val = result.unwrap_or_else(|e| { ... });  // recover\n' +
              '  let val = result.expect("descriptive context"); // dev-only',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// RUST002 — unsafe blocks
// ---------------------------------------------------------------------------

const rust002: Rule = {
  id: 'RUST002',
  name: 'Review unsafe blocks carefully',
  description:
    "`unsafe` blocks opt out of Rust's memory-safety guarantees. Each unsafe block " +
    'must be manually verified to uphold invariants that the compiler can no longer check. ' +
    'Minimise their surface area and document the safety invariants with a `// SAFETY:` ' +
    'comment.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const UNSAFE_RE = /\bunsafe\s*\{/;

    for (const file of rustFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        if (UNSAFE_RE.test(line)) {
          // Check whether a SAFETY comment is present on the preceding line.
          const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
          const hasSafetyDoc = prevLine.includes('SAFETY:') || prevLine.includes('// Safety:');
          if (!hasSafetyDoc) {
            findings.push({
              ruleId: 'RUST002',
              severity: 'medium',
              message:
                'unsafe block without a preceding // SAFETY: comment explaining the invariants.',
              file: file.sourceFile.path,
              line: idx + 1,
              recommendation:
                'Add a // SAFETY: comment immediately before each unsafe block explaining:\n' +
                '  1. Why this operation is safe (preconditions upheld).\n' +
                '  2. What invariants the calling code guarantees.\n' +
                'Keep unsafe blocks as small as possible.',
            });
          }
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// RUST003 — Unnecessary .clone() calls
// ---------------------------------------------------------------------------

const rust003: Rule = {
  id: 'RUST003',
  name: 'Review .clone() calls for unnecessary heap allocation',
  description:
    'Cloning heap-allocated types (String, Vec, HashMap, etc.) copies the entire contents. ' +
    'Excessive cloning is a common cause of avoidable allocations in Rust. Prefer ' +
    'borrowing (&T), slices (&[T]), or Cow<T> when ownership is not required.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const CLONE_RE = /\.clone\s*\(\s*\)/;

    for (const file of rustFiles(context)) {
      if (isTestFile(file.content)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        if (CLONE_RE.test(line)) {
          findings.push({
            ruleId: 'RUST003',
            severity: 'low',
            message: '.clone() call detected — verify this allocation is necessary.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Consider whether a borrow or slice would suffice:\n' +
              '  fn process(s: &str) { ... }  // borrow instead of cloning a String\n' +
              '  fn process(items: &[T]) { ... }  // slice instead of cloning a Vec\n' +
              'Use Cow<str> or Cow<[T]> when sometimes ownership is needed.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const plugin: ZariaPlugin = {
  name: 'zaria-plugin-rust',
  version: '1.0.0',
  rules: [rust001, rust002, rust003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
