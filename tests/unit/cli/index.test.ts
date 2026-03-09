import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildProgram } from '../../../src/cli/index.ts';

function parse(args: string[]): void {
  buildProgram().parse(['node', 'zaria', ...args]);
}

async function parseAsync(args: string[]): Promise<void> {
  await buildProgram().parseAsync(['node', 'zaria', ...args]);
}

describe('CLI program', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // Commander calls process.exit(0) for --version and --help; prevent actual exit.
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
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
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^Running full audit on .+…$/),
    );
  });

  it('audit: explicit path', () => {
    parse(['audit', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running full audit on /tmp/project…');
  });

  // audit sub-commands
  it('audit:perf: explicit path', () => {
    parse(['audit:perf', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running performance audit on /tmp/project…');
  });

  it('audit:arch: explicit path', () => {
    parse(['audit:arch', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running architecture audit on /tmp/project…');
  });

  it('audit:scale: explicit path', () => {
    parse(['audit:scale', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running scalability audit on /tmp/project…');
  });

  it('audit:integrity: explicit path', () => {
    parse(['audit:integrity', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running integrity audit on /tmp/project…');
  });

  it('audit:maint: explicit path', () => {
    parse(['audit:maint', '/tmp/project']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Running maintenance audit on /tmp/project…');
  });

  // report command
  it('report: prints stub message', () => {
    parse(['report']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Generating report from last audit run…');
  });

  // config commands
  it('config init: creates .zariarc.yml and prints success', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaria-cli-test-'));
    try {
      await parseAsync(['config', 'init', '--dir', dir]);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('.zariarc.yml'));
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
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No config file found'));
      } finally {
        process.chdir(originalCwd);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // sre commands
  it('sre connect: prints stub message', () => {
    parse(['sre', 'connect']);
    expect(consoleLogSpy).toHaveBeenCalledWith('SRE connection wizard — coming soon.');
  });

  it('sre test: prints stub message', () => {
    parse(['sre', 'test']);
    expect(consoleLogSpy).toHaveBeenCalledWith('No SRE providers configured.');
  });

  // plugin commands
  it('plugin list: prints stub message', () => {
    parse(['plugin', 'list']);
    expect(consoleLogSpy).toHaveBeenCalledWith('No plugins installed.');
  });

  it('plugin add: prints stub message with name', () => {
    parse(['plugin', 'add', 'zaria-plugin-nextjs']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Installing plugin zaria-plugin-nextjs…');
  });

  it('plugin remove: prints stub message with name', () => {
    parse(['plugin', 'remove', 'zaria-plugin-nextjs']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Removing plugin zaria-plugin-nextjs…');
  });

  // unknown command
  it('should exit with code 1 for an unknown command', () => {
    expect(() => parse(['unknown-command'])).toThrow('process.exit called');
  });
});
