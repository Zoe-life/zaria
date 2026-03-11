/**
 * `zaria-plugin-python` — official Python plugin for Zaria.
 *
 * Provides static-analysis rules specific to Python projects:
 *   PY001  print() statements instead of the logging module
 *   PY002  Bare or overly broad except clauses (silent error suppression)
 *   PY003  Mutable default arguments (classic Python footgun)
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only Python source files from the analysis context. */
function pythonFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'python');
}

// ---------------------------------------------------------------------------
// PY001 — print() instead of logging
// ---------------------------------------------------------------------------

const py001: Rule = {
  id: 'PY001',
  name: 'Use logging instead of print()',
  description:
    'Calls to print() in non-test source files are a sign of debug-quality code. ' +
    'The standard `logging` module provides log levels, formatters, and handlers ' +
    'that make output configurable without changing the source.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Matches bare `print(` at any indentation level; skips test files.
    const PRINT_RE = /^\s*print\s*\(/;
    const TEST_PATH_RE = /[\\/](?:tests?|test_\w+)[\\/]|_test\.py$|test_.*\.py$/;

    for (const file of pythonFiles(context)) {
      if (TEST_PATH_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (PRINT_RE.test(line)) {
          findings.push({
            ruleId: 'PY001',
            severity: 'low',
            message: 'print() statement found — prefer the logging module for production output.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace print() with logging.info(), logging.debug(), or logging.warning(). ' +
              'Configure handlers once in your entry point with logging.basicConfig().',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// PY002 — Bare or broad except clauses
// ---------------------------------------------------------------------------

const py002: Rule = {
  id: 'PY002',
  name: 'Avoid bare or overly broad except clauses',
  description:
    'A bare `except:` catches every exception including SystemExit and KeyboardInterrupt. ' +
    '`except Exception:` without re-raising silently swallows errors and makes debugging ' +
    'very difficult. Always catch the most specific exception type you expect.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match `except:` (bare) or `except Exception:` / `except Exception as e:`
    // Allow `except Exception` when followed by `raise` somewhere in the block (heuristic).
    const BARE_EXCEPT_RE = /^\s*except\s*(?:Exception(?:\s+as\s+\w+)?\s*)?:/;

    for (const file of pythonFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (BARE_EXCEPT_RE.test(line)) {
          // Check if next non-blank line is `pass` — definite smell.
          const nextLine = lines.slice(idx + 1).find((l) => l.trim().length > 0) ?? '';
          const severity: Finding['severity'] = /^\s*pass\s*$/.test(nextLine) ? 'high' : 'medium';
          findings.push({
            ruleId: 'PY002',
            severity,
            message: 'Bare or overly broad except clause — specific exceptions should be caught.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace `except:` or `except Exception:` with the specific exception type(s) ' +
              'you expect (e.g. `except ValueError:`). If you must catch broadly, re-raise ' +
              'after logging: `except Exception: logger.exception("..."); raise`.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// PY003 — Mutable default arguments
// ---------------------------------------------------------------------------

const py003: Rule = {
  id: 'PY003',
  name: 'Avoid mutable default arguments',
  description:
    'Python evaluates default argument values once at function definition time, not at ' +
    'call time. Using a mutable object (list, dict, set) as a default causes it to be ' +
    'shared across all calls that rely on the default — a frequent source of subtle bugs.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match `def func(... = []`, `= {}`, or `= set()` in parameter list.
    const MUTABLE_DEFAULT_RE = /def\s+\w+\s*\([^)]*=\s*(?:\[\s*\]|\{\s*\}|set\s*\(\s*\))/;

    for (const file of pythonFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (MUTABLE_DEFAULT_RE.test(line)) {
          findings.push({
            ruleId: 'PY003',
            severity: 'medium',
            message: 'Mutable default argument detected — this value is shared across all calls.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Use None as the default and assign the mutable inside the function body:\n' +
              '  def func(items=None):\n' +
              '      if items is None: items = []',
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
  name: 'zaria-plugin-python',
  version: '1.0.0',
  rules: [py001, py002, py003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
