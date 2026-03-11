import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import type { ProjectType, ProjectLanguage } from './schema.js';

/** Detected project metadata used to pre-fill `config init` output. */
export interface DetectedProject {
  type: ProjectType;
  language: ProjectLanguage;
  name?: string;
}

/** Check whether a file exists at `filePath` (no-throw). */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns `true` when at least one file in `dir` (non-recursive) matches
 * the simple glob suffix pattern, e.g. `*.sln` or `*.cpp`.
 */
async function globFirstMatch(dir: string, pattern: string): Promise<boolean> {
  const suffix = pattern.startsWith('*.') ? pattern.slice(1) : pattern;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return false;
  }
  return entries.some((e) => e.endsWith(suffix));
}

/**
 * Inspect the directory at `dir` and return a best-guess project type and
 * primary language. Falls back to `{ type: 'web', language: 'typescript' }`.
 */
export async function detectProject(dir: string): Promise<DetectedProject> {
  let name: string | undefined;
  let type: ProjectType = 'web';
  let language: ProjectLanguage = 'typescript';

  // --- Language detection ---
  const hasGoMod = await fileExists(join(dir, 'go.mod'));
  const hasCargo = await fileExists(join(dir, 'Cargo.toml'));
  const hasPyProject = await fileExists(join(dir, 'pyproject.toml'));
  const hasRequirements = await fileExists(join(dir, 'requirements.txt'));
  const hasSetupPy = await fileExists(join(dir, 'setup.py'));
  const hasPomXml = await fileExists(join(dir, 'pom.xml'));
  const hasPackageJson = await fileExists(join(dir, 'package.json'));
  // C# — Visual Studio solution or project file
  const hasSlnFile =
    (await globFirstMatch(dir, '*.sln')) || (await globFirstMatch(dir, '*.csproj'));
  // C++ — CMakeLists.txt or Makefile alongside .cpp files
  const hasCMake = await fileExists(join(dir, 'CMakeLists.txt'));
  const hasMakefile = await fileExists(join(dir, 'Makefile'));
  const hasCppFile = await globFirstMatch(dir, '*.cpp');
  const hasCFile = await globFirstMatch(dir, '*.c');

  if (hasGoMod) {
    language = 'go';
  } else if (hasCargo) {
    language = 'rust';
  } else if (hasPyProject || hasRequirements || hasSetupPy) {
    language = 'python';
  } else if (hasPomXml) {
    language = 'java';
  } else if (hasSlnFile) {
    language = 'csharp';
  } else if (hasCMake || (hasMakefile && hasCppFile)) {
    language = 'cpp';
  } else if (hasMakefile && hasCFile) {
    language = 'c';
  } else if (hasPackageJson) {
    // TypeScript if tsconfig.json is present, otherwise JavaScript.
    const hasTsConfig = await fileExists(join(dir, 'tsconfig.json'));
    language = hasTsConfig ? 'typescript' : 'javascript';
  }

  // --- Project type detection (Node.js / package.json only) ---
  if (hasPackageJson) {
    try {
      const raw = await readFile(join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw) as Record<string, unknown>;

      if (typeof pkg['name'] === 'string') {
        name = pkg['name'];
      }

      const allDeps: Record<string, unknown> = {
        ...((pkg['dependencies'] as Record<string, unknown>) ?? {}),
        ...((pkg['devDependencies'] as Record<string, unknown>) ?? {}),
      };

      if ('react-native' in allDeps || 'expo' in allDeps) {
        type = 'mobile';
      } else if ('electron' in allDeps) {
        type = 'desktop';
      } else if ('commander' in allDeps || 'yargs' in allDeps || 'meow' in allDeps) {
        type = 'cli';
      } else if (pkg['private'] === false || 'main' in pkg || 'exports' in pkg) {
        // Likely a published library.
        type = 'library';
      } else {
        type = 'web';
      }
    } catch {
      // Malformed package.json — keep defaults.
    }
  }

  return { type, language, name };
}
