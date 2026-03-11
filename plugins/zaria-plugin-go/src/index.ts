/**
 * `zaria-plugin-go` — official Go plugin for Zaria.
 *
 * Provides static-analysis rules specific to Go projects:
 *   GO001  Ignored errors via blank identifier assignment
 *   GO002  panic() calls in non-test production code
 *   GO003  fmt.Println / fmt.Printf instead of a structured logger
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only Go source files from the analysis context. */
function goFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'go');
}

const TEST_FILE_RE = /_test\.go$/;

// ---------------------------------------------------------------------------
// GO001 — Ignored errors
// ---------------------------------------------------------------------------

const go001: Rule = {
  id: 'GO001',
  name: 'Do not ignore returned errors',
  description:
    'Go functions signal failures via a returned error value. Discarding it with the ' +
    'blank identifier (`_ = someFn()` or `val, _ := someFn()`) masks failures silently ' +
    'and makes the program brittle. Every error must be inspected and either handled or ' +
    'propagated.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Matches assignments where the last variable on the left side is `_`
    // (strongly correlated with discarded error returns in idiomatic Go).
    const IGNORED_ERR_RE = /(?:,\s*_\s*:?=|^_\s*(?:,|\s*=))/;

    for (const file of goFiles(context)) {
      if (TEST_FILE_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
        if (IGNORED_ERR_RE.test(line)) {
          findings.push({
            ruleId: 'GO001',
            severity: 'high',
            message: 'Error return value discarded with blank identifier.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Assign the error to a named variable and check it:\n' +
              '  result, err := someFunc()\n' +
              '  if err != nil { return fmt.Errorf("context: %w", err) }',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// GO002 — panic() in production code
// ---------------------------------------------------------------------------

const go002: Rule = {
  id: 'GO002',
  name: 'Avoid panic() in production code',
  description:
    'panic() terminates the current goroutine and unwinds the call stack, crashing the ' +
    'program unless a recover() is in place. In library or business logic code, prefer ' +
    'returning an error value instead of panicking so callers can decide how to handle ' +
    'the failure.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const PANIC_RE = /\bpanic\s*\(/;

    for (const file of goFiles(context)) {
      if (TEST_FILE_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        if (PANIC_RE.test(line)) {
          findings.push({
            ruleId: 'GO002',
            severity: 'high',
            message: 'panic() call detected in production code.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Return an error value instead of panicking:\n' +
              '  if condition { return nil, fmt.Errorf("unexpected state: %v", state) }\n' +
              'Reserve panic only for truly unrecoverable programmer errors, and only in ' +
              'package init() or main().',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// GO003 — fmt.Println / fmt.Printf instead of structured logging
// ---------------------------------------------------------------------------

const go003: Rule = {
  id: 'GO003',
  name: 'Use a structured logger instead of fmt.Print*',
  description:
    'fmt.Println() and fmt.Printf() write unstructured text to stdout, which is hard to ' +
    'parse, filter, and aggregate in production observability stacks. Use a structured ' +
    'logger such as log/slog (stdlib ≥1.21), zap, or zerolog instead.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const FMT_PRINT_RE = /\bfmt\.Print(?:f|ln|err)?\s*\(/;

    for (const file of goFiles(context)) {
      if (TEST_FILE_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        if (FMT_PRINT_RE.test(line)) {
          findings.push({
            ruleId: 'GO003',
            severity: 'low',
            message: 'fmt.Print* used for logging — prefer a structured logger.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace fmt.Println/Printf with slog, zap, or zerolog:\n' +
              '  slog.Info("message", "key", value)  // log/slog (Go ≥1.21)\n' +
              '  logger.Sugar().Infow("msg", "k", v)  // uber-go/zap',
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
  name: 'zaria-plugin-go',
  version: '1.0.0',
  rules: [go001, go002, go003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
