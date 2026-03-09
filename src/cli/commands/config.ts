import { Command } from 'commander';
import { copyFile, access } from 'fs/promises';
import { join, resolve } from 'path';
import {
  loadConfig,
  loadConfigFromFile,
  validateConfig,
  formatValidationResult,
} from '../../config/index.js';
import { detectProject } from '../../config/detect.js';
import { logger } from '../../logger.js';

/** `zaria config` — configuration management sub-commands. */
export const configCommand = new Command('config').description('Manage Zaria configuration');

// ---------------------------------------------------------------------------
// config init
// ---------------------------------------------------------------------------

/** `zaria config init` — scaffolds a .zariarc.yml from the bundled template. */
configCommand
  .command('init')
  .description('Scaffold a .zariarc config file in the current directory')
  .option('--dir <path>', 'target directory (default: current directory)')
  .option('--force', 'overwrite an existing config file')
  .action(async (opts: { dir?: string; force?: boolean }) => {
    const targetDir = resolve(opts.dir ?? '.');
    const destPath = join(targetDir, '.zariarc.yml');

    // Abort if a config already exists and --force is not set.
    const alreadyExists = await access(destPath)
      .then(() => true)
      .catch(() => false);

    if (alreadyExists && !opts.force) {
      logger.warn(`⚠️  .zariarc.yml already exists in ${targetDir}. Use --force to overwrite.`);
      process.exitCode = 1;
      return;
    }

    // Locate the bundled example template.
    // In a built package, __dirname resolves to dist/cli/commands/;
    // the template lives at the project root.
    let templatePath: string;
    try {
      // Walk up from the current file's directory to find the project root.
      // dist/cli/commands → dist/cli → dist → project root
      const pkgRoot = resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');
      templatePath = join(pkgRoot, '.zariarc.example.yml');
      await access(templatePath);
    } catch {
      // Fallback for development (src/ layout).
      try {
        const devRoot = resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');
        templatePath = join(devRoot, '.zariarc.example.yml');
        await access(templatePath);
      } catch {
        logger.error('❌  Could not locate .zariarc.example.yml template.');
        process.exitCode = 1;
        return;
      }
    }

    // Detect project metadata to report to the user.
    const detected = await detectProject(targetDir);

    await copyFile(templatePath, destPath);

    logger.info(`✅  Created .zariarc.yml in ${targetDir}`);
    if (detected.name) {
      logger.info(`    Detected project: ${detected.name}`);
    }
    logger.info(`    Detected type   : ${detected.type}`);
    logger.info(`    Detected language: ${detected.language}`);
    logger.info(`\n    Edit .zariarc.yml to customise thresholds, ignored paths, and plugins.`);

    // Hint: update project.type and project.language to match detection.
    if (detected.type !== 'web' || detected.language !== 'typescript') {
      logger.info(
        `\n    💡  Update project.type to "${detected.type}" and project.language to "${detected.language}".`,
      );
    }
  });

// ---------------------------------------------------------------------------
// config validate
// ---------------------------------------------------------------------------

/** `zaria config validate` — validates the current config file. */
configCommand
  .command('validate')
  .description('Validate the current .zariarc file')
  .option('--config <path>', 'path to the config file to validate')
  .action(async (opts: { config?: string }) => {
    try {
      let result;
      let filePath: string | undefined;

      if (opts.config) {
        result = await loadConfigFromFile(resolve(opts.config));
        filePath = result.filePath;
      } else {
        result = await loadConfig();
        filePath = result?.filePath;
      }

      if (!result) {
        logger.warn('⚠️  No config file found. Run `zaria config init` to create one.');
        return;
      }

      // Run semantic validation on top of the already schema-validated config.
      const validation = validateConfig(result.config);
      logger.info(formatValidationResult(validation, filePath));

      if (!validation.valid) {
        process.exitCode = 1;
      }
    } catch (err: unknown) {
      // loadConfig / loadConfigFromFile throws on parse errors.
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`❌  ${message}`);
      process.exitCode = 1;
    }
  });
