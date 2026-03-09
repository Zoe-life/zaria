/**
 * Sample TypeScript application fixture — used by audit engine tests.
 * This file intentionally contains seeded issues that the audit rules
 * should detect.
 */

// PERF002 — synchronous fs call inside an async function
import { readFileSync, writeFileSync } from 'fs';

// PERF001 fixture helper — simulate an ORM-like interface
const db = {
  find: (id: number) => ({ id, name: `item-${id}` }),
};

// PERF001 — database call inside a loop (N+1 pattern)
export async function fetchAllItems(ids: number[]): Promise<object[]> {
  const results = [];
  for (const id of ids) {
    results.push(db.find(id)); // ORM call inside loop
  }
  return results;
}

// PERF002 — sync I/O inside async function
export async function readConfig(): Promise<string> {
  const content = readFileSync('/tmp/config.json', 'utf8'); // sync in async
  return content;
}

// PERF004 — addEventListener without removeEventListener
export function attachHandler(target: EventTarget): void {
  target.addEventListener('click', () => {
    console.log('clicked');
  });
  // Missing: target.removeEventListener(...)
}

// PERF004 — another listener leak
export function setupListeners(emitter: EventTarget): void {
  emitter.addEventListener('data', (evt) => {
    writeFileSync('/tmp/log.txt', JSON.stringify(evt));
  });
}
