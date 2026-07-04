/**
 * @file server.ts
 * @description Server entrypoint for the synCCap backend.
 *
 * This module:
 *   1. Creates the Express app via the `createApp` factory.
 *   2. Starts the HTTP listener on the configured port.
 *   3. Registers SIGTERM/SIGINT handlers for graceful shutdown.
 *
 * Graceful Shutdown:
 * ------------------
 * When the process receives SIGTERM or SIGINT:
 *   1. The HTTP server stops accepting new connections.
 *   2. In-flight requests are allowed to complete (up to a timeout).
 *   3. The process exits cleanly.
 *
 * This is important for Canton integrations because abruptly killing
 * the process during an in-flight ledger command could leave the
 * client in an ambiguous state (command may or may not have been
 * committed to the Canton sequencer).
 */

import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';

const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    logger.info(`synCCap backend started`, {
      port: info.port,
      env: config.env,
      ledgerUrl: config.ledger.baseUrl,
    });
    logger.info('Available endpoints:');
    logger.info(`  Swagger UI: http://localhost:${info.port}/swagger`);
    logger.info(`  OpenAPI Spec: http://localhost:${info.port}/docs`);
    logger.info('  POST /auth/token              — Issue sandbox JWT');
    logger.info('  GET  /health                  — Health check');
    logger.info('  POST /api/v1/assets           — Create CapacityAsset');
    logger.info('  GET  /api/v1/assets           — Query assets');
    logger.info('  POST /api/v1/transfers/propose — Propose transfer (dark pool)');
    logger.info('  POST /api/v1/transfers/accept  — Accept transfer (atomic settlement)');
    logger.info('  GET  /api/v1/transfers         — Query transfer RFQs');
    logger.info('  POST /api/v1/penalties/initiate — Initiate penalty');
    logger.info('  POST /api/v1/penalties/settle   — Settle penalty');
    logger.info('  GET  /api/v1/penalties          — Query penalties');
  }
);

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed. All in-flight requests completed.');
    process.exit(0);
  });

  // Force exit if server.close() hangs beyond the timeout
  setTimeout(() => {
    logger.warn(
      `Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
