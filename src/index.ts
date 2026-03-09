#!/usr/bin/env node

/**
 * Zaria — Enterprise-Grade Codebase Audit CLI
 * Entry point
 */

import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { createRequire } from 'module';
import { buildProgram } from './cli/index.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as { version: string };
export const VERSION = pkg.version;

export function run(argv: string[] = process.argv): void {
  const program = buildProgram();
  program.parse(argv);
}

/* c8 ignore next 3 -- ESM main guard: only runs when executed as entry point, not when imported */
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  run();
}
