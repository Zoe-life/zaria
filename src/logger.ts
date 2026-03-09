/**
 * Zaria structured logger — singleton pino instance.
 *
 * Behaviour:
 *  - When stdout is a TTY (interactive terminal), pino-pretty is used as a
 *    transport so output is human-readable and colourised.
 *  - In non-TTY contexts (CI, pipes, log aggregators), pino emits newline-
 *    delimited JSON — the standard format for structured log ingestion.
 *
 * Log level:
 *  - Defaults to `info`.
 *  - Set `ZARIA_LOG_LEVEL` env var to override (e.g. `debug`, `warn`, `silent`).
 *
 * Usage:
 *  ```ts
 *  import { logger } from './logger.js';
 *  logger.info('Audit started');
 *  logger.warn({ path }, 'Config file missing');
 *  logger.error({ err }, 'Unexpected failure');
 *  ```
 */

import pino from 'pino';

const level = process.env['ZARIA_LOG_LEVEL'] ?? 'info';

/** Whether stdout is an interactive terminal. */
const isTTY = Boolean(process.stdout.isTTY);

export const logger = pino(
  { level, name: 'zaria' },
  isTTY
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: false,
          ignore: 'pid,hostname,name',
          messageFormat: '{msg}',
        },
      })
    : process.stdout,
);
