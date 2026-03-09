import { describe, it, expect } from 'vitest';
import { extractFunctionBodies, FUNCTION_START } from '../../../../src/audit/integrity/utils.ts';

describe('extractFunctionBodies', () => {
  it('extracts a simple named function body', () => {
    const content = ['function greet(name) {', '  return `Hello, ${name}!`;', '}'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('greet');
    expect(bodies[0]).toContain('Hello');
  });

  it('extracts a block-bodied arrow function assigned to a const', () => {
    const content = ['const double = (x) => {', '  return x * 2;', '};'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('double');
  });

  it('extracts an async named function body', () => {
    const content = ['async function fetch() {', '  return await getData();', '}'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('fetch');
  });

  it('extracts multiple block-bodied functions from the same file', () => {
    const content = [
      'function a() {',
      '  return 1;',
      '}',
      'function b() {',
      '  return 2;',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(2);
  });

  it('handles multi-line function signatures (opening brace on a later line)', () => {
    const content = [
      'async function processData(',
      '  items: string[],',
      ') {',
      '  return items.length;',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('processData');
    expect(bodies[0]).toContain('items.length');
  });

  // Regression: expression-bodied arrows must NOT corrupt subsequent function bodies
  it('skips expression-bodied arrow functions (no block brace)', () => {
    const content = [
      'const double = (x) => x * 2;',
      '',
      'function main() {',
      '  return double(5);',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    // `double` is expression-bodied — only `main` should be captured
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('main');
    expect(bodies[0]).not.toContain('x * 2');
  });

  it('does not merge unrelated code when expression arrow precedes a block function', () => {
    // Regression: without the pendingFunction fix the extractor set inFunction=true
    // on the expression arrow line (depth=0), then the first `}` it found (from
    // `main`'s closing brace) would terminate the "body", producing a merged blob
    // that starts at the arrow line and ends at main's closing brace.
    const content = [
      'const noop = () => undefined;',
      'function main() {',
      '  doSomething();',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toContain('noop');
    expect(bodies[0]).toContain('doSomething');
  });

  it('correctly captures nested braces inside a function body', () => {
    const content = [
      'function outer() {',
      '  const obj = { a: 1, b: 2 };',
      '  if (obj.a) {',
      '    return obj.b;',
      '  }',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('obj.a');
    expect(bodies[0]).toContain('obj.b');
  });
});

describe('FUNCTION_START regex', () => {
  it('matches a named function declaration', () => {
    expect(FUNCTION_START.test('function foo(a, b) {')).toBe(true);
  });

  it('matches an async named function', () => {
    expect(FUNCTION_START.test('async function bar() {')).toBe(true);
  });

  it('matches a const arrow assignment', () => {
    expect(FUNCTION_START.test('const fn = (x) => {')).toBe(true);
  });

  it('matches a const async arrow assignment', () => {
    expect(FUNCTION_START.test('const fn = async (x) => {')).toBe(true);
  });

  it('matches a standalone arrow expression (no brace)', () => {
    // The regex matches — the extractor's pendingFunction logic handles skipping
    expect(FUNCTION_START.test('(a, b) => a + b')).toBe(true);
  });
});
