import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProgram } from '../../../src/cli/index.ts';

function parse(args: string[]): void {
  buildProgram().parse(['node', 'zaria', ...args]);
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
  it('config init: prints stub message', () => {
    parse(['config', 'init']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Scaffolding .zariarc.yml…');
  });

  it('config validate: prints stub message', () => {
    parse(['config', 'validate']);
    expect(consoleLogSpy).toHaveBeenCalledWith('Config valid.');
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
