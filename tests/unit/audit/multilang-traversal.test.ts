import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../src/audit/traversal.ts';

const MULTILANG = resolve(import.meta.dirname, '../../fixtures/sample-multilang-app');
const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../fixtures/sample-ts-app');

describe('traverseFiles — multi-language support', () => {
  it('collects Python files with language=python', () => {
    const files = traverseFiles(MULTILANG);
    const py = files.filter((f) => f.language === 'python');
    expect(py.length).toBeGreaterThan(0);
    expect(py.every((f) => f.path.endsWith('.py'))).toBe(true);
  });

  it('collects Go files with language=go', () => {
    const files = traverseFiles(MULTILANG);
    const go = files.filter((f) => f.language === 'go');
    expect(go.length).toBeGreaterThan(0);
    expect(go.every((f) => f.path.endsWith('.go'))).toBe(true);
  });

  it('collects Rust files with language=rust', () => {
    const files = traverseFiles(MULTILANG);
    const rs = files.filter((f) => f.language === 'rust');
    expect(rs.length).toBeGreaterThan(0);
    expect(rs.every((f) => f.path.endsWith('.rs'))).toBe(true);
  });

  it('collects Java files with language=java', () => {
    const files = traverseFiles(MULTILANG);
    const java = files.filter((f) => f.language === 'java');
    expect(java.length).toBeGreaterThan(0);
    expect(java.every((f) => f.path.endsWith('.java'))).toBe(true);
  });

  it('collects C files with language=c', () => {
    const files = traverseFiles(MULTILANG);
    const c = files.filter((f) => f.language === 'c');
    expect(c.length).toBeGreaterThan(0);
    expect(c.every((f) => f.path.endsWith('.c'))).toBe(true);
  });

  it('collects C++ files with language=cpp', () => {
    const files = traverseFiles(MULTILANG);
    const cpp = files.filter((f) => f.language === 'cpp');
    expect(cpp.length).toBeGreaterThan(0);
    expect(cpp.every((f) => f.path.endsWith('.cpp'))).toBe(true);
  });

  it('collects C# files with language=csharp', () => {
    const files = traverseFiles(MULTILANG);
    const cs = files.filter((f) => f.language === 'csharp');
    expect(cs.length).toBeGreaterThan(0);
    expect(cs.every((f) => f.path.endsWith('.cs'))).toBe(true);
  });

  it('returns 7 files total from the multilang fixture', () => {
    const files = traverseFiles(MULTILANG);
    expect(files).toHaveLength(7);
  });

  it('existing TypeScript-only fixture still returns only TS/JS files', () => {
    const files = traverseFiles(SAMPLE_TS_APP);
    for (const f of files) {
      expect(['typescript', 'javascript']).toContain(f.language);
    }
  });
});
