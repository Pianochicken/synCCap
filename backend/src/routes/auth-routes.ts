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
 * Canton 3.x Party IDs:
 * ---------------------
 * Parties on Canton 3.x have fully-qualified IDs in the format:
 *   `DisplayName::1220<fingerprint>`
 *
 * This endpoint allocates the party on the sandbox (if it doesn't exist)
 * and embeds the REAL, fully-qualified party ID in the JWT.
 */

import { Router, Request, Response } from 'express';
import { issueDevToken } from '../middleware/auth';
import { IssueTokenSchema } from '../validators';
import { LedgerService } from '../services/LedgerService';
import { logger } from '../logger';
import { config } from '../config';

const router = Router();
const ledgerService = new LedgerService();

/**
 * POST /auth/token
 *
 * Allocates parties on the Canton sandbox and issues a JWT with real party IDs.
 *
 * Request body:
 *   { "party": "TSMC", "readAs": ["AppleInc"] }
 *
 * Response:
 *   { "token": "eyJhbGciOi...", "partyId": "TSMC::1220abc..." }
 *
 * @example
 * curl -X POST http://localhost:3000/auth/token \
 *   -H "Content-Type: application/json" \
 *   -d '{"party": "TSMC"}'
 */
router.post('/token', async (req: Request, res: Response): Promise<void> => {
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

  try {
    // Allocate the primary party on the Canton sandbox to get its full ID.
    // If Canton is unavailable (e.g., unit tests without sandbox), falls back below.
    const partyId = await ledgerService.allocateParty(party);

    // Allocate readAs parties too
    const readAsIds: string[] = [];
    for (const r of (readAs ?? [])) {
      const readPartyId = await ledgerService.allocateParty(r);
      readAsIds.push(readPartyId);
    }

    // Issue JWT with the REAL fully-qualified party IDs
    const token = issueDevToken(partyId, readAsIds);
    res.status(200).json({ token, partyId });
  } catch (err) {
    // If Canton is unavailable, fall back to simple token (for unit tests)
    logger.warn('Canton unavailable, issuing simple token', { party, err: String(err) });
    const token = issueDevToken(party, readAs);
    res.status(200).json({ token, partyId: party });
  }
});

export { router as authRouter };
