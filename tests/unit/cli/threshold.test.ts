import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProgram } from '../../../src/cli/index.ts';
import { logger } from '../../../src/logger.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseAsync(args: string[]): Promise<void> {
  await buildProgram().parseAsync(['node', 'zaria', ...args]);
}

// ---------------------------------------------------------------------------
// Phase 13 — CI/CD quality-gate tests
// ---------------------------------------------------------------------------

describe('Phase 13 — CI quality gates', () => {
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    // Reset process.exitCode before each test.
    process.exitCode = 0;
  });

  afterEach(() => {
    loggerInfoSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    stdoutSpy.mockRestore();
    // Clean up exitCode so it doesn't affect other test suites.
    process.exitCode = 0;
  });

  // -------------------------------------------------------------------------
  // 13.1 — Overall threshold
  // -------------------------------------------------------------------------

  it('13.1: sets exitCode 1 when overall score is below --threshold', async () => {
    // Audit /tmp (empty dir → score 100), but set an unreachably high threshold.
    // To force a low score we'd need a real bad project; instead we verify that
    // a threshold of 101 (above any possible score) always triggers the gate.
    await parseAsync(['audit', '/tmp', '--threshold', '101']);
    expect(process.exitCode).toBe(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('is below threshold'));
  });

  it('13.1: does NOT set exitCode 1 when overall score meets --threshold', async () => {
    // /tmp is clean → score 100; threshold = 0 is always satisfied.
    await parseAsync(['audit', '/tmp', '--threshold', '0']);
    expect(process.exitCode).not.toBe(1);
  });

  it('13.1: no exit code change when --threshold is not provided', async () => {
    await parseAsync(['audit', '/tmp']);
    // No threshold → exitCode stays at the default (0 or undefined).
    expect(process.exitCode).not.toBe(1);
  });

  // -------------------------------------------------------------------------
  // 13.2 — Per-dimension threshold
  // -------------------------------------------------------------------------

  it('13.2: sets exitCode 1 when a dimension score is below its per-dimension threshold', async () => {
    // /tmp is clean → every dimension scores 100.
    // Set threshold of 101 for performance → must fail.
    await parseAsync(['audit', '/tmp', '--dim-threshold', 'performance=101']);
    expect(process.exitCode).toBe(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Dimension 'performance'"));
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('below threshold'));
  });

  it('13.2: does NOT set exitCode 1 when all dimension scores meet their thresholds', async () => {
    await parseAsync(['audit', '/tmp', '--dim-threshold', 'performance=0,architecture=0']);
    expect(process.exitCode).not.toBe(1);
  });

  it('13.2: handles multiple dim-threshold pairs correctly', async () => {
    // One impossible (performance=101) and one easy (architecture=0).
    await parseAsync(['audit', '/tmp', '--dim-threshold', 'performance=101,architecture=0']);
    expect(process.exitCode).toBe(1);
    // Only the failing dimension is warned about.
    const warnCalls = loggerWarnSpy.mock.calls.flat().join(' ');
    expect(warnCalls).toContain('performance');
  });

  it('13.2: ignores unknown dimension names in --dim-threshold gracefully', async () => {
    // 'unknown-dim' doesn't exist in results → no finding, no fail.
    await parseAsync(['audit', '/tmp', '--dim-threshold', 'unknown-dim=50']);
    expect(process.exitCode).not.toBe(1);
  });

  // -------------------------------------------------------------------------
  // audit:eff sub-command (Phase 13 — wires efficiency scorer)
  // -------------------------------------------------------------------------

  it('audit:eff: runs the efficiency audit on an explicit path', async () => {
    await parseAsync(['audit:eff', '/tmp']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp…');
  });
});
