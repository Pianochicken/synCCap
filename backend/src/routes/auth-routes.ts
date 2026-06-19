/**
 * @file routes/auth-routes.ts
 * @description Authentication routes for issuing Canton sandbox JWT tokens.
 *
 * ⚠️ SANDBOX / DEVELOPMENT USE ONLY.
 *
 * In a production Canton deployment, tokens are issued by the participant
 * node's IAM system (Identity Provider). The `/auth/token` endpoint here
 * is a convenience for local development and hackathon demos — it lets
 * you obtain a Canton-compatible JWT for any party by name.
 *
 * Token Format:
 * -------------
 * The issued JWT contains:
 *   - `sub`:    Party display name (for logging/debugging)
 *   - `actAs`:  Array of parties this token can submit commands as
 *   - `readAs`: Array of parties whose contracts this token can query
 *   - `exp`:    Expiry timestamp
 *
 * The Canton sandbox validates the HS256 signature against the configured
 * secret and extracts actAs/readAs to scope all ledger operations.
 */

import { Router, Request, Response } from 'express';
import { issueDevToken } from '../middleware/auth';
import { IssueTokenSchema } from '../validators';
import { logger } from '../logger';

const router = Router();

/**
 * POST /auth/token
 *
 * Issues a Canton-compatible JWT for a given Daml party name.
 *
 * Request body:
 *   { "party": "TSMC", "readAs": ["AppleInc"] }
 *
 * Response:
 *   { "token": "eyJhbGciOi..." }
 *
 * @example
 * curl -X POST http://localhost:3000/auth/token \
 *   -H "Content-Type: application/json" \
 *   -d '{"party": "TSMC"}'
 */
router.post('/token', (req: Request, res: Response): void => {
  const parsed = IssueTokenSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid token request.',
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const { party, readAs } = parsed.data;

  logger.info('Issuing sandbox token', { party, readAs });

  const token = issueDevToken(party, readAs);

  res.status(200).json({ token });
});

export { router as authRouter };
