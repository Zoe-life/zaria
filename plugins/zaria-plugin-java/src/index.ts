/**
 * `zaria-plugin-java` — official Java plugin for Zaria.
 *
 * Provides static-analysis rules specific to Java projects:
 *   JAVA001  System.out.println() instead of a proper logger (SLF4J / Log4j2)
 *   JAVA002  Empty catch blocks that silently suppress exceptions
 *   JAVA003  Catching Exception or Throwable instead of specific types
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only Java source files from the analysis context. */
function javaFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'java');
}

const TEST_PATH_RE = /[\\/](?:test|tests)[\\/]|Test\.java$|IT\.java$/;

// ---------------------------------------------------------------------------
// JAVA001 — System.out.println() instead of logger
// ---------------------------------------------------------------------------

const java001: Rule = {
  id: 'JAVA001',
  name: 'Use a logger instead of System.out.println()',
  description:
    'System.out.println() and System.err.println() write unstructured, unlevel output ' +
    'that cannot be filtered, aggregated, or disabled without changing the source. ' +
    'Use a logging framework (SLF4J + Logback, Log4j2, or java.util.logging) that ' +
    'supports log levels, structured fields, and runtime configuration.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const SYSOUT_RE = /\bSystem\.(?:out|err)\.print(?:ln|f)?\s*\(/;

    for (const file of javaFiles(context)) {
      if (TEST_PATH_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (SYSOUT_RE.test(line)) {
          findings.push({
            ruleId: 'JAVA001',
            severity: 'low',
            message: 'System.out/err.print* found — use a logging framework (SLF4J, Log4j2).',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Declare a static logger and use it:\n' +
              '  private static final Logger log = LoggerFactory.getLogger(MyClass.class);\n' +
              '  log.info("Message: {}", value);',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// JAVA002 — Empty catch blocks
// ---------------------------------------------------------------------------

const java002: Rule = {
  id: 'JAVA002',
  name: 'Do not use empty catch blocks',
  description:
    'An empty catch block silently discards the exception, making failures invisible. ' +
    'If you truly need to ignore an exception, add a comment explaining why, ' +
    'and at minimum log it at WARN or DEBUG level.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Detect `catch (...) {` followed immediately by `}` with only whitespace/comments.
    const CATCH_RE = /^\s*\}\s*catch\s*\([^)]+\)\s*\{\s*$/;
    const EMPTY_BODY_RE = /^\s*\}\s*$/;

    for (const file of javaFiles(context)) {
      const lines = file.content.split('\n');
      for (let idx = 0; idx < lines.length; idx++) {
        if (CATCH_RE.test(lines[idx])) {
          // Check if next non-blank line closes the block immediately.
          const nextLine = lines.slice(idx + 1).find((l) => l.trim().length > 0) ?? '';
          if (EMPTY_BODY_RE.test(nextLine)) {
            findings.push({
              ruleId: 'JAVA002',
              severity: 'high',
              message: 'Empty catch block detected — exception is silently discarded.',
              file: file.sourceFile.path,
              line: idx + 1,
              recommendation:
                'At minimum, log the exception:\n' +
                '  catch (SomeException e) {\n' +
                '      log.warn("Unexpected error, continuing", e);\n' +
                '  }\n' +
                'If the exception is truly ignorable, add a comment:\n' +
                '  catch (InterruptedException e) {\n' +
                '      Thread.currentThread().interrupt(); // restore interrupt flag\n' +
                '  }',
            });
          }
        }
      }
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// JAVA003 — Catching Exception or Throwable
// ---------------------------------------------------------------------------

const java003: Rule = {
  id: 'JAVA003',
  name: 'Avoid catching Exception or Throwable',
  description:
    'Catching Exception swallows RuntimeExceptions that indicate programming errors. ' +
    'Catching Throwable also catches Errors (OutOfMemoryError, StackOverflowError) that ' +
    'the JVM uses to signal unrecoverable states. Always catch the most specific ' +
    'exception types you actually expect.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const BROAD_CATCH_RE = /\bcatch\s*\(\s*(?:Exception|Throwable)\s+\w+\s*\)/;

    for (const file of javaFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (BROAD_CATCH_RE.test(line)) {
          findings.push({
            ruleId: 'JAVA003',
            severity: 'medium',
            message: 'Catching Exception or Throwable — prefer specific exception types.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Catch only the exceptions you know how to handle:\n' +
              '  catch (IOException | SQLException e) { ... }\n' +
              'If you must catch broadly at a top-level boundary, log and re-throw or ' +
              'wrap in a domain exception.',
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
  name: 'zaria-plugin-java',
  version: '1.0.0',
  rules: [java001, java002, java003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
