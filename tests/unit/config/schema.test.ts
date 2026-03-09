import { describe, it, expect } from 'vitest';
import { ZariaConfigSchema } from '../../../src/config/schema.ts';

describe('ZariaConfigSchema', () => {
  // ---------------------------------------------------------------------------
  // Valid configs
  // ---------------------------------------------------------------------------

  it('accepts a minimal valid config (version only)', () => {
    const result = ZariaConfigSchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts a full valid config', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      project: { name: 'My App', type: 'web', language: 'typescript' },
      audit: {
        dimensions: ['performance', 'architecture'],
        thresholds: { overall: 75, performance: 70 },
      },
      ignore: { paths: ['node_modules'], rules: [] },
      plugins: [],
      sre: { enabled: false },
      output: { format: 'terminal', colors: true, detail: 'standard' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts all supported project types', () => {
    for (const type of ['web', 'mobile', 'desktop', 'cli', 'library']) {
      const result = ZariaConfigSchema.safeParse({ version: 1, project: { type } });
      expect(result.success, `type "${type}" should be valid`).toBe(true);
    }
  });

  it('accepts all supported project languages', () => {
    for (const language of ['typescript', 'javascript', 'python', 'go', 'rust', 'java']) {
      const result = ZariaConfigSchema.safeParse({ version: 1, project: { language } });
      expect(result.success, `language "${language}" should be valid`).toBe(true);
    }
  });

  it('accepts all audit dimensions', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      audit: {
        dimensions: ['performance', 'architecture', 'scalability', 'integrity', 'maintenance'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts all output formats', () => {
    for (const format of ['terminal', 'json', 'html', 'markdown', 'sarif']) {
      const result = ZariaConfigSchema.safeParse({ version: 1, output: { format } });
      expect(result.success, `format "${format}" should be valid`).toBe(true);
    }
  });

  it('accepts all output detail levels', () => {
    for (const detail of ['minimal', 'standard', 'verbose']) {
      const result = ZariaConfigSchema.safeParse({ version: 1, output: { detail } });
      expect(result.success, `detail "${detail}" should be valid`).toBe(true);
    }
  });

  it('accepts SRE provider with bearer auth', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      sre: {
        enabled: true,
        providers: [
          {
            type: 'prometheus',
            url: 'https://prom.example.com',
            auth: { type: 'bearer', token: 'tok' },
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Invalid configs
  // ---------------------------------------------------------------------------

  it('rejects a config with wrong version', () => {
    const result = ZariaConfigSchema.safeParse({ version: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a config with missing version', () => {
    const result = ZariaConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an invalid project type', () => {
    const result = ZariaConfigSchema.safeParse({ version: 1, project: { type: 'backend' } });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid project language', () => {
    const result = ZariaConfigSchema.safeParse({ version: 1, project: { language: 'cobol' } });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold below 0', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      audit: { thresholds: { overall: -1 } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold above 100', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      audit: { thresholds: { performance: 101 } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid output format', () => {
    const result = ZariaConfigSchema.safeParse({ version: 1, output: { format: 'xml' } });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid audit dimension', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      audit: { dimensions: ['performance', 'unknown-dimension'] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an SRE provider URL that is not a valid URL', () => {
    const result = ZariaConfigSchema.safeParse({
      version: 1,
      sre: { enabled: true, providers: [{ type: 'prometheus', url: 'not-a-url' }] },
    });
    expect(result.success).toBe(false);
  });
});
