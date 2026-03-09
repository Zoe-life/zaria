import { cosmiconfig, type PublicExplorer } from 'cosmiconfig';
import type { ZariaConfig } from './schema.js';
import { ZariaConfigSchema } from './schema.js';

/** Result returned by {@link loadConfig}. */
export interface LoadedConfig {
  /** The raw (unmerged) config object loaded from the file. */
  config: ZariaConfig;
  /** Absolute path to the config file that was found. */
  filePath: string;
  /** Whether the config was loaded from a `package.json` `zaria` key. */
  fromPackageJson: boolean;
}

/**
 * The cosmiconfig explorer for Zaria.
 *
 * Search order (highest priority first):
 *   .zariarc  →  .zariarc.json  →  .zariarc.yml  →  .zariarc.yaml
 *   →  zaria.config.json  →  package.json (`zaria` key)
 *
 * Note: `zaria.config.ts` support requires a TypeScript loader and will be
 * implemented in a future phase.
 */
function createExplorer(): PublicExplorer {
  return cosmiconfig('zaria', {
    searchPlaces: [
      '.zariarc',
      '.zariarc.json',
      '.zariarc.yml',
      '.zariarc.yaml',
      'zaria.config.json',
      'package.json',
    ],
    stopDir: process.env['HOME'] ?? '/',
  });
}

/**
 * Discover and load the Zaria config file starting from `searchFrom`.
 *
 * @param searchFrom Directory to start searching from. Defaults to `process.cwd()`.
 * @returns The loaded config and its file path, or `null` if no config file
 *          was found.
 * @throws  {Error} If the file exists but its contents are invalid YAML/JSON.
 */
export async function loadConfig(searchFrom?: string): Promise<LoadedConfig | null> {
  const explorer = createExplorer();
  const result = await explorer.search(searchFrom ?? process.cwd());

  if (result === null || result.isEmpty) {
    return null;
  }

  const raw: unknown = result.config;
  const parsed = ZariaConfigSchema.safeParse(raw);

  if (!parsed.success) {
    // Bubble up as an Error so callers can provide user-friendly messages.
    const messages = parsed.error.issues
      .map((e) => `  • ${e.path.join('.') || '(root)'}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid config file "${result.filepath}":\n${messages}`);
  }

  return {
    config: parsed.data,
    filePath: result.filepath,
    fromPackageJson: result.filepath.endsWith('package.json'),
  };
}

/**
 * Load a config from a specific file path (used by `--config` CLI flag).
 *
 * @param filePath Absolute or relative path to the config file.
 * @returns The loaded config and its file path.
 * @throws  {Error} If the file does not exist or contains invalid content.
 */
export async function loadConfigFromFile(filePath: string): Promise<LoadedConfig> {
  const explorer = createExplorer();
  const result = await explorer.load(filePath);

  if (result === null || result.isEmpty) {
    throw new Error(`Config file "${filePath}" is empty or could not be read.`);
  }

  const raw: unknown = result.config;
  const parsed = ZariaConfigSchema.safeParse(raw);

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((e) => `  • ${e.path.join('.') || '(root)'}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid config file "${result.filepath}":\n${messages}`);
  }

  return {
    config: parsed.data,
    filePath: result.filepath,
    fromPackageJson: result.filepath.endsWith('package.json'),
  };
}
