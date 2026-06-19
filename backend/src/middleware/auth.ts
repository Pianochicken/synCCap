/**
 * @file middleware/auth.ts
 * @description Authentication middleware that maps HTTP JWT tokens to Daml party identities.
 *
 * Canton-specific Design:
 * -------------------------
 * Every operation on the Canton Ledger is scoped to a specific party.
 * The Daml authorization model requires knowing *which party* is acting
 * (actAs) and which parties can be read on behalf of (readAs).
 *
 * This middleware:
 *   1. Extracts the Bearer token from the Authorization header.
 *   2. Verifies the JWT signature (HS256 for sandbox, RS256 in production).
 *   3. Decodes the Canton Ledger API token payload to extract party information.
 *   4. Attaches the party context to the Express request object.
 *
 * Token Format (Canton Sandbox / JWT):
 * -------------------------------------
 * The Canton sandbox accepts tokens with the following payload structure:
 *
 * {
 *   "sub": "party-display-name",
 *   "scope": "daml_ledger_api",
 *   "actAs": ["party-id"],        // Parties this token can act as
 *   "readAs": ["party-id"],       // Parties this token can read on behalf of
 *   "exp": 1234567890
 * }
 *
 * For production Canton nodes, these are issued by a proper IdP (Identity
 * Provider) and validated with RS256. See Canton docs on IAM integration.
 */

import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DamlTokenPayload {
  actAs: string[];
  readAs: string[];
  sub?: string;
  exp?: number;
}

export interface PartyContext {
  actingParty: string;
  readAsParties: string[];
  token: string;
}

/**
 * Hono Variables for type-safe context injection.
 */
export type AuthVariables = {
  partyContext: PartyContext;
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function authenticate(c: Context<{ Variables: AuthVariables }>, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: 'MISSING_TOKEN',
      message: 'Authorization header with Bearer token is required. Obtain a token from the /auth/token endpoint.',
    }, 401);
  }

  const token = authHeader.slice(7); // Strip "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.secret) as DamlTokenPayload;

    if (!payload.actAs || payload.actAs.length === 0) {
      return c.json({
        error: 'INVALID_TOKEN_PAYLOAD',
        message: 'Token must include at least one party in the `actAs` claim.',
      }, 401);
    }

    c.set('partyContext', {
      actingParty: payload.actAs[0],
      readAsParties: payload.readAs ?? [],
      token,
    });

    logger.debug('Authenticated request', {
      party: payload.actAs[0],
      path: c.req.path,
    });

    await next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return c.json({
        error: 'TOKEN_EXPIRED',
        message: 'JWT token has expired. Please obtain a new token.',
      }, 401);
    } else if (err instanceof jwt.JsonWebTokenError) {
      return c.json({
        error: 'INVALID_TOKEN',
        message: 'JWT token signature is invalid.',
      }, 401);
    } else {
      logger.error('Unexpected auth error', { err });
      return c.json({
        error: 'AUTH_ERROR',
        message: 'An unexpected authentication error occurred.',
      }, 500);
    }
  }
}

// ---------------------------------------------------------------------------
// Dev Helper: Token Issuer
// ---------------------------------------------------------------------------

export function issueDevToken(actAs: string, readAs: string[] = []): string {
  const payload: DamlTokenPayload = {
    actAs: [actAs],
    readAs,
    sub: actAs,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expirySeconds,
    algorithm: 'HS256',
  });
}
