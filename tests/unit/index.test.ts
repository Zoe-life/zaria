import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VERSION, run } from '../../src/index.ts';
import { logger } from '../../src/logger.ts';

describe('Zaria entry point', () => {
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
  });

  afterEach(() => {
    loggerInfoSpy.mockRestore();
  });

  it('should export the correct version string', () => {
    expect(VERSION).toBe('0.0.1');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should invoke the audit command without throwing', () => {
    expect(() => run(['node', 'zaria', 'audit', '/tmp'])).not.toThrow();
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp…');
  });
});
