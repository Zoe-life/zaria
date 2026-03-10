/**
 * EFF003 — ReDoS-Susceptible Pattern
 *
 * Detects regular expression literals whose structure can cause catastrophic
 * backtracking (ReDoS) on adversarial input.  Two structural heuristics are
 * applied to the body of each regex literal found in the source:
 *
 *   1. Nested quantifiers — a group whose body already contains `+` or `*`
 *      is itself quantified with `+`, `*`, `?`, or `{n,}`.
 *      Example: `(a+)+`  `(\w+)*`  `(x+){2,}`
 *      The inner quantifier creates exponential backtracking paths.
 *
 *   2. Quantified alternation — a group with `|` alternatives is quantified
 *      with `+`, `*`, or `{n,}`.
 *      Example: `(a|b)+`  `(\w|\d)*`
 *      Overlapping alternatives multiply backtracking paths.
 *
 * Detection is a lightweight structural scan on extracted regex bodies.
 * The regex literal extractor uses a conservative lookahead to avoid
 * matching the division operator `/`.
 *
 * Time complexity:  O(n) per file (two-pass: extraction + heuristic check).
 * Space complexity: O(r) where r = number of regex literals per file.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Extracts candidate regex literal bodies from source text.
 *
 * Matches: <non-word-or-specific-boundary> / <body> / <optional-flags>
 *
 * The leading `(?:[\s=(!,;:[\]{}^|&?~]|^)` guards against matching the
 * division operator by requiring the `/` to follow whitespace or a
 * syntactic punctuation character that cannot precede a division operand.
 *
 * Captures group 1: the regex body (between the two `/` delimiters).
 * The `[gimsuy]*` at the end consumes optional flags without capturing.
 */
const REGEX_LITERAL_RE = /(?:[\s=(!,;:[\]{}^|&?~]|^)\/((?:[^/\\\n]|\\.)+)\/[gimsuy]*/gm;

/**
 * Detects a nested quantifier inside a captured regex body:
 *   \( [^)]* [+*] [^)]* \) [+*?{]
 * Example matches: (a+)+  (\w+)*  (x+)?  (abc+){2,}
 */
const NESTED_QUANTIFIER_RE = /\([^)]*[+*][^)]*\)[+*?{]/;

/**
 * Detects a quantified alternation inside a captured regex body:
 *   \( [^)]* | [^)]* \) [+*{]
 * Example matches: (a|b)+  (\w|\d)*  (foo|bar){2,}
 */
const ALTERNATION_QUANTIFIER_RE = /\([^)]*\|[^)]*\)[+*{]/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when `body` contains a dangerous nested-quantifier pattern. */
function hasNestedQuantifier(body: string): boolean {
  return NESTED_QUANTIFIER_RE.test(body);
}

/** Returns true when `body` contains a dangerous quantified-alternation pattern. */
function hasQuantifiedAlternation(body: string): boolean {
  return ALTERNATION_QUANTIFIER_RE.test(body);
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export const eff003: Rule = {
  id: 'EFF003',
  name: 'ReDoS-Susceptible Pattern',
  description:
    'Detects regular expression literals with nested quantifiers or quantified ' +
    'alternations that can cause catastrophic backtracking (ReDoS) on adversarial input.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const { content } = parsedFile;
      // Reset global regex state before each file scan.
      REGEX_LITERAL_RE.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = REGEX_LITERAL_RE.exec(content)) !== null) {
        const body = match[1];
        if (!body) continue;

        const dangerous = hasNestedQuantifier(body) || hasQuantifiedAlternation(body);
        if (!dangerous) continue;

        // Compute the 1-based line number of this match.
        const lineNumber = content.slice(0, match.index).split('\n').length;

        findings.push({
          ruleId: 'EFF003',
          severity: 'high',
          message:
            `ReDoS-susceptible regex at line ${lineNumber}: /${body}/ ` +
            'contains nested quantifiers or quantified alternation that may cause catastrophic backtracking.',
          file: parsedFile.sourceFile.path,
          line: lineNumber,
          recommendation:
            'Rewrite the regex to avoid nested quantifiers (e.g. replace (x+)+ with x+) ' +
            'and overlapping alternations. Consider using atomic groups, possessive quantifiers, ' +
            'or a dedicated safe-regex validation library.',
        });
      }
    }

    return findings;
  },
};
