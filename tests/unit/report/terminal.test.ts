import { describe, it, expect } from 'vitest';
import { renderTerminal } from '../../../src/report/terminal.ts';
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
      score: 75,
      findings: [
        {
          ruleId: 'PERF001',
          severity: 'high',
          message: 'N+1 query detected',
          file: '/tmp/test-project/src/index.ts',
          line: 10,
          recommendation: 'Use batch queries',
        },
        {
          ruleId: 'PERF002',
          severity: 'critical',
          message: 'Blocking call in event loop',
          file: '/tmp/test-project/src/service.ts',
          recommendation: 'Use async alternative',
        },
      ],
    },
    { dimension: 'architecture', score: 90, findings: [] },
    { dimension: 'scalability', score: 80, findings: [] },
    { dimension: 'integrity', score: 95, findings: [] },
    { dimension: 'maintenance', score: 60, findings: [] },
  ],
  overall: {
    weighted: 80,
    grade: 'B',
    breakdown: [
      { dimension: 'performance', score: 75, weight: 0.25 },
      { dimension: 'architecture', score: 90, weight: 0.25 },
      { dimension: 'scalability', score: 80, weight: 0.2 },
      { dimension: 'integrity', score: 95, weight: 0.2 },
      { dimension: 'maintenance', score: 60, weight: 0.1 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderTerminal', () => {
  it('returns a non-empty string', () => {
    const output = renderTerminal(MOCK_RESULT);
    expect(output.length).toBeGreaterThan(0);
  });

  it('contains the project root path', () => {
    const output = renderTerminal(MOCK_RESULT);
    expect(output).toContain('/tmp/test-project');
  });

  it('contains the overall score', () => {
    const output = renderTerminal(MOCK_RESULT);
    expect(output).toContain('80');
  });

  it('contains the grade', () => {
    const output = renderTerminal(MOCK_RESULT);
    expect(output).toContain('B');
  });

  it('shows dimension names in breakdown', () => {
    const output = renderTerminal(MOCK_RESULT);
    expect(output).toContain('Performance');
  });

  it('shows finding counts in summary', () => {
    const output = renderTerminal(MOCK_RESULT);
    // 1 critical + 1 high
    expect(output).toContain('Critical: 1');
    expect(output).toContain('High: 1');
  });

  it('does not include finding details by default (non-verbose)', () => {
    const output = renderTerminal(MOCK_RESULT, false);
    expect(output).not.toContain('N+1 query detected');
  });

  it('includes finding details in verbose mode', () => {
    const output = renderTerminal(MOCK_RESULT, true);
    expect(output).toContain('N+1 query detected');
    expect(output).toContain('PERF001');
  });

  it('verbose output sorts critical findings first', () => {
    const output = renderTerminal(MOCK_RESULT, true);
    const critIdx = output.indexOf('PERF002'); // critical
    const highIdx = output.indexOf('PERF001'); // high
    expect(critIdx).toBeLessThan(highIdx);
  });

  it('handles zero findings gracefully', () => {
    const clean: AuditResult = {
      ...MOCK_RESULT,
      dimensions: MOCK_RESULT.dimensions.map((d) => ({ ...d, findings: [] })),
    };
    const output = renderTerminal(clean);
    // "Total:" is wrapped in ANSI dim codes, so check the numeric part separately
    expect(output).toContain('0 findings');
  });
});
