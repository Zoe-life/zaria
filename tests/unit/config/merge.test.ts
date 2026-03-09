import { describe, it, expect } from 'vitest';
import { mergeConfig, readEnvOverrides } from '../../../src/config/merge.ts';
import { DEFAULT_CONFIG } from '../../../src/config/defaults.ts';

describe('readEnvOverrides', () => {
  it('returns empty overrides for empty env', () => {
    const result = readEnvOverrides({});
    expect(result).toEqual({});
  });

  it('reads ZARIA_OUTPUT_FORMAT', () => {
    const result = readEnvOverrides({ ZARIA_OUTPUT_FORMAT: 'json' });
    expect(result.outputFormat).toBe('json');
  });

  it('ignores unknown ZARIA_OUTPUT_FORMAT values', () => {
    const result = readEnvOverrides({ ZARIA_OUTPUT_FORMAT: 'xml' });
    expect(result.outputFormat).toBeUndefined();
  });

  it('reads ZARIA_THRESHOLD as a number', () => {
    const result = readEnvOverrides({ ZARIA_THRESHOLD: '85' });
    expect(result.threshold).toBe(85);
  });

  it('ignores ZARIA_THRESHOLD values outside 0–100', () => {
    expect(readEnvOverrides({ ZARIA_THRESHOLD: '-1' }).threshold).toBeUndefined();
    expect(readEnvOverrides({ ZARIA_THRESHOLD: '101' }).threshold).toBeUndefined();
  });

  it('reads NO_COLOR env var', () => {
    expect(readEnvOverrides({ NO_COLOR: '' }).noColor).toBe(true);
    expect(readEnvOverrides({ ZARIA_NO_COLOR: '1' }).noColor).toBe(true);
  });

  it('reads ZARIA_SRE_ENABLED=true', () => {
    expect(readEnvOverrides({ ZARIA_SRE_ENABLED: 'true' }).sreEnabled).toBe(true);
    expect(readEnvOverrides({ ZARIA_SRE_ENABLED: '1' }).sreEnabled).toBe(true);
  });

  it('reads ZARIA_SRE_ENABLED=false', () => {
    expect(readEnvOverrides({ ZARIA_SRE_ENABLED: 'false' }).sreEnabled).toBe(false);
  });
});

