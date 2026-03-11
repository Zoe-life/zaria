/**
 * Zaria anonymous usage telemetry.
 *
 * Telemetry is **opt-out** and privacy-respecting:
 *  - No source code, file paths, or project-specific data is ever collected.
 *  - Events carry only: event name, CLI version, Node.js version, OS platform,
 *    an anonymous installation ID (random UUID), and aggregate metadata such as
 *    the audit command used and the names of plugins that were loaded.
 *  - Disable entirely by setting `ZARIA_TELEMETRY=0` in your shell profile:
 *      export ZARIA_TELEMETRY=0
 *
 * Why telemetry?
 *  Usage data lets the maintainers understand which commands and plugins are
 *  most popular, which Node.js and OS combinations need compatibility fixes,
 *  and whether adoption is growing.  This information is used exclusively to
 *  improve Zaria and is never sold or shared with third parties.
 *
 * Privacy policy: https://zaria.dev/privacy
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const pkg = _require('../../package.json') as { version: string };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Telemetry collection endpoint.  Set to empty string to disable network
 *  sending entirely while still exercising the module locally. */
const TELEMETRY_ENDPOINT = 'https://telemetry.zaria.dev/v1/events';

/** Milliseconds before a telemetry HTTP request is aborted. */
const TIMEOUT_MS = 2_000;

/** Directory in which the anonymous installation ID is persisted. */
const CONFIG_DIR = join(homedir(), '.config', 'zaria');

/** Path to the file storing the persistent anonymous installation ID. */
export const TELEMETRY_ID_FILE = join(CONFIG_DIR, 'telemetry-id');

// ---------------------------------------------------------------------------
// Opt-out check
// ---------------------------------------------------------------------------

/**
 * Returns `true` when telemetry is enabled (the default).
 *
 * Users opt out by setting `ZARIA_TELEMETRY=0` in their environment:
 * ```sh
 * export ZARIA_TELEMETRY=0   # add to ~/.bashrc or ~/.zshrc
 * ```
 */
export function isTelemetryEnabled(): boolean {
  return process.env['ZARIA_TELEMETRY'] !== '0';
}

// ---------------------------------------------------------------------------
// Anonymous installation ID
// ---------------------------------------------------------------------------

let _cachedId: string | undefined;

/**
 * Returns the persistent anonymous installation ID, creating it on first use.
 *
 * The ID is a randomly-generated UUID with no connection to user identity.
 * It is stored in `~/.config/zaria/telemetry-id` so that repeated invocations
 * of the CLI are attributed to the same installation without being tied to a
 * person.
 */
export async function getInstallationId(): Promise<string> {
  if (_cachedId !== undefined) return _cachedId;

  try {
    const existing = await readFile(TELEMETRY_ID_FILE, 'utf8');
    _cachedId = existing.trim();
  } catch {
    // File does not exist yet — generate and persist a new ID.
    const newId = randomUUID();
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      await writeFile(TELEMETRY_ID_FILE, newId, { encoding: 'utf8', flag: 'w' });
    } catch {
      // If we cannot write (race condition, permission error) use an in-memory
      // ID for this session; do not surface the error to the user.
    }
    _cachedId = newId;
  }

  return _cachedId;
}

/** Reset the cached installation ID (used in tests). */
export function _resetInstallationIdCache(): void {
  _cachedId = undefined;
}

// ---------------------------------------------------------------------------
// Event payload
// ---------------------------------------------------------------------------

/** Shape of a telemetry event sent to the collection endpoint. */
export interface TelemetryEvent {
  /** Short event name, e.g. `'audit_run'`, `'plugin_listed'`. */
  event: string;
  /** Anonymous installation identifier (UUID). */
  installationId: string;
  /** Zaria CLI version (from package.json). */
  zariaVersion: string;
  /** Node.js runtime version string, e.g. `'v22.0.0'`. */
  nodeVersion: string;
  /** Operating-system platform: `'linux'` | `'darwin'` | `'win32'` | … */
  platform: string;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  /** Additional event-specific key/value pairs. */
  properties: Record<string, string | number | boolean | string[]>;
}

// ---------------------------------------------------------------------------
// Core tracking function
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget telemetry event.
 *
 * This function **never throws** and **never blocks the caller** — it returns
 * immediately and handles all network I/O in the background.  Network failures
 * are silently swallowed so that a telemetry outage never degrades the CLI.
 *
 * If `ZARIA_TELEMETRY=0` is set this function is a no-op.
 *
 * @param event       Short event name, e.g. `'audit_run'`.
 * @param properties  Optional key/value pairs specific to this event.
 *                    Must not contain any user-identifiable information.
 */
export function trackEvent(
  event: string,
  properties: Record<string, string | number | boolean | string[]> = {},
): void {
  if (!isTelemetryEnabled()) return;
  if (!TELEMETRY_ENDPOINT) return;

  // Kick off async work without awaiting — intentionally fire-and-forget.
  void (async (): Promise<void> => {
    try {
      const installationId = await getInstallationId();

      const payload: TelemetryEvent = {
        event,
        installationId,
        zariaVersion: pkg.version,
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
        properties,
      };

      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
        await fetch(TELEMETRY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Silently ignore all errors — never surface telemetry failures to users.
    }
  })();
}
