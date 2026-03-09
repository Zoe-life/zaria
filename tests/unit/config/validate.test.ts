import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  formatValidationResult,
  KNOWN_RULE_IDS,
} from '../../../src/config/validate.ts';

describe('validateConfig', () => {
  // ---------------------------------------------------------------------------
  // Valid configs
  // ---------------------------------------------------------------------------

  it('returns valid for a minimal config', () => {
    const result = validateConfig({ version: 1 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for a full well-formed config', () => {
    const result = validateConfig({
      version: 1,
      project: { name: 'My App', type: 'web', language: 'typescript' },
      audit: {
        dimensions: ['performance', 'architecture'],
        thresholds: { overall: 80 },
      },
      ignore: { paths: ['node_modules'], rules: ['PERF001'] },
      plugins: [],
      sre: { enabled: false },
      output: { format: 'json', colors: false, detail: 'verbose' },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for a cli project type', () => {
    const result = validateConfig({ version: 1, project: { type: 'cli' } });
    expect(result.valid).toBe(true);
  });

  it('returns valid for a mobile project type', () => {
    const result = validateConfig({ version: 1, project: { type: 'mobile' } });
    expect(result.valid).toBe(true);
  });

  it('returns valid for a desktop project type', () => {
    const result = validateConfig({ version: 1, project: { type: 'desktop' } });
    expect(result.valid).toBe(true);
  });

  it('returns valid for a library project type', () => {
    const result = validateConfig({ version: 1, project: { type: 'library' } });
    expect(result.valid).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Structural validation errors (caught by Zod)
  // ---------------------------------------------------------------------------

  it('returns error for wrong version', () => {
    const result = validateConfig({ version: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]!.path).toContain('version');
  });

  it('returns error for invalid project type', () => {
    const result = validateConfig({ version: 1, project: { type: 'invalid-type' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('type'))).toBe(true);
  });

  it('returns error for threshold below 0', () => {
    const result = validateConfig({ version: 1, audit: { thresholds: { overall: -5 } } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('overall'))).toBe(true);
  });

  it('returns error for threshold above 100', () => {
    const result = validateConfig({ version: 1, audit: { thresholds: { performance: 105 } } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('performance'))).toBe(true);
  });

  it('returns error for invalid output format', () => {
    const result = validateConfig({ version: 1, output: { format: 'pdf' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('format'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Semantic validation errors (ignore.rules, empty dimensions)
  // ---------------------------------------------------------------------------

  it('returns error for unknown rule IDs in ignore.rules', () => {
    const result = validateConfig({
      version: 1,
      ignore: { rules: ['NONEXISTENT_RULE'] },
    });
    expect(result.valid).toBe(false);
    const ruleError = result.errors.find((e) => e.path === 'ignore.rules');
    expect(ruleError).toBeDefined();
    expect(ruleError!.message).toContain('NONEXISTENT_RULE');
  });

  it('returns error for empty audit.dimensions array', () => {
    const result = validateConfig({ version: 1, audit: { dimensions: [] } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'audit.dimensions')).toBe(true);
  });

  it('accepts all known rule IDs in ignore.rules', () => {
    const result = validateConfig({
      version: 1,
      ignore: { rules: [...KNOWN_RULE_IDS] },
    });
    expect(result.valid).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // formatValidationResult
  // ---------------------------------------------------------------------------

  it('formats a valid result with a green checkmark', () => {
    const output = formatValidationResult({ valid: true, errors: [] }, '/path/.zariarc.yml');
    expect(output).toContain('✅');
    expect(output).toContain('/path/.zariarc.yml');
  });

  it('formats an invalid result listing all errors', () => {
    const output = formatValidationResult(
      {
        valid: false,
        errors: [
          { path: 'version', message: 'Invalid literal value, expected 1' },
          { path: 'ignore.rules', message: 'Unknown rule ID "FOO"' },
        ],
      },
      '/path/.zariarc.yml',
    );
    expect(output).toContain('❌');
    expect(output).toContain('version');
    expect(output).toContain('ignore.rules');
    expect(output).toContain('2 error');
  });
});
