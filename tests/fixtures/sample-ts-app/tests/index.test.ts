/**
 * Minimal test placeholder for the sample-ts-app fixture.
 *
 * This file exists so MAINT004 can detect that the project has test
 * infrastructure while most source files still lack corresponding tests.
 * It intentionally covers only `index.ts` (basename match: "index").
 *
 * NOTE: This is NOT a Vitest test file. The export prevents vitest from
 * reporting "no test suite found". The file is excluded from vitest via
 * the fixture-ignore glob in vitest.config.ts (tests/fixtures is excluded
 * by virtue of having no describe/it blocks — vitest skips it).
 */
export const _placeholder = true;
