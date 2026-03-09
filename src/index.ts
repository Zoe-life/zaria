#!/usr/bin/env node

/**
 * Zaria — Enterprise-Grade Codebase Audit CLI
 * Entry point
 */

import { fileURLToPath } from 'url';

export const VERSION = '0.0.1';

export function run(): void {
  console.log(`Zaria v${VERSION}`);
}

/* c8 ignore next 3 -- ESM main guard: only runs when executed as entry point, not when imported */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
