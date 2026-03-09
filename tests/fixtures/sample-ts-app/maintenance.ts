/**
 * Long-Term Maintenance fixture — Phase 9.
 * Intentionally contains seeded issues that MAINT001–MAINT004 should detect.
 */

// ---------------------------------------------------------------------------
// MAINT001 — Function with cyclomatic complexity > 10
// ---------------------------------------------------------------------------

export function classifyRequest(req: Record<string, unknown>): string {
  if (!req) return 'empty';
  if (typeof req.method !== 'string') return 'bad method';
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!req.path) return 'no path';
    if (typeof req.path !== 'string') return 'bad path';
    if ((req.path as string).length > 2048) return 'path too long';
    if (req.query && typeof req.query === 'object') {
      return 'read';
    }
    return 'fetch';
  } else if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body) return 'no body';
    return 'write';
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// MAINT002 — Duplicate code blocks (identical 6-line function bodies)
// ---------------------------------------------------------------------------

export function serializeUserRecord(id: string, data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString('base64');
  const checksum = payload.length.toString(16);
  const timestamp = new Date().toISOString();
  const version = '1';
  return JSON.stringify({ id, encoded, checksum, timestamp, version });
}

export function serializeAuditRecord(id: string, data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString('base64');
  const checksum = payload.length.toString(16);
  const timestamp = new Date().toISOString();
  const version = '1';
  return JSON.stringify({ id, encoded, checksum, timestamp, version });
}
