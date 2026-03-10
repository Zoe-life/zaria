import { describe, it, expect } from 'vitest';
import { renderJson } from '../../../src/report/json.ts';
import type { AuditResult } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RESULT: AuditResult = {
  projectRoot: '/tmp/test-project',
  timestamp: '2026-01-01T00:00:00.000Z',
  dimensions: [
    {
      dimension: 'performance',
      score: 80,
      findings: [
        {
          ruleId: 'PERF001',
          severity: 'high',
          message: 'N+1 query detected',
          file: '/tmp/test-project/src/index.ts',
          line: 42,
          recommendation: 'Use a batch query instead',
        },
      ],
    },
    { dimension: 'architecture', score: 90, findings: [] },
  ],
  overall: {
    weighted: 85,
    grade: 'B',
    breakdown: [
      { dimension: 'performance', score: 80, weight: 0.25 },
      { dimension: 'architecture', score: 90, weight: 0.25 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderJson', () => {
  it('returns a valid JSON string', () => {
    const output = renderJson(MOCK_RESULT);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('parsed output has projectRoot', () => {
    const parsed = JSON.parse(renderJson(MOCK_RESULT)) as AuditResult;
    expect(parsed.projectRoot).toBe('/tmp/test-project');
  });

  it('parsed output has timestamp', () => {
    const parsed = JSON.parse(renderJson(MOCK_RESULT)) as AuditResult;
    expect(parsed.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('parsed output has overall score', () => {
    const parsed = JSON.parse(renderJson(MOCK_RESULT)) as AuditResult;
    expect(parsed.overall.weighted).toBe(85);
    expect(parsed.overall.grade).toBe('B');
  });

  it('parsed output contains dimension findings', () => {
    const parsed = JSON.parse(renderJson(MOCK_RESULT)) as AuditResult;
    const perf = parsed.dimensions.find((d) => d.dimension === 'performance');
    expect(perf).toBeDefined();
    expect(perf!.findings).toHaveLength(1);
    expect(perf!.findings[0].ruleId).toBe('PERF001');
  });

  it('respects spaces parameter (compact)', () => {
    const compact = renderJson(MOCK_RESULT, 0);
    expect(compact).not.toContain('\n');
  });

  it('default output is pretty-printed (spaces=2)', () => {
    const pretty = renderJson(MOCK_RESULT);
    expect(pretty).toContain('\n');
  });

  it('handles empty findings gracefully', () => {
    const result: AuditResult = { ...MOCK_RESULT, dimensions: [] };
    const output = renderJson(result);
    const parsed = JSON.parse(output) as AuditResult;
    expect(parsed.dimensions).toHaveLength(0);
  });
});
