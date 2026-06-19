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

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The decoded Canton JWT payload structure.
 * Extends the standard JWT payload with Daml-specific ledger API fields.
 */
export interface DamlTokenPayload {
  /** The acting party — the identity submitting commands to the ledger. */
  actAs: string[];
  /** Parties whose contracts this token can read. */
  readAs: string[];
  /** Optional human-readable display name (for logging). */
  sub?: string;
  /** Standard JWT expiry timestamp. */
  exp?: number;
}

/**
 * The party context attached to each authenticated request.
 * The service layer reads this to scope all ledger operations correctly.
 */
export interface PartyContext {
  /** The primary party acting on the ledger. Must be exactly one party. */
  actingParty: string;
  /** Parties whose state this party is authorised to query. */
  readAsParties: string[];
  /** The raw JWT token, forwarded to the Daml HTTP JSON API. */
  token: string;
}

// Augment the Express Request type to carry our PartyContext.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Set by the `authenticate` middleware.
       * Contains the Daml party identity for this request.
       */
      partyContext?: PartyContext;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that validates a Bearer JWT and attaches the Canton
 * party context to the request.
 *
 * Usage: `router.use(authenticate)`
 *
 * Rejects with 401 if:
 *   - No Authorization header is present.
 *   - The token is expired, malformed, or has an invalid signature.
 *   - The token does not contain at least one `actAs` party.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'MISSING_TOKEN',
      message:
        'Authorization header with Bearer token is required. ' +
        'Obtain a token from the /auth/token endpoint.',
    });
    return;
  }

  const token = authHeader.slice(7); // Strip "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.secret) as DamlTokenPayload;

    if (!payload.actAs || payload.actAs.length === 0) {
      res.status(401).json({
        error: 'INVALID_TOKEN_PAYLOAD',
        message:
          'Token must include at least one party in the `actAs` claim. ' +
          'This maps to the Daml party identity for ledger operations.',
      });
      return;
    }

    req.partyContext = {
      actingParty: payload.actAs[0],
      readAsParties: payload.readAs ?? [],
      token,
    };

    logger.debug('Authenticated request', {
      party: req.partyContext.actingParty,
      path: req.path,
    });

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'JWT token has expired. Please obtain a new token.',
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'JWT token signature is invalid.',
      });
    } else {
      logger.error('Unexpected auth error', { err });
      res.status(500).json({
        error: 'AUTH_ERROR',
        message: 'An unexpected authentication error occurred.',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Dev Helper: Token Issuer
// ---------------------------------------------------------------------------

/**
 * Issues a Canton-compatible JWT for a given Daml party.
 *
 * ⚠️  SANDBOX USE ONLY. In production, tokens must be issued by your
 * organisation's IdP (Identity Provider) via the Canton IAM integration.
 *
 * @param actAs   - The Daml party that this token acts as.
 * @param readAs  - Additional parties this token can read on behalf of.
 * @returns A signed JWT string.
 */
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
