/**
 * HTML reporter — Phase 11.4.
 *
 * Generates a fully self-contained, single-file HTML audit report.
 * No external CSS or JavaScript resources are referenced — the document is
 * portable and works offline.
 *
 * Design goals:
 *   • Responsive, readable at any viewport width.
 *   • A11y-friendly colour contrast ratios (WCAG AA).
 *   • Zero runtime dependencies (only inlined CSS).
 *   • Zero runtime dependencies (only inlined CSS + vanilla JS).
 *
 * Time  O(F)  where F = total findings.
 * Space O(F)  — the HTML string length grows linearly with findings.
 */

import type { AuditResult, Finding, Grade } from '../audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** HTML-escape a string to prevent XSS when embedding user-supplied data. */
function he(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Capitalise first character. */
function cap(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

const GRADE_COLORS: Readonly<Record<Grade, string>> = {
  A: '#16a34a',
  B: '#65a30d',
  C: '#ca8a04',
  D: '#ea580c',
  F: '#dc2626',
};

const SEV_COLORS: Readonly<Record<string, string>> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
};

function gradeColor(grade: Grade): string {
  return GRADE_COLORS[grade] ?? '#6b7280';
}

function sevColor(sev: string): string {
  return SEV_COLORS[sev] ?? '#6b7280';
}

function scoreBar(score: number, color: string): string {
  const pct = score.toFixed(1);
  return `
    <div class="bar-track">
      <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
    </div>`;
}

function findingRows(findings: Finding[]): string {
  if (findings.length === 0) return '<p class="no-findings">✅ No findings for this dimension.</p>';
  const ORDER: Readonly<Record<string, number>> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...findings].sort((a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9));
  const rows = sorted
    .map((f) => {
      const loc = f.line != null ? `:${f.line}` : '';
      return `
        <tr>
          <td><span class="badge" style="background:${sevColor(f.severity)}">${he(f.severity)}</span></td>
          <td><code>${he(f.ruleId)}</code></td>
          <td class="file-cell"><code>${he(f.file + loc)}</code></td>
          <td>${he(f.message)}</td>
          <td>${he(f.recommendation)}</td>
        </tr>`;
    })
    .join('');
  return `
    <table class="findings-table">
      <thead>
        <tr>
          <th>Severity</th><th>Rule</th><th>File</th><th>Message</th><th>Recommendation</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render `result` as a self-contained HTML document string.
 *
 * @param result  The audit result to render.
 * @returns       A complete HTML document (UTF-8).
 */
export function renderHtml(result: AuditResult): string {
  const { weighted, grade, breakdown } = result.overall;
  const allFindings: Finding[] = result.dimensions.flatMap((d) => d.findings);
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) {
    if (f.severity in counts) counts[f.severity]++;
  }

  const dimSections = result.dimensions
    .map((dim) => {
      const c = dim.score >= 90 ? '#16a34a' : dim.score >= 70 ? '#ca8a04' : '#dc2626';
      return `
        <section class="dim-section">
          <h3>${he(cap(dim.dimension))}
            <span class="dim-score" style="color:${c}">${dim.score.toFixed(0)}</span>
          </h3>
          ${scoreBar(dim.score, c)}
          ${findingRows(dim.findings)}
        </section>`;
    })
    .join('');

  const breakdownRows = breakdown
    .map((b) => {
      const c = b.score >= 90 ? '#16a34a' : b.score >= 70 ? '#ca8a04' : '#dc2626';
      return `<tr>
        <td>${he(cap(b.dimension))}</td>
        <td style="color:${c};font-weight:bold">${b.score.toFixed(0)}</td>
        <td>${(b.weight * 100).toFixed(0)} %</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zaria Audit Report — ${he(result.projectRoot)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;line-height:1.5}
    header{background:#0f172a;color:#f8fafc;padding:1.5rem 2rem}
    header h1{font-size:1.5rem}
    header p{color:#94a3b8;font-size:.875rem;margin-top:.25rem}
    main{max-width:1100px;margin:2rem auto;padding:0 1rem}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;padding:1.5rem;margin-bottom:1.5rem}
    .grade{font-size:4rem;font-weight:700;line-height:1}
    .score-label{font-size:.875rem;color:#64748b}
    .bar-track{background:#e2e8f0;border-radius:9999px;height:.75rem;margin:.4rem 0}
    .bar-fill{height:100%;border-radius:9999px;transition:width .3s}
    table{width:100%;border-collapse:collapse;font-size:.875rem}
    th,td{text-align:left;padding:.5rem .75rem;border-bottom:1px solid #e2e8f0}
    th{background:#f1f5f9;font-weight:600}
    .badge{color:#fff;padding:.1rem .45rem;border-radius:.25rem;font-size:.75rem;text-transform:uppercase}
    .file-cell{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    code{font-family:monospace;background:#f1f5f9;padding:.1rem .3rem;border-radius:.2rem;font-size:.8rem}
    .dim-section{margin-bottom:1.25rem}
    .dim-section h3{font-size:1rem;margin-bottom:.4rem;display:flex;justify-content:space-between}
    .dim-score{font-size:1.1rem}
    .no-findings{color:#16a34a;margin:.5rem 0}
    .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem}
    .summary-item{text-align:center;padding:.75rem;border-radius:.5rem;background:#f8fafc;border:1px solid #e2e8f0}
    .summary-count{font-size:1.75rem;font-weight:700}
    footer{text-align:center;color:#94a3b8;font-size:.75rem;padding:2rem}
  </style>
</head>
<body>
  <header>
    <h1>🛡️ Zaria Audit Report</h1>
    <p>${he(result.projectRoot)} &middot; ${he(result.timestamp)}</p>
  </header>
  <main>
    <div class="card" style="display:flex;gap:2rem;align-items:center">
      <div>
        <div class="grade" style="color:${gradeColor(grade)}">${grade}</div>
        <div class="score-label">Grade</div>
      </div>
      <div style="flex:1">
        <div style="font-size:2rem;font-weight:700;color:${gradeColor(grade)}">${weighted.toFixed(1)}<span style="font-size:1rem;color:#64748b"> / 100</span></div>
        <div class="score-label">Weighted Overall Score</div>
        ${scoreBar(weighted, gradeColor(grade))}
      </div>
      <div class="summary-grid" style="flex:1">
        <div class="summary-item">
          <div class="summary-count" style="color:#dc2626">${counts.critical}</div>
          <div>Critical</div>
        </div>
        <div class="summary-item">
          <div class="summary-count" style="color:#ea580c">${counts.high}</div>
          <div>High</div>
        </div>
        <div class="summary-item">
          <div class="summary-count" style="color:#ca8a04">${counts.medium}</div>
          <div>Medium</div>
        </div>
        <div class="summary-item">
          <div class="summary-count" style="color:#2563eb">${counts.low}</div>
          <div>Low</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:1rem">Dimension Breakdown</h2>
      <table>
        <thead><tr><th>Dimension</th><th>Score</th><th>Weight</th></tr></thead>
        <tbody>${breakdownRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2 style="margin-bottom:1rem">Findings by Dimension</h2>
      ${dimSections}
    </div>
  </main>
  <footer>Generated by <strong>Zaria</strong> — Enterprise Codebase Audit CLI</footer>
</body>
</html>`;
}
