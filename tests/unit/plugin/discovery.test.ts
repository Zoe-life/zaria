import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverPlugins } from '../../../src/plugin/discovery.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withNodeModules(
  plugins: string[],
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'zaria-disc-test-'));
  try {
    const nm = join(dir, 'node_modules');
    await mkdir(nm);
    for (const name of plugins) {
      await mkdir(join(nm, name));
      await writeFile(join(nm, name, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
    }
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('discoverPlugins', () => {
  it('returns an empty array when node_modules does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'zaria-disc-nomod-'));
    try {
      const result = await discoverPlugins(dir);
      expect(result).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns an empty array when no zaria-plugin-* packages are installed', async () => {
    await withNodeModules(['express', 'lodash', 'typescript'], async (dir) => {
      const result = await discoverPlugins(dir);
      expect(result).toEqual([]);
    });
  });

  it('discovers a single zaria-plugin-* package', async () => {
    await withNodeModules(['zaria-plugin-nextjs'], async (dir) => {
      const result = await discoverPlugins(dir);
      expect(result).toEqual(['zaria-plugin-nextjs']);
    });
  });

  it('discovers multiple zaria-plugin-* packages', async () => {
    await withNodeModules(
      ['zaria-plugin-nextjs', 'zaria-plugin-prisma', 'unrelated-package'],
      async (dir) => {
        const result = await discoverPlugins(dir);
        expect(result).toContain('zaria-plugin-nextjs');
        expect(result).toContain('zaria-plugin-prisma');
        expect(result).not.toContain('unrelated-package');
        expect(result).toHaveLength(2);
      },
    );
  });

  it('does not include non-plugin packages even if they have similar names', async () => {
    await withNodeModules(['zaria', 'zaria-cli', 'zaria-plugin-custom'], async (dir) => {
      const result = await discoverPlugins(dir);
      expect(result).toEqual(['zaria-plugin-custom']);
    });
  });

  it('returns plugin names as strings (not full paths)', async () => {
    await withNodeModules(['zaria-plugin-example'], async (dir) => {
      const result = await discoverPlugins(dir);
      expect(result[0]).toBe('zaria-plugin-example');
      expect(result[0]).not.toContain('/');
    });
  });
});
