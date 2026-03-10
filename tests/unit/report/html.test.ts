import { describe, it, expect } from 'vitest';
import { renderHtml } from '../../../src/report/html.ts';
import type { AuditResult } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const MOCK_RESULT: AuditResult = {
  projectRoot: '/tmp/test-project',
  timestamp: '2026-01-01T00:00:00.000Z',
  dimensions: [
    {
      dimension: 'performance',
      score: 60,
      findings: [
        {
          ruleId: 'PERF001',
          severity: 'critical',
          message: 'N+1 query detected',
          file: '/tmp/test-project/src/index.ts',
          line: 5,
          recommendation: 'Use a batch query',
        },
      ],
    },
    { dimension: 'architecture', score: 95, findings: [] },
  ],
  overall: {
    weighted: 77,
    grade: 'C',
    breakdown: [
      { dimension: 'performance', score: 60, weight: 0.25 },
      { dimension: 'architecture', score: 95, weight: 0.25 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderHtml', () => {
  it('returns a non-empty string', () => {
    expect(renderHtml(MOCK_RESULT).length).toBeGreaterThan(0);
  });

  it('begins with a DOCTYPE declaration', () => {
    const output = renderHtml(MOCK_RESULT);
    expect(output.trim().startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('contains the project root (HTML-escaped)', () => {
    const output = renderHtml(MOCK_RESULT);
    expect(output).toContain('/tmp/test-project');
  });

  it('contains the overall score', () => {
    const output = renderHtml(MOCK_RESULT);
    expect(output).toContain('77.0');
  });

  it('contains the grade', () => {
    expect(renderHtml(MOCK_RESULT)).toContain('>C<');
  });

  it('contains the dimension name', () => {
    expect(renderHtml(MOCK_RESULT)).toContain('Performance');
  });

  it('contains the finding rule ID', () => {
    expect(renderHtml(MOCK_RESULT)).toContain('PERF001');
  });

  it('HTML-escapes finding message to prevent XSS', () => {
    const xssResult: AuditResult = {
      ...MOCK_RESULT,
      dimensions: [
        {
          dimension: 'performance',
          score: 80,
          findings: [
            {
              ruleId: 'PERF001',
              severity: 'high',
              message: '<script>alert(1)</script>',
              file: '/tmp/file.ts',
              recommendation: 'fix it',
            },
          ],
        },
      ],
    };
    const output = renderHtml(xssResult);
    expect(output).not.toContain('<script>alert(1)</script>');
    expect(output).toContain('&lt;script&gt;');
  });

  it('includes inline CSS', () => {
    expect(renderHtml(MOCK_RESULT)).toContain('<style>');
  });

  it('contains finding severity badge', () => {
    expect(renderHtml(MOCK_RESULT)).toContain('critical');
  });
});
