/**
 * Clean application fixture — used by audit engine tests.
 * This file does NOT contain any seeded issues and should produce
 * zero findings from all audit rules.
 */

import { readFile } from 'fs/promises';

/** Returns a greeting string. */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/** Asynchronously reads a file — uses async I/O correctly. */
export async function readConfig(path: string): Promise<string> {
  const content = await readFile(path, 'utf8');
  return content;
}

/** Processes items with a pre-fetched data set — no N+1. */
export function processItems(items: string[], dataMap: Map<string, string>): string[] {
  return items.map((item) => dataMap.get(item) ?? item);
}
