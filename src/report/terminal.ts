/**
 * Terminal reporter — Phase 11.1.
 *
 * Produces a human-readable, ANSI-coloured summary of an `AuditResult`
 * suitable for writing directly to a TTY.  No third-party colour libraries
 * are required; all ANSI escape codes are inlined to keep the bundle lean.
 *
 * Time  O(F)  where F = total number of findings across all dimensions.
 * Space O(F)  — the output is built line-by-line in a string array.
 */

import type { AuditResult, Finding, Grade } from '../audit/types.js';

// ---------------------------------------------------------------------------
// ANSI helpers (inlined to avoid external dependency)
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BLUE = '\x1b[34m';

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}
function dim(s: string): string {
  return `${DIM}${s}${RESET}`;
}
function color(s: string, c: string): string {
  return `${c}${s}${RESET}`;
}

/** Map severity → ANSI colour code. */
const SEVERITY_COLOR: Readonly<Record<string, string>> = {
  critical: RED,
  high: YELLOW,
  medium: CYAN,
  low: BLUE,
};

/** Map grade → ANSI colour code. */
const GRADE_COLOR: Readonly<Record<Grade, string>> = {
  A: GREEN,
  B: GREEN,
  C: YELLOW,
  D: YELLOW,
  F: RED,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a simple ASCII progress bar.
 *
 * @param score  0–100 numeric score.
 * @param width  Total bar width in characters (default 20).
 */
function progressBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return bar;
}

/** Left-pad a string to `len` characters. */
function pad(s: string, len: number): string {
  return s.padEnd(len);
}

/** Capitalise first character. */
function cap(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Colour a finding's severity label. */
function formatSeverity(sev: string): string {
  const c = SEVERITY_COLOR[sev] ?? WHITE;
  return color(sev.toUpperCase().padEnd(8), c);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render `result` as an ANSI-coloured terminal report.
 *
 * @param result   The audit result to render.
 * @param verbose  When `true`, include the full finding list (default false).
 * @returns        A multiline string ready for `process.stdout.write()`.
 */
export function renderTerminal(result: AuditResult, verbose = false): string {
  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────
  lines.push('');
  lines.push(bold(color('  ╔══════════════════════════════════════╗', CYAN)));
  lines.push(bold(color('  ║         ZARIA AUDIT REPORT           ║', CYAN)));
  lines.push(bold(color('  ╚══════════════════════════════════════╝', CYAN)));
  lines.push('');
  lines.push(`  ${bold('Project:')}  ${result.projectRoot}`);
  lines.push(`  ${bold('Date:')}     ${new Date(result.timestamp).toLocaleString()}`);
  lines.push('');

  // ── Overall score ───────────────────────────────────────────────────────
  const { weighted, grade } = result.overall;
  const gradeColored = color(grade, GRADE_COLOR[grade] ?? WHITE);
  const scoreColored = color(String(weighted.toFixed(1)), GRADE_COLOR[grade] ?? WHITE);

  lines.push(
    `  ${bold('Overall Score')}  ${bold(scoreColored)} / 100   Grade: ${bold(gradeColored)}`,
  );
  lines.push(`  ${progressBar(weighted)}  ${weighted.toFixed(1)} %`);
  lines.push('');

  // ── Dimension breakdown ─────────────────────────────────────────────────
  lines.push(bold('  Dimension Breakdown'));
  lines.push(dim('  ' + '─'.repeat(50)));

  for (const entry of result.overall.breakdown) {
    const label = pad(cap(entry.dimension), 14);
    const bar = progressBar(entry.score, 16);
    const scoreStr = String(entry.score.toFixed(0)).padStart(3);
    const weightStr = `(${(entry.weight * 100).toFixed(0)} %)`;
    lines.push(`  ${bold(label)} ${bar} ${scoreStr}  ${dim(weightStr)}`);
  }
  lines.push('');

  // ── Finding summary ─────────────────────────────────────────────────────
  const allFindings: Finding[] = result.dimensions.flatMap((d) => d.findings);
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) {
    if (f.severity in counts) counts[f.severity]++;
  }

  lines.push(bold('  Finding Summary'));
  lines.push(dim('  ' + '─'.repeat(50)));
  lines.push(
    `  ${color('●', RED)} Critical: ${counts.critical}   ` +
      `${color('●', YELLOW)} High: ${counts.high}   ` +
      `${color('●', CYAN)} Medium: ${counts.medium}   ` +
      `${color('●', BLUE)} Low: ${counts.low}`,
  );
  lines.push(
    `  ${dim('Total:')} ${allFindings.length} finding${allFindings.length === 1 ? '' : 's'}`,
  );
  lines.push('');

  // ── Verbose findings ────────────────────────────────────────────────────
  if (verbose && allFindings.length > 0) {
    lines.push(bold('  Findings'));
    lines.push(dim('  ' + '─'.repeat(50)));

    // Sort: critical → high → medium → low for fast triaging.
    const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...allFindings].sort(
      (a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9),
    );

    for (const f of sorted) {
      const loc = f.line != null ? `:${f.line}` : '';
      lines.push(`  ${formatSeverity(f.severity)} ${bold(f.ruleId)}  ${dim(f.file + loc)}`);
      lines.push(`    ${f.message}`);
      lines.push(`    ${color('→', GREEN)} ${f.recommendation}`);
      lines.push('');
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push(dim('  Generated by Zaria — Enterprise Codebase Audit CLI'));
  lines.push('');

  return lines.join('\n');
}
