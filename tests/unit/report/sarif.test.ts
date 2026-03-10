import { describe, it, expect } from 'vitest';
import { renderSarif } from '../../../src/report/sarif.ts';
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
      score: 70,
      findings: [
        {
          ruleId: 'PERF001',
          severity: 'high',
          message: 'N+1 query detected',
          file: '/tmp/test-project/src/index.ts',
          line: 15,
          column: 3,
          recommendation: 'Use a batch query',
        },
        {
          ruleId: 'PERF001',
          severity: 'high',
          message: 'N+1 query detected',
          file: '/tmp/test-project/src/other.ts',
          line: 7,
          recommendation: 'Use a batch query',
        },
      ],
    },
    {
      dimension: 'architecture',
      score: 90,
      findings: [
        {
          ruleId: 'ARCH001',
          severity: 'critical',
          message: 'Circular dependency detected',
          file: '/tmp/test-project/src/a.ts',
          recommendation: 'Break the cycle',
        },
      ],
    },
  ],
  overall: { weighted: 80, grade: 'B', breakdown: [] },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('renderSarif', () => {
  it('returns valid JSON', () => {
    const output = renderSarif(MOCK_RESULT);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('has SARIF 2.1.0 schema reference', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    expect(parsed.$schema).toContain('sarif-2.1.0');
  });

  it('has version "2.1.0"', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    expect(parsed.version).toBe('2.1.0');
  });

  it('contains exactly one run', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    expect(parsed.runs).toHaveLength(1);
  });

  it('driver name is "Zaria"', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    expect(parsed.runs[0].tool.driver.name).toBe('Zaria');
  });

  it('results count equals total findings', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    expect(parsed.runs[0].results).toHaveLength(3); // 2 PERF + 1 ARCH
  });

  it('deduplicates rules (PERF001 appears twice in findings but once in rules)', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    const ruleIds = parsed.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    expect(ruleIds.filter((id: string) => id === 'PERF001')).toHaveLength(1);
  });

  it('maps critical severity to SARIF level "error"', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    const archResult = parsed.runs[0].results.find(
      (r: { ruleId: string }) => r.ruleId === 'ARCH001',
    );
    expect(archResult.level).toBe('error');
  });

  it('maps high severity to SARIF level "warning"', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    const perfResult = parsed.runs[0].results.find(
      (r: { ruleId: string }) => r.ruleId === 'PERF001',
    );
    expect(perfResult.level).toBe('warning');
  });

  it('encodes file paths as file:// URIs', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    const loc = parsed.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(loc).toMatch(/^file:\/\//);
  });

  it('includes line and column when present', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    const first = parsed.runs[0].results[0];
    expect(first.locations[0].physicalLocation.region.startLine).toBe(15);
    expect(first.locations[0].physicalLocation.region.startColumn).toBe(3);
  });

  it('omits region when line is absent', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT));
    // ARCH001 finding has no line number
    const archResult = parsed.runs[0].results.find(
      (r: { ruleId: string }) => r.ruleId === 'ARCH001',
    );
    expect(archResult.locations[0].physicalLocation.region).toBeUndefined();
  });

  it('respects custom version parameter', () => {
    const parsed = JSON.parse(renderSarif(MOCK_RESULT, '1.2.3'));
    expect(parsed.runs[0].tool.driver.version).toBe('1.2.3');
  });

  it('handles empty findings', () => {
    const empty: AuditResult = { ...MOCK_RESULT, dimensions: [] };
    const parsed = JSON.parse(renderSarif(empty));
    expect(parsed.runs[0].results).toHaveLength(0);
    expect(parsed.runs[0].tool.driver.rules).toHaveLength(0);
  });
});
