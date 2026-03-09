/**
 * Public API for the Zaria audit engine — Phase 4 barrel exports.
 */

export type {
  Severity,
  SourceFile,
  ImportEdge,
  ParsedFile,
  AnalysisContext,
  Finding,
  Rule,
  DimensionResult,
} from './types.js';

export { traverseFiles } from './traversal.js';
export { parseFiles } from './parser.js';
export { buildAnalysisContext } from './context.js';
