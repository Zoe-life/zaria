import type { ResolvedConfig } from './schema.js';

/**
 * Built-in default configuration values.
 * These are the lowest-priority values — they are overridden by the config
 * file, environment variables, and CLI flags (in that order).
 */
export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'configFilePath'> = {
  version: 1,
  project: {
    type: 'web',
    language: 'typescript',
  },
  audit: {
    dimensions: ['performance', 'architecture', 'scalability', 'integrity', 'maintenance'],
    thresholds: {
      overall: 75,
      performance: 70,
      architecture: 80,
      scalability: 70,
      integrity: 80,
      maintenance: 70,
    },
  },
  ignore: {
    paths: ['node_modules', 'dist', '.next', 'coverage', 'build', 'out'],
    rules: [],
  },
  plugins: [],
  sre: {
    enabled: false,
  },
  output: {
    format: 'terminal',
    colors: true,
    detail: 'standard',
  },
};
