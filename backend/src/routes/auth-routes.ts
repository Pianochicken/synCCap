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

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { issueDevToken } from '../middleware/auth';
import { IssueTokenSchema } from '../validators';
import { LedgerService } from '../services/LedgerService';
import { logger } from '../logger';

export const authRouter = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid token request.',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }, 400);
    }
    return;
  }
});
const ledgerService = new LedgerService();

const tokenRoute = createRoute({
  method: 'post',
  path: '/token',
  summary: 'Issue a Canton sandbox development token',
  description: 'Allocates parties on the Canton sandbox and issues a JWT with real party IDs. SANDBOX USE ONLY.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: IssueTokenSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token generated successfully',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            partyId: z.string(),
          }),
        },
      },
    },
  },
});

authRouter.openapi(tokenRoute, async (c) => {
  const { party, readAs } = c.req.valid('json');

  logger.info('Issuing sandbox token', { party, readAs });

  try {
    const partyId = await ledgerService.allocateParty(party);

    const readAsIds: string[] = [];
    for (const r of (readAs ?? [])) {
      const readPartyId = await ledgerService.allocateParty(r);
      readAsIds.push(readPartyId);
    }

    let actAsIds: string[] = [partyId];
    if (party === 'TSMC') {
      const appleId = await ledgerService.allocateParty('AppleInc');
      const qualcommId = await ledgerService.allocateParty('QualcommInc');
      actAsIds.push(appleId, qualcommId);
    }

    const token = issueDevToken(actAsIds, readAsIds);
    return c.json({ token, partyId }, 200);
  } catch (err) {
    logger.warn('Canton unavailable, issuing simple token', { party, err: String(err) });
    const token = issueDevToken(party, readAs);
    return c.json({ token, partyId: party }, 200);
  }
});
