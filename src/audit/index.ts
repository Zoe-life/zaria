/**
 * Public API for the Zaria audit engine — Phase 4–9 barrel exports.
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
  Grade,
  OverallScore,
  AuditResult,
} from './types.js';

export { traverseFiles } from './traversal.js';
export { parseFiles } from './parser.js';
export { buildAnalysisContext } from './context.js';

// Phase 5 — Performance
export { PERFORMANCE_RULES, scorePerformance } from './performance/scorer.js';

// Phase 6 — Architecture
export { ARCHITECTURE_RULES, scoreArchitecture } from './architecture/scorer.js';

// Phase 7 — Scalability & Observability
export { SCALABILITY_RULES, scoreScalability } from './scalability/scorer.js';

// Phase 8 — Data Integrity & Race Conditions
export { INTEGRITY_RULES, scoreIntegrity } from './integrity/scorer.js';

// Phase 9 — Long-Term Maintenance
export { MAINTENANCE_RULES, scoreMaintenance } from './maintenance/scorer.js';
