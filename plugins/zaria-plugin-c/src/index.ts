/**
 * `zaria-plugin-c` — official C plugin for Zaria.
 *
 * Provides static-analysis rules specific to C projects:
 *   C001  gets() usage — guaranteed buffer overflow vulnerability
 *   C002  sprintf() without bounds checking (use snprintf)
 *   C003  malloc()/calloc() return value not checked for NULL
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only C source and header files from the analysis context. */
function cFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'c');
}

// ---------------------------------------------------------------------------
// C001 — gets() — guaranteed buffer overflow
// ---------------------------------------------------------------------------

const c001: Rule = {
  id: 'C001',
  name: 'Never use gets() — guaranteed buffer overflow',
  description:
    'gets() reads an unbounded number of characters into a fixed-size buffer with no ' +
    'way to specify a limit. It was removed from C11 because it is impossible to use ' +
    'safely. Any program that calls gets() is vulnerable to a stack-based buffer overflow.',
  severity: 'critical',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match `gets(` as a standalone call, not `fgets(`
    const GETS_RE = /\bgets\s*\(/;

    for (const file of cFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (GETS_RE.test(line) && !/fgets\s*\(/.test(line)) {
          findings.push({
            ruleId: 'C001',
            severity: 'critical',
            message: 'gets() is inherently unsafe — guaranteed buffer overflow vulnerability.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace gets() with fgets() which requires a size limit:\n' +
              '  char buf[256];\n' +
              '  if (fgets(buf, sizeof(buf), stdin) == NULL) { /* handle error */ }\n' +
              '  buf[strcspn(buf, "\\n")] = 0; // strip trailing newline if needed',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// C002 — sprintf() without bounds checking
// ---------------------------------------------------------------------------

const c002: Rule = {
  id: 'C002',
  name: 'Use snprintf() instead of sprintf()',
  description:
    'sprintf() writes into a fixed-size buffer without a length limit, allowing output ' +
    'that exceeds the buffer to silently overflow into adjacent memory. snprintf() ' +
    'accepts an explicit maximum byte count and is always preferred.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match `sprintf(` but not `snprintf(`
    const SPRINTF_RE = /\bsprintf\s*\(/;

    for (const file of cFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (SPRINTF_RE.test(line) && !/snprintf\s*\(/.test(line)) {
          findings.push({
            ruleId: 'C002',
            severity: 'high',
            message: 'sprintf() used — may overflow the destination buffer.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace sprintf() with snprintf():\n' +
              '  // Before: sprintf(buf, "%s/%s", dir, file);\n' +
              '  snprintf(buf, sizeof(buf), "%s/%s", dir, file);\n' +
              'Check the return value to detect truncation: if (ret >= (int)sizeof(buf)) { ... }',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// C003 — malloc/calloc without NULL check
// ---------------------------------------------------------------------------

const c003: Rule = {
  id: 'C003',
  name: 'Check malloc()/calloc() return value for NULL',
  description:
    'malloc() and calloc() return NULL when the allocation fails (e.g. out-of-memory). ' +
    'Dereferencing a NULL pointer causes undefined behaviour. Always check the return ' +
    'value before using the allocated pointer.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Heuristic: a line that calls malloc/calloc and assigns the result without an
    // if/NULL check on the same line.
    const ALLOC_RE = /=\s*(?:malloc|calloc|realloc)\s*\(/;
    const NULL_CHECK_RE = /(?:if\s*\(|!=\s*NULL|==\s*NULL)/;

    for (const file of cFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (ALLOC_RE.test(line) && !NULL_CHECK_RE.test(line)) {
          // Check if the next non-blank line is a NULL check.
          const nextLine = lines.slice(idx + 1).find((l) => l.trim().length > 0) ?? '';
          if (!NULL_CHECK_RE.test(nextLine)) {
            findings.push({
              ruleId: 'C003',
              severity: 'high',
              message: 'malloc()/calloc() return value not checked for NULL.',
              file: file.sourceFile.path,
              line: idx + 1,
              recommendation:
                'Always validate the allocation result:\n' +
                '  char *buf = malloc(size);\n' +
                '  if (buf == NULL) { perror("malloc"); return -1; }\n' +
                'Consider a helper that logs and exits on failure for programs ' +
                'that cannot continue without the allocation.',
            });
          }
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
  name: 'zaria-plugin-c',
  version: '1.0.0',
  rules: [c001, c002, c003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
