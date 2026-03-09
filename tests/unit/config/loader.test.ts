import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, loadConfigFromFile } from '../../../src/config/loader.ts';

/** Create a temporary directory and return its path. */
async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zaria-loader-test-'));
}

describe('loadConfig', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTmpDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when no config file is present', async () => {
    const result = await loadConfig(dir);
    expect(result).toBeNull();
  });

  it('loads a valid .zariarc.yml', async () => {
    await writeFile(
      join(dir, '.zariarc.yml'),
      'version: 1\nproject:\n  type: web\n  language: typescript\n',
    );
    const result = await loadConfig(dir);
    expect(result).not.toBeNull();
    expect(result!.config.version).toBe(1);
    expect(result!.config.project?.type).toBe('web');
    expect(result!.filePath).toContain('.zariarc.yml');
    expect(result!.fromPackageJson).toBe(false);
  });

  it('loads a valid .zariarc.json', async () => {
    await writeFile(
      join(dir, '.zariarc.json'),
      JSON.stringify({ version: 1, project: { type: 'cli' } }),
    );
    const result = await loadConfig(dir);
    expect(result).not.toBeNull();
    expect(result!.config.project?.type).toBe('cli');
  });

  it('loads a valid .zariarc (plain JSON)', async () => {
    await writeFile(join(dir, '.zariarc'), JSON.stringify({ version: 1 }));
    const result = await loadConfig(dir);
    expect(result).not.toBeNull();
    expect(result!.config.version).toBe(1);
  });

  it('loads config from package.json `zaria` key', async () => {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        zaria: { version: 1, project: { type: 'mobile' } },
      }),
    );
    const result = await loadConfig(dir);
    expect(result).not.toBeNull();
    expect(result!.config.project?.type).toBe('mobile');
    expect(result!.fromPackageJson).toBe(true);
  });

  it('throws for a YAML file with invalid schema', async () => {
    await writeFile(join(dir, '.zariarc.yml'), 'version: 99\n');
    await expect(loadConfig(dir)).rejects.toThrow(/Invalid config file/);
  });

  it('throws for a JSON file with invalid schema', async () => {
    await writeFile(
      join(dir, '.zariarc.json'),
      JSON.stringify({ version: 1, audit: { thresholds: { overall: 200 } } }),
    );
    await expect(loadConfig(dir)).rejects.toThrow(/Invalid config file/);
  });
});

describe('loadConfigFromFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTmpDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('loads a valid YAML file by explicit path', async () => {
    const filePath = join(dir, 'custom.zariarc.yml');
    await writeFile(filePath, 'version: 1\nproject:\n  type: desktop\n');
    const result = await loadConfigFromFile(filePath);
    expect(result.config.project?.type).toBe('desktop');
    expect(result.filePath).toBe(filePath);
  });

  it('throws for an invalid config file', async () => {
    const filePath = join(dir, 'bad.zariarc.yml');
    await writeFile(filePath, 'version: 2\n');
    await expect(loadConfigFromFile(filePath)).rejects.toThrow(/Invalid config file/);
  });
});
