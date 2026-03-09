export {
  ZariaConfigSchema,
  ProjectTypeSchema,
  ProjectLanguageSchema,
  AuditDimensionSchema,
  OutputFormatSchema,
  OutputDetailSchema,
  SreProviderTypeSchema,
  SreProviderSchema,
} from './schema.js';
export type {
  ZariaConfig,
  ResolvedConfig,
  ProjectType,
  ProjectLanguage,
  AuditDimension,
  OutputFormat,
  OutputDetail,
  SreProviderType,
  SreProvider,
} from './schema.js';
export { DEFAULT_CONFIG } from './defaults.js';
export { loadConfig, loadConfigFromFile } from './loader.js';
export type { LoadedConfig } from './loader.js';
export { mergeConfig, readEnvOverrides } from './merge.js';
export type { CliOverrides, EnvOverrides } from './merge.js';
export { validateConfig, formatValidationResult, KNOWN_RULE_IDS } from './validate.js';
export type { ValidationResult, ValidationError } from './validate.js';
export { detectProject } from './detect.js';
export type { DetectedProject } from './detect.js';
