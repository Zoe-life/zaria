import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VERSION, run } from '../../src/index.ts';

describe('Zaria entry point', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should export the correct version string', () => {
    expect(VERSION).toBe('0.0.1');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should invoke the audit command without throwing', () => {
    expect(() => run(['node', 'zaria', 'audit', '/tmp'])).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalledWith('Running full audit on /tmp…');
  });
});
