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

  // Regression: TypeScript inline object type literals in parameter annotations
  // must not be mistaken for the function body opener.
  it('extracts arrow function body when params contain an inline object type literal', () => {
    // The `{ dir?: string }` in the param annotation is NOT the body opener.
    // Without the fix, the extractor would enter the body at the type-literal `{`
    // and immediately close it at the matching `}`, producing 0 captured bodies.
    const content = ['.action(async (opts: { dir?: string }) => {', '  doSomething();', '})'].join(
      '\n',
    );
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('doSomething');
  });

  it('extracts function declaration body when params contain an inline object type literal', () => {
    // The `{ dir?: string }` in the param annotation is NOT the body opener.
    // Without the fix, depth tracking would start inside the type literal and
    // the body would appear to close prematurely at its `}`.
    const content = ['function f(opts: { dir?: string }) {', '  doSomething();', '}'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('doSomething');
  });

  // Regression: `=>` tokens inside parameter lists (e.g. callback type annotations
  // or default arrow params) must not enable the arrow-mode body-opener logic while
  // the outer parameter list is still open.
  it('extracts arrow function body when a param type contains an arrow-returning object literal type', () => {
    // `() => { x: number }` in the type annotation introduces `=>` and `{` while
    // `pendingParenDepth > 0`.  Without the fix, `sawArrow` would be set early and
    // the `{` of the object type would be mistaken for the body opener.
    const content = ['const fn = (a: () => { x: number }) => {', '  return a();', '};'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('return a()');
  });

  it('extracts function declaration body when a param has a default arrow with brace-enclosed return', () => {
    // `a = () => ({ value: 1 })` in the default parameter introduces `=>` and `(`
    // while `pendingParenDepth > 0`.  The `{` of the default value expression must
    // not be treated as the body opener.
    const content = ['function foo(a = () => ({ value: 1 })) {', '  return a;', '}'].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('return a');
  });

  it('extracts all function bodies when functions have callback-typed params with object return types', () => {
    // Two consecutive functions — each with `=>` inside their parameter lists —
    // must both be captured correctly with no body merging.
    const content = [
      'function first(cb: () => { ok: boolean }) {',
      '  doFirst();',
      '}',
      'function second(cb: () => { ok: boolean }) {',
      '  doSecond();',
      '}',
    ].join('\n');
    const bodies = extractFunctionBodies(content);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toContain('doFirst');
    expect(bodies[1]).toContain('doSecond');
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
