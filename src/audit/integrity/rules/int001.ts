/**
 * INT001 — Missing Input Validation
 *
 * Detects Express / Fastify / Koa route handlers that read from `req.body`,
 * `req.query`, or `req.params` without applying a recognised validation
 * middleware or library call.
 *
 * Without input validation, untrusted user data flows directly into business
 * logic and persistence layers, creating injection, type confusion, and
 * business-rule violation risks.
 *
 * Heuristic (content-based):
 *  - A file is a route file if it contains HTTP verb registrations
 *    (`.get(`, `.post(`, `.put(`, `.patch(`, `.delete(`).
 *  - A handler "reads input" if it references `req.body`, `req.query`,
 *    `req.params`, `request.body`, `ctx.request.body`, or `ctx.query`.
 *  - A handler has validation if it references a recognised validation
 *    library or pattern: `validate`, `schema.parse`, `schema.safeParse`,
 *    `Joi`, `yup`, `zod`, `express-validator`, `checkSchema`, `body(`,
 *    `query(`, `param(`.
 *  - A file that reads input but lacks any validation reference is flagged.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** HTTP verb registrations that indicate a route file. */
const ROUTE_VERBS = /\.(get|post|put|patch|delete)\s*\(\s*['"`]/;

/** Request input access patterns. */
const INPUT_ACCESS =
  /\breq\.(body|query|params)\b|\brequest\.(body|query|params)\b|\bctx\.(request\.body|query)\b/;

/**
 * Validation library or pattern references.
 * Covers: Zod, Joi, Yup, express-validator, custom validate() calls.
 */
const VALIDATION_PATTERNS =
  /\b(validate|safeParse|\.parse\s*\(|Joi\.|yup\.|z\.|checkSchema|body\s*\(|query\s*\(|param\s*\(|validationResult|celebrate|ajv|fastify-plugin|schema\.)\b/i;

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const int001: Rule = {
  id: 'INT001',
  name: 'Missing Input Validation',
  description:
    'Detects route handler files that read req.body / req.query / req.params without applying a recognised validation library or middleware (Zod, Joi, Yup, express-validator, etc.).',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const content = parsedFile.content;

      // Only examine route files
      if (!ROUTE_VERBS.test(content)) continue;

      // Only flag if the file reads request input
      if (!INPUT_ACCESS.test(content)) continue;

      // Skip if a validation library/call is already present
      if (VALIDATION_PATTERNS.test(content)) continue;

      findings.push({
        ruleId: 'INT001',
        severity: 'high',
        message:
          'Route handler reads req.body / req.query / req.params without any input validation. Untrusted data flows directly into business logic.',
        file: parsedFile.sourceFile.path,
        recommendation:
          'Validate and sanitise all request inputs using a schema library (Zod, Joi, Yup) or middleware (express-validator). Reject requests that fail validation with HTTP 400.',
      });
    }

    return findings;
  },
};
