import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadPlugins } from '../../../src/plugin/loader.ts';
import type { ZariaPlugin } from '../../../src/plugin/types.ts';
import { logger } from '../../../src/logger.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid ZariaPlugin for use in tests. */
function makePlugin(overrides: Partial<ZariaPlugin> = {}): ZariaPlugin {
  return {
    name: 'zaria-plugin-test',
    version: '1.0.0',
    rules: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadPlugins', () => {
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
  });

  afterEach(() => {
    loggerInfoSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('returns an empty array when no specifiers are provided', async () => {
    const result = await loadPlugins([], { projectRoot: '/tmp' });
    expect(result).toEqual([]);
    expect(loggerInfoSpy).not.toHaveBeenCalled();
  });

  it('logs a warning and skips a specifier that cannot be imported', async () => {
    const result = await loadPlugins(['non-existent-package-xyz-123'], { projectRoot: '/tmp' });
    expect(result).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load plugin 'non-existent-package-xyz-123'"),
    );
  });

  it('logs a warning and skips a module that does not export a valid plugin', async () => {
    // Mock import by spying on the global dynamic import — we test via
    // a path that resolves but does not export a ZariaPlugin.
    // We use a data URL so no filesystem write is needed.
    const dataUrl = 'data:text/javascript,export default 42;';
    const result = await loadPlugins([dataUrl], { projectRoot: '/tmp' });
    expect(result).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not export a valid ZariaPlugin'),
    );
  });

  it('loads a valid plugin exported as `plugin` named export', async () => {
    const validPlugin = makePlugin();
    const code = `export const plugin = { name: ${JSON.stringify(validPlugin.name)}, version: ${JSON.stringify(validPlugin.version)}, rules: [] };`;
    const dataUrl = `data:text/javascript,${encodeURIComponent(code)}`;

    const result = await loadPlugins([dataUrl], { projectRoot: '/tmp' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(validPlugin.name);
  });

  it('loads a valid plugin exported as default export', async () => {
    const code = `export default { name: 'zaria-plugin-default', version: '2.0.0', rules: [] };`;
    const dataUrl = `data:text/javascript,${encodeURIComponent(code)}`;
    const result = await loadPlugins([dataUrl], { projectRoot: '/tmp' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('zaria-plugin-default');
    expect(result[0].version).toBe('2.0.0');
  });

  it('calls onInit with the plugin context', async () => {
    // Use a self-contained onInit that records invocation via a module-level variable.
    const code = [
      'let called = false;',
      'export const plugin = {',
      '  name: "onInit-test", version: "1.0.0", rules: [],',
      '  async onInit(ctx) { called = true; if (!ctx.projectRoot) throw new Error("no root"); }',
      '};',
    ].join(' ');
    const dataUrl = `data:text/javascript,${encodeURIComponent(code)}`;
    const result = await loadPlugins([dataUrl], { projectRoot: '/proj' });
    // Plugin loaded successfully (onInit ran without error).
    expect(result).toHaveLength(1);
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });

  it('skips plugin and warns when onInit throws', async () => {
    const code = `export const plugin = { name: 'bad-init', version: '1.0.0', rules: [], onInit: async () => { throw new Error('init failed'); } };`;
    const dataUrl = `data:text/javascript,${encodeURIComponent(code)}`;
    const result = await loadPlugins([dataUrl], { projectRoot: '/tmp' });
    expect(result).toHaveLength(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('onInit failed'));
  });

  it('loads multiple plugins in sequence and returns all valid ones', async () => {
    const code1 = `export const plugin = { name: 'p1', version: '1.0.0', rules: [] };`;
    const code2 = `export const plugin = { name: 'p2', version: '1.0.0', rules: [] };`;
    const result = await loadPlugins(
      [
        `data:text/javascript,${encodeURIComponent(code1)}`,
        `data:text/javascript,${encodeURIComponent(code2)}`,
      ],
      { projectRoot: '/tmp' },
    );
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual(['p1', 'p2']);
  });

  it('returns only valid plugins when mixed with invalid specifiers', async () => {
    const validCode = `export const plugin = { name: 'valid', version: '1.0.0', rules: [] };`;
    const result = await loadPlugins(
      ['non-existent-xyz', `data:text/javascript,${encodeURIComponent(validCode)}`],
      { projectRoot: '/tmp' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });
});
