/**
 * Terminal reporter — Phase 11.1 (updated: chalk integration).
 *
 * Produces a human-readable, ANSI-coloured summary of an `AuditResult`
 * suitable for writing directly to a TTY.
 *
 * Colour support is handled by **chalk v5** which automatically:
 *   • Respects the `NO_COLOR` environment variable (W3C standard).
 *   • Respects `FORCE_COLOR` for CI override.
 *   • Degrades gracefully on 16-colour, 256-colour, and monochrome terminals.
 *   • Produces plain text when piped (non-TTY stdout).
 *
 * Time  O(F)  where F = total number of findings across all dimensions.
 * Space O(F)  — the output is built line-by-line in a string array.
 */

import chalk from 'chalk';
import type { AuditResult, Finding, Grade } from '../audit/types.js';

// ---------------------------------------------------------------------------
// Colour helpers — all respect chalk's auto-detected colour level.
// ---------------------------------------------------------------------------

/** Map severity → chalk colour function. */
const SEVERITY_COLOR: Readonly<Record<string, chalk.Chalk>> = {
  critical: chalk.red,
  high: chalk.yellow,
  medium: chalk.cyan,
  low: chalk.blue,
};

/** Map grade → chalk colour function. */
const GRADE_COLOR: Readonly<Record<Grade, chalk.Chalk>> = {
  A: chalk.green,
  B: chalk.green,
  C: chalk.yellow,
  D: chalk.yellow,
  F: chalk.red,
};

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

/**
 * Build a simple Unicode progress bar.
 *
 * @param score  0–100 numeric score.
 * @param width  Total bar width in characters (default 20).
 */
function progressBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Capitalise first character. */
function cap(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render `result` as an ANSI-coloured terminal report.
 *
 * Colour output is automatically suppressed when:
 *   - `NO_COLOR` env var is set (any value).
 *   - stdout is not a TTY (e.g. piped to `> file.txt`).
 *   - `TERM=dumb` is set.
 *
 * @param result   The audit result to render.
 * @param verbose  When `true`, include the full finding list (default false).
 * @returns        A multiline string ready for `process.stdout.write()`.
 */
export function renderTerminal(result: AuditResult, verbose = false): string {
  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────
  lines.push('');
  lines.push(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
  lines.push(chalk.bold.cyan('  ║         ZARIA AUDIT REPORT           ║'));
  lines.push(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
  lines.push('');
  lines.push(`  ${chalk.bold('Project:')}  ${result.projectRoot}`);
  lines.push(`  ${chalk.bold('Date:')}     ${new Date(result.timestamp).toLocaleString()}`);
  lines.push('');

  // ── Overall score ───────────────────────────────────────────────────────
  const { weighted, grade } = result.overall;
  const gc = GRADE_COLOR[grade] ?? chalk.white;
  lines.push(
    `  ${chalk.bold('Overall Score')}  ${chalk.bold(gc(weighted.toFixed(1)))} / 100   Grade: ${chalk.bold(gc(grade))}`,
  );
  lines.push(`  ${progressBar(weighted)}  ${weighted.toFixed(1)} %`);
  lines.push('');

  // ── Dimension breakdown ─────────────────────────────────────────────────
  lines.push(chalk.bold('  Dimension Breakdown'));
  lines.push(chalk.dim('  ' + '─'.repeat(50)));

  for (const entry of result.overall.breakdown) {
    const label = cap(entry.dimension).padEnd(14);
    const bar = progressBar(entry.score, 16);
    const scoreStr = String(entry.score.toFixed(0)).padStart(3);
    const weightStr = `(${(entry.weight * 100).toFixed(0)} %)`;
    lines.push(`  ${chalk.bold(label)} ${bar} ${scoreStr}  ${chalk.dim(weightStr)}`);
  }
  lines.push('');

  // ── Finding summary ─────────────────────────────────────────────────────
  const allFindings: Finding[] = result.dimensions.flatMap((d) => d.findings);
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) {
    if (f.severity in counts) counts[f.severity]++;
  }

  lines.push(chalk.bold('  Finding Summary'));
  lines.push(chalk.dim('  ' + '─'.repeat(50)));
  lines.push(
    `  ${chalk.red('●')} Critical: ${counts.critical}   ` +
      `${chalk.yellow('●')} High: ${counts.high}   ` +
      `${chalk.cyan('●')} Medium: ${counts.medium}   ` +
      `${chalk.blue('●')} Low: ${counts.low}`,
  );
  lines.push(
    `  ${chalk.dim('Total:')} ${allFindings.length} finding${allFindings.length === 1 ? '' : 's'}`,
  );
  lines.push('');

  // ── Verbose findings ────────────────────────────────────────────────────
  if (verbose && allFindings.length > 0) {
    lines.push(chalk.bold('  Findings'));
    lines.push(chalk.dim('  ' + '─'.repeat(50)));

    // Sort: critical → high → medium → low for fast triaging.
    const ORDER: Readonly<Record<string, number>> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...allFindings].sort(
      (a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9),
    );

    for (const f of sorted) {
      const loc = f.line != null ? `:${f.line}` : '';
      const sc = SEVERITY_COLOR[f.severity] ?? chalk.white;
      lines.push(
        `  ${sc(f.severity.toUpperCase().padEnd(8))} ${chalk.bold(f.ruleId)}  ${chalk.dim(f.file + loc)}`,
      );
      lines.push(`    ${f.message}`);
      lines.push(`    ${chalk.green('→')} ${f.recommendation}`);
      lines.push('');
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push(chalk.dim('  Generated by Zaria — Enterprise Codebase Audit CLI'));
  lines.push('');

  return lines.join('\n');
}
