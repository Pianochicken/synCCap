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

import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { config } from './config';
import { logger } from './logger';
import { authenticate, AuthVariables } from './middleware/auth';
import { authRouter } from './routes/auth-routes';
import { apiRouter } from './routes/api';

/**
 * Creates and configures the Hono application.
 */
export function createApp() {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>();

  // Global Middleware
  app.use('*', cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Request logging
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    logger.info(`${c.req.method} ${c.req.url} - ${c.res.status} - ${Date.now() - start}ms`);
  });

  // Health Check
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      service: 'synccap-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // OpenAPI Documentation Generator
  app.doc('/docs', {
    openapi: '3.0.0',
    info: {
      title: 'synCCap API',
      version: '0.1.0',
      description: 'Canton Network Ledger API bridge for semiconductor capacity tokenization',
    },
  });

  // Swagger UI
  app.get('/swagger', swaggerUI({ url: '/docs' }));

  // Route Mounting
  app.route('/auth', authRouter);

  // Authenticated routes
  app.use('/api/v1/*', authenticate);
  app.route('/api/v1', apiRouter);

  // 404 Catch-All
  app.notFound((c) => {
    return c.json({
      error: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} does not exist.`,
    }, 404);
  });

  // Global Error Handler
  app.onError((err, c) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
    });

    return c.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: config.env === 'production' ? 'An unexpected error occurred.' : err.message,
    }, 500);
  });

  return app;
}