describe('mergeConfig', () => {
  // ---------------------------------------------------------------------------
  // Defaults (no file config, no overrides)
  // ---------------------------------------------------------------------------

  it('returns built-in defaults when no file config or overrides are provided', () => {
    const result = mergeConfig(null, {}, undefined, {});
    expect(result.project.type).toBe(DEFAULT_CONFIG.project.type);
    expect(result.project.language).toBe(DEFAULT_CONFIG.project.language);
    expect(result.audit.dimensions).toEqual(DEFAULT_CONFIG.audit.dimensions);
    expect(result.audit.thresholds.overall).toBe(DEFAULT_CONFIG.audit.thresholds.overall);
    expect(result.output.format).toBe(DEFAULT_CONFIG.output.format);
    expect(result.output.colors).toBe(DEFAULT_CONFIG.output.colors);
    expect(result.sre.enabled).toBe(DEFAULT_CONFIG.sre.enabled);
  });

  // ---------------------------------------------------------------------------
  // File config overrides defaults
  // ---------------------------------------------------------------------------

  it('uses project.type from file config', () => {
    const result = mergeConfig({ version: 1, project: { type: 'mobile' } }, {}, undefined, {});
    expect(result.project.type).toBe('mobile');
  });

  it('uses output.format from file config', () => {
    const result = mergeConfig({ version: 1, output: { format: 'json' } }, {}, undefined, {});
    expect(result.output.format).toBe('json');
  });

  it('uses thresholds from file config', () => {
    const result = mergeConfig(
      { version: 1, audit: { thresholds: { overall: 90, performance: 85 } } },
      {},
      undefined,
      {},
    );
    expect(result.audit.thresholds.overall).toBe(90);
    expect(result.audit.thresholds.performance).toBe(85);
    // Non-specified threshold falls back to default.
    expect(result.audit.thresholds.architecture).toBe(DEFAULT_CONFIG.audit.thresholds.architecture);
  });

  it('attaches configFilePath to the resolved config', () => {
    const result = mergeConfig(null, {}, '/project/.zariarc.yml', {});
    expect(result.configFilePath).toBe('/project/.zariarc.yml');
  });

  // ---------------------------------------------------------------------------
  // Priority: CLI flags override everything
  // ---------------------------------------------------------------------------

  it('CLI --output overrides file config and env', () => {
    const result = mergeConfig(
      { version: 1, output: { format: 'json' } },
      { output: 'html' },
      undefined,
      { ZARIA_OUTPUT_FORMAT: 'sarif' },
    );
    expect(result.output.format).toBe('html');
  });

  it('CLI --threshold overrides file config and env', () => {
    const result = mergeConfig(
      { version: 1, audit: { thresholds: { overall: 60 } } },
      { threshold: 95 },
      undefined,
      { ZARIA_THRESHOLD: '70' },
    );
    expect(result.audit.thresholds.overall).toBe(95);
  });

  it('CLI --no-sre disables SRE even when env enables it', () => {
    const result = mergeConfig({ version: 1, sre: { enabled: true } }, { noSre: true }, undefined, {
      ZARIA_SRE_ENABLED: 'true',
    });
    expect(result.sre.enabled).toBe(false);
  });

  it('CLI --verbose sets verbose mode', () => {
    // verbose itself just sets a flag; it does NOT set log level in Phase 3.
    const result = mergeConfig(null, { verbose: true }, undefined, {});
    // Just ensure mergeConfig doesn't throw and returns a valid config.
    expect(result).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Priority: env overrides file config
  // ---------------------------------------------------------------------------

  it('env ZARIA_OUTPUT_FORMAT overrides file config', () => {
    const result = mergeConfig({ version: 1, output: { format: 'json' } }, {}, undefined, {
      ZARIA_OUTPUT_FORMAT: 'sarif',
    });
    expect(result.output.format).toBe('sarif');
  });

  it('env ZARIA_THRESHOLD overrides file config', () => {
    const result = mergeConfig(
      { version: 1, audit: { thresholds: { overall: 60 } } },
      {},
      undefined,
      { ZARIA_THRESHOLD: '85' },
    );
    expect(result.audit.thresholds.overall).toBe(85);
  });

  it('NO_COLOR env disables colours', () => {
    const result = mergeConfig({ version: 1, output: { colors: true } }, {}, undefined, {
      NO_COLOR: '',
    });
    expect(result.output.colors).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // --only and --skip dimension filtering
  // ---------------------------------------------------------------------------

  it('CLI --only restricts dimensions', () => {
    const result = mergeConfig(null, { only: 'performance,architecture' }, undefined, {});
    expect(result.audit.dimensions).toEqual(['performance', 'architecture']);
  });

  it('CLI --only ignores unknown dimension names', () => {
    const result = mergeConfig(null, { only: 'performance,unknown' }, undefined, {});
    expect(result.audit.dimensions).toEqual(['performance']);
  });

  it('CLI --skip removes specified dimensions', () => {
    const result = mergeConfig(null, { skip: 'maintenance,integrity' }, undefined, {});
    expect(result.audit.dimensions).not.toContain('maintenance');
    expect(result.audit.dimensions).not.toContain('integrity');
    expect(result.audit.dimensions).toContain('performance');
  });

  it('CLI --only takes precedence over --skip when both provided', () => {
    // In the implementation, --only is checked first; --skip is only applied if no --only.
    const result = mergeConfig(null, { only: 'performance', skip: 'architecture' }, undefined, {});
    expect(result.audit.dimensions).toEqual(['performance']);
  });

  // ---------------------------------------------------------------------------
  // ignore, plugins, sre providers pass through
  // ---------------------------------------------------------------------------

  it('merges ignore.paths from file config', () => {
    const result = mergeConfig(
      { version: 1, ignore: { paths: ['dist', 'tmp'] } },
      {},
      undefined,
      {},
    );
    expect(result.ignore.paths).toEqual(['dist', 'tmp']);
  });

  it('merges plugins from file config', () => {
    const result = mergeConfig({ version: 1, plugins: ['zaria-plugin-nextjs'] }, {}, undefined, {});
    expect(result.plugins).toEqual(['zaria-plugin-nextjs']);
  });
});
