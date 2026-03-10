/**
 * Plugin API types — Phase 14.
 *
 * Third-party plugins implement the `ZariaPlugin` interface and export it as
 * the default export (or a named export `plugin`) from their package entry
 * point.  Zaria loads them via dynamic `import()`, validates the shape, and
 * merges their rules into the audit run.
 */

import type { Rule, AuditResult } from '../audit/types.js';

// ---------------------------------------------------------------------------
// Context passed to plugin lifecycle hooks
// ---------------------------------------------------------------------------

/** Runtime context supplied to a plugin's `onInit` hook. */
export interface PluginContext {
  /** Absolute path to the project being audited. */
  projectRoot: string;
}

// ---------------------------------------------------------------------------
// Plugin interface
// ---------------------------------------------------------------------------

/**
 * The contract that every Zaria plugin must satisfy.
 *
 * A plugin must export this object (or a class instance with these fields) as
 * `plugin` or as the module default.
 */
export interface ZariaPlugin {
  /** Unique plugin name, e.g. `"zaria-plugin-nextjs"`. */
  name: string;
  /** Semantic version of the plugin, e.g. `"1.0.0"`. */
  version: string;
  /**
   * Additional audit rules contributed by this plugin.
   * Rules follow the same `Rule` interface used by all built-in dimensions.
   */
  rules: Rule[];
  /**
   * Optional lifecycle hook invoked once before any rules are run.
   * Use this to perform async setup (e.g. read extra config files).
   */
  onInit?(context: PluginContext): Promise<void>;
  /**
   * Optional lifecycle hook invoked once after the full audit has finished.
   * Useful for posting results to an external system.
   */
  onAuditComplete?(result: AuditResult): Promise<void>;
}

// ---------------------------------------------------------------------------
// Loaded plugin record (internal)
// ---------------------------------------------------------------------------

/**
 * Internal representation of a successfully loaded and validated plugin,
 * including the resolved file/package path for diagnostics.
 */
export interface LoadedPlugin {
  plugin: ZariaPlugin;
  /** The specifier used to `import()` the plugin (package name or path). */
  specifier: string;
}
