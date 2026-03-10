// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['tests/unit/*.ts', 'tests/unit/cli/*.ts', 'tests/unit/config/*.ts', 'tests/unit/audit/*.ts', 'tests/unit/audit/performance/*.ts', 'tests/unit/audit/architecture/*.ts', 'tests/unit/audit/scalability/*.ts', 'tests/unit/audit/integrity/*.ts', 'tests/unit/audit/maintenance/*.ts', 'tests/unit/audit/efficiency/*.ts', 'tests/unit/scorer/*.ts', 'tests/unit/report/*.ts', 'tests/unit/sre/*.ts', 'tests/integration/*.ts'],
          defaultProject: './tsconfig.lint.json',
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 50,
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'tests/fixtures/**'],
  },
];
