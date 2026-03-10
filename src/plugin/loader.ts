/**
 * Plugin loader — Phase 14.2.
 *
 * Loads plugins specified by name (npm package) or absolute/relative file path,
 * validates them against the ZariaPlugin interface, runs `onInit`, and returns
 * the validated plugin objects.
 *
 * Plugin failures are isolated: a plugin that throws during load or onInit will
 * produce a warning but will NOT crash Zaria.
 *
 * Time  O(p)  where p = number of plugin specifiers.
 * Space O(p)  for the loaded plugin array.
 */

import { logger } from '../logger.js';
import type { ZariaPlugin, PluginContext } from './types.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Type-guard that checks whether an arbitrary module export satisfies the
 * minimum ZariaPlugin contract (name, version, rules array).
 */
function isZariaPlugin(value: unknown): value is ZariaPlugin {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['name'] === 'string' &&
    typeof obj['version'] === 'string' &&
    Array.isArray(obj['rules'])
  );
}

/**
 * Extract the plugin object from a dynamic `import()` result.
 * Supports both `export default plugin` and `export { plugin }` styles.
 */
function extractPlugin(mod: Record<string, unknown>): ZariaPlugin | null {
  if (isZariaPlugin(mod['default'])) return mod['default'] as ZariaPlugin;
  if (isZariaPlugin(mod['plugin'])) return mod['plugin'] as ZariaPlugin;
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load, validate, and initialise one or more plugins.
 *
 * @param specifiers  Package names or file paths to load.
 * @param context     Runtime context passed to each plugin's `onInit` hook.
 * @returns           Array of successfully loaded ZariaPlugin objects.
 */
export async function loadPlugins(
  specifiers: readonly string[],
  context: PluginContext,
): Promise<ZariaPlugin[]> {
  if (specifiers.length === 0) return [];

  const loaded: ZariaPlugin[] = [];

  for (const specifier of specifiers) {
    try {
      // Dynamic import supports both package names and file:// paths.
      const mod = (await import(specifier)) as Record<string, unknown>;
      const plugin = extractPlugin(mod);

      if (!plugin) {
        logger.warn(`Plugin '${specifier}' does not export a valid ZariaPlugin — skipping.`);
        continue;
      }

      // Run optional onInit hook; errors here are isolated.
      if (typeof plugin.onInit === 'function') {
        try {
          await plugin.onInit(context);
        } catch (initErr) {
          const msg = initErr instanceof Error ? initErr.message : String(initErr);
          logger.warn(`Plugin '${plugin.name}' onInit failed: ${msg} — continuing without it.`);
          continue;
        }
      }

      loaded.push(plugin);
      logger.info(`Plugin '${plugin.name}@${plugin.version}' loaded.`);
    } catch (loadErr) {
      const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
      logger.warn(`Failed to load plugin '${specifier}': ${msg} — skipping.`);
    }
  }

  return loaded;
}
