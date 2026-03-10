import { describe, it, expect } from 'vitest';
import { generateReport } from '../../../src/report/index.ts';
import type { OutputFormat } from '../../../src/report/index.ts';
import type { AuditResult } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const MOCK_RESULT: AuditResult = {
  projectRoot: '/tmp/test-project',
  timestamp: '2026-01-01T00:00:00.000Z',
  dimensions: [{ dimension: 'performance', score: 80, findings: [] }],
  overall: {
    weighted: 80,
    grade: 'B',
    breakdown: [{ dimension: 'performance', score: 80, weight: 0.25 }],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateReport', () => {
  it('defaults to terminal format', () => {
    const output = generateReport(MOCK_RESULT);
    // Terminal output uses ANSI codes
    expect(output).toContain('ZARIA AUDIT REPORT');
  });

  it('routes terminal format correctly', () => {
    const output = generateReport(MOCK_RESULT, 'terminal');
    expect(output).toContain('ZARIA AUDIT REPORT');
  });

  it('routes json format correctly', () => {
    const output = generateReport(MOCK_RESULT, 'json');
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output) as AuditResult;
    expect(parsed.overall.grade).toBe('B');
  });

  it('routes markdown format correctly', () => {
    const output = generateReport(MOCK_RESULT, 'markdown');
    expect(output).toContain('## 🛡️ Zaria Audit Report');
  });

  it('routes html format correctly', () => {
    const output = generateReport(MOCK_RESULT, 'html');
    expect(output.trim().startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('routes sarif format correctly', () => {
    const output = generateReport(MOCK_RESULT, 'sarif');
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe('2.1.0');
  });

  it('passes verbose flag to terminal renderer', () => {
    const noVerbose = generateReport(MOCK_RESULT, 'terminal', false);
    const verbose = generateReport(MOCK_RESULT, 'terminal', true);
    // Both should be valid; verbose may add findings section
    expect(noVerbose.length).toBeGreaterThan(0);
    expect(verbose.length).toBeGreaterThan(0);
  });

  it('throws on unknown format', () => {
    expect(() => generateReport(MOCK_RESULT, 'unknown' as OutputFormat)).toThrow(
      /unknown output format/i,
    );
  });
});
