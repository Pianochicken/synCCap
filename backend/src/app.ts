/**
 * @file app.ts
 * @description Express application factory for the synCCap backend.
 *
 * Exports the configured Express app **without** starting the HTTP listener.
 * This separation enables:
 *   1. Integration tests to import the app and use `supertest` without
 *      binding to a real port.
 *   2. The `server.ts` entrypoint to control the listen lifecycle
 *      (including graceful shutdown).
 *
 * Middleware Stack:
 * -----------------
 * 1. helmet()       — Secure HTTP headers (XSS, clickjacking, MIME sniffing)
 * 2. cors()         — Cross-origin resource sharing for frontend dev servers
 * 3. express.json() — JSON body parser (16kb limit for safety)
 * 4. rateLimit()    — Request throttling (100 req/15min per IP)
 * 5. /auth/*        — Unauthenticated routes (sandbox token issuance)
 * 6. /api/v1/*      — Authenticated routes (all ledger operations)
 * 7. 404 handler    — Catch-all for unmatched routes
 * 8. Error handler  — Global error boundary
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './logger';
import { authenticate } from './middleware/auth';
import { authRouter } from './routes/auth-routes';
import { apiRouter } from './routes/api';

// ---------------------------------------------------------------------------
// App Factory
// ---------------------------------------------------------------------------

/**
 * Creates and configures the Express application.
 *
 * @returns Configured Express app (not yet listening).
 */
export function createApp(): express.Application {
  const app = express();

  // -------------------------------------------------------------------------
  // Global Middleware
  // -------------------------------------------------------------------------

  // Security headers
  app.use(helmet());

  // CORS — allow requests from configured frontend origins
  app.use(
    cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
    })
  );

  // JSON body parser with a sane size limit
  app.use(express.json({ limit: '16kb' }));

  // Rate limiting — protect against abuse
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window per IP
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    })
  );

  // -------------------------------------------------------------------------
  // Health Check
  // -------------------------------------------------------------------------

  /**
   * GET /health
   *
   * Simple health check endpoint. Does not require authentication.
   * Used by load balancers and orchestrators to verify the service is running.
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'synccap-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------------------
  // Route Mounting
  // -------------------------------------------------------------------------

  // Unauthenticated: sandbox token issuance
  app.use('/auth', authRouter);

  // Authenticated: all ledger operations require a valid JWT
  app.use('/api/v1', authenticate, apiRouter);

  // -------------------------------------------------------------------------
  // 404 Catch-All
  // -------------------------------------------------------------------------

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${_req.method} ${_req.path} does not exist.`,
    });
  });

  // -------------------------------------------------------------------------
  // Global Error Handler
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message:
        config.env === 'production'
          ? 'An unexpected error occurred.'
          : err.message,
    });
  });

  return app;
}
