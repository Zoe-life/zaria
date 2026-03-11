/**
 * `zaria-plugin-cpp` — official C++ plugin for Zaria.
 *
 * Provides static-analysis rules specific to C++ projects:
 *   CPP001  `using namespace std;` in header files (namespace pollution)
 *   CPP002  Raw new/delete instead of smart pointers (memory-management risk)
 *   CPP003  printf/scanf instead of type-safe iostream or std::format
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter only C++ source and header files from the analysis context. */
function cppFiles(context: AnalysisContext): AnalysisContext['files'] {
  return context.files.filter((f) => f.sourceFile.language === 'cpp');
}

const HEADER_RE = /\.h(?:pp|xx)?$/;

// ---------------------------------------------------------------------------
// CPP001 — using namespace std; in headers
// ---------------------------------------------------------------------------

const cpp001: Rule = {
  id: 'CPP001',
  name: 'Do not use "using namespace std;" in header files',
  description:
    '`using namespace std;` in a header file forces every translation unit that includes ' +
    'it to inherit the entire std namespace, creating name collisions that are hard to ' +
    'debug. This is a recognised C++ anti-pattern. Confine using-directives to ' +
    'implementation files (.cpp) and qualify names explicitly in headers (std::vector, ' +
    'std::string, etc.).',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const USING_NS_RE = /^\s*using\s+namespace\s+std\s*;/;

    for (const file of cppFiles(context)) {
      if (!HEADER_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (USING_NS_RE.test(line)) {
          findings.push({
            ruleId: 'CPP001',
            severity: 'medium',
            message: '"using namespace std;" in a header file pollutes every including TU.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Remove the using-directive from the header and qualify names explicitly:\n' +
              '  std::vector<int> items;   // explicit qualification\n' +
              '  std::string name;\n' +
              'If needed, you may use `using std::vector;` (type-scoped) in .cpp files only.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// CPP002 — Raw new/delete instead of smart pointers
// ---------------------------------------------------------------------------

const cpp002: Rule = {
  id: 'CPP002',
  name: 'Prefer smart pointers over raw new/delete',
  description:
    'Manual `new` / `delete` requires the developer to ensure every allocation has a ' +
    'matching deallocation on every code path — including in the presence of exceptions. ' +
    'Smart pointers (std::unique_ptr, std::shared_ptr) automate lifetime management and ' +
    'eliminate entire classes of memory leaks and double-free errors.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match bare `new` / `delete` outside placement-new context.
    const NEW_RE = /\bnew\s+\w+/;
    const DELETE_RE = /\bdelete(?:\[\])?\s+\w+/;

    for (const file of cppFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (NEW_RE.test(line) || DELETE_RE.test(line)) {
          findings.push({
            ruleId: 'CPP002',
            severity: 'high',
            message: 'Raw new/delete detected — prefer std::unique_ptr or std::shared_ptr.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Use smart pointers for automatic lifetime management:\n' +
              '  // Instead of: T* p = new T(args);\n' +
              '  auto p = std::make_unique<T>(args);   // sole ownership\n' +
              '  auto p = std::make_shared<T>(args);   // shared ownership\n' +
              'Prefer std::make_unique / std::make_shared to avoid raw new entirely.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// CPP003 — printf/scanf instead of iostream / std::format
// ---------------------------------------------------------------------------

const cpp003: Rule = {
  id: 'CPP003',
  name: 'Use iostream or std::format instead of printf/scanf',
  description:
    'printf() and scanf() use format strings that are not type-checked at compile time, ' +
    'leading to undefined behaviour when the format specifier does not match the argument ' +
    'type. C++ provides type-safe alternatives: the iostream library (operator<< / >>) ' +
    'and std::format (C++20) or {fmt}.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const PRINTF_RE = /\b(?:printf|fprintf|sprintf|scanf|fscanf|sscanf)\s*\(/;

    for (const file of cppFiles(context)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (PRINTF_RE.test(line)) {
          findings.push({
            ruleId: 'CPP003',
            severity: 'medium',
            message: 'printf/scanf family used — prefer type-safe iostream or std::format.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Use type-safe alternatives:\n' +
              '  std::cout << "Value: " << value << std::endl;  // iostream\n' +
              '  std::string s = std::format("Value: {}", value); // C++20\n' +
              'For output with complex formatting, consider the {fmt} library.',
          });
        }
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const plugin: ZariaPlugin = {
  name: 'zaria-plugin-cpp',
  version: '1.0.0',
  rules: [cpp001, cpp002, cpp003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
