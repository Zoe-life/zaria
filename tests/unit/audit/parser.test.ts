import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../src/audit/traversal.ts';
import { parseFiles } from '../../../src/audit/parser.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../fixtures/clean-app');

describe('parseFiles', () => {
  it('returns an empty array for empty input', () => {
    const result = parseFiles([]);
    expect(result).toEqual([]);
  });

  it('parses all TS files in sample-ts-app', () => {
    const sourceFiles = traverseFiles(SAMPLE_TS_APP);
    const parsed = parseFiles(sourceFiles);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('extracts positive LOC for non-empty files', () => {
    const sourceFiles = traverseFiles(CLEAN_APP);
    const parsed = parseFiles(sourceFiles);
    for (const p of parsed) {
      expect(p.loc).toBeGreaterThan(0);
    }
  });

  it('extracts function count from clean-app/index.ts', () => {
    const sourceFiles = traverseFiles(CLEAN_APP);
    const parsed = parseFiles(sourceFiles);
    const indexFile = parsed.find((p) => p.sourceFile.path.endsWith('index.ts'));
    expect(indexFile).toBeDefined();
    // greet + readConfig + processItems
    expect(indexFile!.functionCount).toBeGreaterThanOrEqual(3);
  });

  it('extracts import edges from files that have imports', () => {
    const sourceFiles = traverseFiles(SAMPLE_TS_APP);
    const parsed = parseFiles(sourceFiles);
    const fileWithImports = parsed.find((p) => p.imports.length > 0);
    expect(fileWithImports).toBeDefined();
  });

  it('detects imports in circular-a.ts pointing to circular-b.ts', () => {
    const sourceFiles = traverseFiles(SAMPLE_TS_APP);
    const parsed = parseFiles(sourceFiles);
    const circA = parsed.find((p) => p.sourceFile.path.endsWith('circular-a.ts'));
    expect(circA).toBeDefined();
    expect(circA!.imports.some((e) => e.to.includes('circular-b'))).toBe(true);
  });

  it('populates content field', () => {
    const sourceFiles = traverseFiles(CLEAN_APP);
    const parsed = parseFiles(sourceFiles);
    for (const p of parsed) {
      expect(typeof p.content).toBe('string');
      expect(p.content.length).toBeGreaterThan(0);
    }
  });

  it('counts exports in routes.ts (has multiple named exports)', () => {
    const sourceFiles = traverseFiles(SAMPLE_TS_APP);
    const parsed = parseFiles(sourceFiles);
    const routes = parsed.find((p) => p.sourceFile.path.endsWith('routes.ts'));
    expect(routes).toBeDefined();
    expect(routes!.exportCount).toBeGreaterThanOrEqual(2);
  });
});
