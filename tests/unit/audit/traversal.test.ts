import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../src/audit/traversal.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../fixtures/clean-app');

describe('traverseFiles', () => {
  it('returns SourceFile objects for all TS files in a directory', () => {
    const files = traverseFiles(SAMPLE_TS_APP);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.language === 'typescript')).toBe(true);
  });

  it('populates path, size, and lastModified for each file', () => {
    const files = traverseFiles(CLEAN_APP);
    for (const f of files) {
      expect(f.path).toMatch(/\.ts$/);
      expect(f.size).toBeGreaterThan(0);
      expect(f.lastModified).toBeInstanceOf(Date);
    }
  });

  it('includes all expected files in sample-ts-app', () => {
    const files = traverseFiles(SAMPLE_TS_APP);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('index.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('routes.ts'))).toBe(true);
  });

  it('respects ignorePaths — skips specified directories', () => {
    // Create a subdirectory name to ignore by simulating the pattern
    const files = traverseFiles(SAMPLE_TS_APP, ['models']);
    const paths = files.map((f) => f.path);
    // model files should be excluded
    expect(paths.every((p) => !p.includes('/models/'))).toBe(true);
  });

  it('returns an empty array for a non-existent directory', () => {
    const files = traverseFiles('/tmp/__nonexistent_dir__');
    expect(files).toEqual([]);
  });

  it('only returns TypeScript and JavaScript files', () => {
    const files = traverseFiles(SAMPLE_TS_APP);
    for (const f of files) {
      expect(['typescript', 'javascript']).toContain(f.language);
    }
  });

  it('correctly identifies TypeScript files', () => {
    const files = traverseFiles(CLEAN_APP);
    expect(files.some((f) => f.language === 'typescript')).toBe(true);
  });
});
