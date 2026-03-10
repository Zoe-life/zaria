/**
 * Plugin discovery — Phase 14.3.
 *
 * Scans the `node_modules` directory of the target project for installed
 * packages whose name starts with `zaria-plugin-`.  Returns a list of
 * resolved package specifiers that can be passed to `loadPlugins`.
 *
 * Discovery is best-effort: errors reading the directory are silently
 * ignored so that the audit can always continue.
 *
 * Time  O(n)  where n = number of entries in node_modules.
 * Space O(k)  where k = number of zaria-plugin-* packages found.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Prefix that Zaria-compatible plugins must use for their package name. */
const PLUGIN_PREFIX = 'zaria-plugin-';

/**
 * Scan `<projectRoot>/node_modules` for installed Zaria plugins.
 *
 * @param projectRoot  Absolute path to the project being audited.
 * @returns            Array of package name specifiers (e.g. `["zaria-plugin-nextjs"]`).
 */
export async function discoverPlugins(projectRoot: string): Promise<string[]> {
  const nodeModulesDir = join(projectRoot, 'node_modules');

  let entries: string[];
  try {
    entries = await readdir(nodeModulesDir);
  } catch {
    // node_modules may not exist (e.g. auditing a path with no deps).
    return [];
  }

  return entries.filter((name) => name.startsWith(PLUGIN_PREFIX));
}
