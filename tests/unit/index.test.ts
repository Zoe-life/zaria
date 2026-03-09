import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VERSION, run } from '../../src/index.js';

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

  it('should log "Zaria v<version>" when run() is called', () => {
    run();
    expect(consoleLogSpy).toHaveBeenCalledOnce();
    expect(consoleLogSpy).toHaveBeenCalledWith(`Zaria v${VERSION}`);
  });
});
