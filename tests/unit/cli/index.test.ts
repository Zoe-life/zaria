import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildProgram } from '../../../src/cli/index.ts';
import { logger } from '../../../src/logger.ts';

function parse(args: string[]): void {
  buildProgram().parse(['node', 'zaria', ...args]);
}

async function parseAsync(args: string[]): Promise<void> {
  await buildProgram().parseAsync(['node', 'zaria', ...args]);
}

describe('CLI program', () => {
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    // Commander calls process.exit(0) for --version and --help; prevent actual exit.
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
  });

  afterEach(() => {
    loggerInfoSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  // no args — should show help and exit 0 (no process.exit call)
  it('should display help without exiting when no command is given', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      expect(() => parse([])).not.toThrow();
      expect(writeSpy).toHaveBeenCalled();
    } finally {
      writeSpy.mockRestore();
    }
  });

  // --version
  it('should print version and exit when --version is passed', () => {
    expect(() => parse(['--version'])).toThrow('process.exit called');
  });

  // audit command
  it('audit: default path is cwd', () => {
    parse(['audit']);
    expect(loggerInfoSpy).toHaveBeenCalledWith(expect.stringMatching(/^Analysing .+…$/));
  });

  it('audit: explicit path', () => {
    parse(['audit', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  // audit sub-commands
  it('audit:perf: explicit path', () => {
    parse(['audit:perf', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  it('audit:arch: explicit path', () => {
    parse(['audit:arch', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  it('audit:scale: explicit path', () => {
    parse(['audit:scale', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  it('audit:integrity: explicit path', () => {
    parse(['audit:integrity', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  it('audit:maint: explicit path', () => {
    parse(['audit:maint', '/tmp/project']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Analysing /tmp/project…');
  });

  // report command
  it('report: prints stub message', () => {
    parse(['report']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Generating report from last audit run…');
  });

  // config commands
  it('config init: creates .zariarc.yml and logs success', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaria-cli-test-'));
    try {
      await parseAsync(['config', 'init', '--dir', dir]);
      expect(loggerInfoSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(loggerInfoSpy).toHaveBeenCalledWith(expect.stringContaining('.zariarc.yml'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('config validate: reports no config found when none exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaria-cli-test-'));
    try {
      // Temporarily change cwd so loadConfig searches in the empty temp dir.
      const originalCwd = process.cwd();
      process.chdir(dir);
      try {
        await parseAsync(['config', 'validate']);
        expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No config file found'));
      } finally {
        process.chdir(originalCwd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // sre commands
  it('sre connect: logs startup message', () => {
    parse(['sre', 'connect']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Starting SRE connection wizard…');
  });

  it('sre test: prints configured message', () => {
    parse(['sre', 'test']);
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'No SRE providers configured. Run `zaria sre connect` to set one up.',
    );
  });

  // plugin commands
  it('plugin list: prints stub message', () => {
    parse(['plugin', 'list']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('No plugins installed.');
  });

  it('plugin add: prints stub message with name', () => {
    parse(['plugin', 'add', 'zaria-plugin-nextjs']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Installing plugin zaria-plugin-nextjs…');
  });

  it('plugin remove: prints stub message with name', () => {
    parse(['plugin', 'remove', 'zaria-plugin-nextjs']);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Removing plugin zaria-plugin-nextjs…');
  });

  // unknown command
  it('should exit with code 1 for an unknown command', () => {
    expect(() => parse(['unknown-command'])).toThrow('process.exit called');
  });
});
