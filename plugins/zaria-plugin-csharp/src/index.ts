/**
 * `zaria-plugin-csharp` — official C# plugin for Zaria.
 *
 * Provides static-analysis rules specific to C# / .NET projects:
 *   CS001  Console.WriteLine() instead of ILogger (Microsoft.Extensions.Logging)
 *   CS002  Empty catch blocks that silently swallow exceptions
 *   CS003  Thread.Sleep() inside async methods (should be Task.Delay)
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only C# source files from the analysis context. */
function csFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'csharp');
}

const TEST_PATH_RE = /[\\/](?:Tests?|Specs?)[\\/]|Tests?\.cs$|Spec\.cs$/i;

// ---------------------------------------------------------------------------
// CS001 — Console.WriteLine() instead of ILogger
// ---------------------------------------------------------------------------

const cs001: Rule = {
  id: 'CS001',
  name: 'Use ILogger instead of Console.WriteLine()',
  description:
    'Console.WriteLine() and Console.Error.WriteLine() produce unstructured, unlevel ' +
    'output with no support for log levels, structured properties, or pluggable sinks. ' +
    'Microsoft.Extensions.Logging (ILogger<T>) is the idiomatic .NET logging abstraction ' +
    'and supports Serilog, NLog, Application Insights, and other providers without code changes.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const CONSOLE_RE = /\bConsole\.(?:Write(?:Line)?|Error\.Write(?:Line)?)\s*\(/;

    for (const file of csFiles(context)) {
      if (TEST_PATH_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (CONSOLE_RE.test(line)) {
          findings.push({
            ruleId: 'CS001',
            severity: 'low',
            message:
              'Console.WriteLine() found — use ILogger<T> for structured, configurable logging.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Inject ILogger<T> and use structured logging:\n' +
              '  private readonly ILogger<MyService> _logger;\n' +
              '  _logger.LogInformation("Processing {Count} items", items.Count);\n' +
              'Configure providers in Program.cs via builder.Logging.AddConsole() etc.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// CS002 — Empty catch blocks
// ---------------------------------------------------------------------------

const cs002: Rule = {
  id: 'CS002',
  name: 'Do not use empty catch blocks',
  description:
    'An empty catch block swallows the exception entirely, making failures invisible ' +
    'to monitoring, logging, and the caller. Even when the exception is safe to ignore, ' +
    'a comment or a log statement should explain why.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Detect `catch (...)` or `} catch` followed by a block that closes immediately.
    // Handles both "} catch (...) {" (same-line brace) and "catch (...) {" (next-line brace).
    const CATCH_RE = /^\s*(?:\}\s*)?catch\s*(?:\([^)]*\))?\s*\{\s*$/;
    const CLOSE_RE = /^\s*\}\s*$/;

    for (const file of csFiles(context)) {
      const lines = file.content.split('\n');
      for (let idx = 0; idx < lines.length; idx++) {
        if (CATCH_RE.test(lines[idx])) {
          const nextLine = lines.slice(idx + 1).find((l) => l.trim().length > 0) ?? '';
          if (CLOSE_RE.test(nextLine)) {
            findings.push({
              ruleId: 'CS002',
              severity: 'high',
              message: 'Empty catch block — exception is silently discarded.',
              file: file.sourceFile.path,
              line: idx + 1,
              recommendation:
                'At minimum, log the exception:\n' +
                '  catch (Exception ex) {\n' +
                '      _logger.LogWarning(ex, "Unexpected error, continuing");\n' +
                '  }\n' +
                'If truly ignorable, add an explanatory comment inside the block.',
            });
          }
        }
      }
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// CS003 — Thread.Sleep() inside async methods
// ---------------------------------------------------------------------------

const cs003: Rule = {
  id: 'CS003',
  name: 'Use Task.Delay() instead of Thread.Sleep() in async code',
  description:
    'Thread.Sleep() blocks the current OS thread for the specified duration, preventing ' +
    'the thread-pool from executing other work items during that time. Inside an async ' +
    'method, Task.Delay() releases the thread back to the pool while waiting, providing ' +
    'the same timing semantics without blocking a thread.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const SLEEP_RE = /\bThread\.Sleep\s*\(/;
    const ASYNC_METHOD_RE = /\basync\b/;

    for (const file of csFiles(context)) {
      if (!ASYNC_METHOD_RE.test(file.content)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (SLEEP_RE.test(line)) {
          findings.push({
            ruleId: 'CS003',
            severity: 'high',
            message: 'Thread.Sleep() inside an async context blocks the thread-pool thread.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace Thread.Sleep() with awaited Task.Delay():\n' +
              '  // Before: Thread.Sleep(1000);\n' +
              '  await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);\n' +
              'Pass a CancellationToken to allow the delay to be cancelled gracefully.',
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
  name: 'zaria-plugin-csharp',
  version: '1.0.0',
  rules: [cs001, cs002, cs003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
