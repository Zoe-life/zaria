import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { parseNonTsFiles } from '../../../src/audit/lang-parser.ts';
import { parseFiles } from '../../../src/audit/parser.ts';
import { traverseFiles } from '../../../src/audit/traversal.ts';

const MULTILANG = resolve(import.meta.dirname, '../../fixtures/sample-multilang-app');

describe('parseNonTsFiles — language-specific parsing', () => {
  it('returns empty array for empty input', () => {
    expect(parseNonTsFiles([])).toEqual([]);
  });

  it('parses Python fixture and extracts LOC + functions + classes + imports', () => {
    const pyFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'python');
    const parsed = parseNonTsFiles(pyFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(4); // load_file, write_file, fetch_data, main + class methods
    expect(p.classCount).toBeGreaterThanOrEqual(1); // DataProcessor
    expect(p.imports.length).toBeGreaterThan(0); // os, sys, pathlib, collections
  });

  it('parses Go fixture and extracts LOC + functions + structs', () => {
    const goFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'go');
    const parsed = parseNonTsFiles(goFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(3); // NewTrimProcessor, Process, loadFile, writeFile, main
    expect(p.classCount).toBeGreaterThanOrEqual(1); // Record struct + Processor interface + TrimProcessor struct
    expect(p.imports.some((e) => e.to === 'fmt')).toBe(true);
  });

  it('parses Rust fixture and extracts LOC + functions + structs/traits', () => {
    const rsFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'rust');
    const parsed = parseNonTsFiles(rsFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(3); // new, process, load_file, write_file, count_words, main
    expect(p.classCount).toBeGreaterThanOrEqual(1); // struct Record + trait Processor + struct TrimProcessor + impl
    expect(p.imports.some((e) => e.to.startsWith('std::'))).toBe(true);
  });

  it('parses Java fixture and extracts LOC + methods + classes', () => {
    const javaFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'java');
    const parsed = parseNonTsFiles(javaFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(3); // constructor + methods
    expect(p.classCount).toBeGreaterThanOrEqual(2); // Record + DataProcessor
    expect(p.imports.some((e) => e.to.startsWith('java.'))).toBe(true);
  });

  it('parses C fixture and extracts LOC + functions + structs', () => {
    const cFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'c');
    const parsed = parseNonTsFiles(cFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(2); // add_record, trim_names, load_file, main
    expect(p.classCount).toBeGreaterThanOrEqual(1); // Record struct
    expect(p.imports.some((e) => e.to === 'stdio.h')).toBe(true);
  });

  it('parses C++ fixture and extracts LOC + methods + classes', () => {
    const cppFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'cpp');
    const parsed = parseNonTsFiles(cppFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(1);
    expect(p.classCount).toBeGreaterThanOrEqual(1); // DataProcessor class
    expect(p.imports.some((e) => e.to === 'iostream')).toBe(true);
  });

  it('parses C# fixture and extracts LOC + methods + classes', () => {
    const csFiles = traverseFiles(MULTILANG).filter((f) => f.language === 'csharp');
    const parsed = parseNonTsFiles(csFiles);
    expect(parsed.length).toBe(1);
    const p = parsed[0];
    expect(p.loc).toBeGreaterThan(0);
    expect(p.functionCount).toBeGreaterThanOrEqual(3); // Process, LoadFile, WriteFile, LoadFileAsync, Main
    expect(p.classCount).toBeGreaterThanOrEqual(2); // TrimProcessor, FileHelper, DataProcessor + interface/record
    expect(p.imports.some((e) => e.to === 'System')).toBe(true);
  });

  it('exportCount is always 0 for non-TS/JS languages', () => {
    const files = traverseFiles(MULTILANG);
    const parsed = parseNonTsFiles(files);
    for (const p of parsed) {
      expect(p.exportCount).toBe(0);
    }
  });
});

describe('parseFiles — unified pipeline with mixed languages', () => {
  it('parses all files in the multilang fixture including TS/JS fallback', () => {
    const files = traverseFiles(MULTILANG);
    const parsed = parseFiles(files);
    // All 7 fixture files should be parsed
    expect(parsed.length).toBe(7);
  });

  it('returns empty array for empty input', () => {
    expect(parseFiles([])).toEqual([]);
  });

  it('content field is populated for all parsed files', () => {
    const files = traverseFiles(MULTILANG);
    const parsed = parseFiles(files);
    for (const p of parsed) {
      expect(typeof p.content).toBe('string');
      expect(p.content.length).toBeGreaterThan(0);
    }
  });
});
