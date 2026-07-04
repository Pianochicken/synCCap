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
  const { party, additionalActAs, readAs } = c.req.valid('json');

  logger.info('Issuing sandbox token', { party, additionalActAs, readAs });

  try {
    const partyId = await ledgerService.allocateParty(party);

    const readAsIds: string[] = [];
    for (const r of (readAs ?? [])) {
      const readPartyId = await ledgerService.allocateParty(r);
      readAsIds.push(readPartyId);
    }

    let actAsIds: string[] = [partyId];
    const extraRights: any[] = [];
    for (const a of (additionalActAs ?? [])) {
      const actPartyId = await ledgerService.allocateParty(a);
      actAsIds.push(actPartyId);
      extraRights.push({ kind: { CanActAs: { value: { party: actPartyId } } } });
    }

    if (extraRights.length > 0) {
      const userId = party.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      await ledgerService.grantUserRights(userId, extraRights);
    }

    const token = issueDevToken(actAsIds, readAsIds);
    return c.json({ token, partyId }, 200);
  } catch (err) {
    logger.warn('Canton unavailable, issuing simple token', { party, err: String(err) });
    const actAsIds = [party, ...(additionalActAs ?? [])];
    const token = issueDevToken(actAsIds, readAs);
    return c.json({ token, partyId: party }, 200);
  }
});

// ---------------------------------------------------------------------------
// Devnet M2M Token Proxy
// ---------------------------------------------------------------------------

let cachedDevnetToken: string | null = null;
let devnetTokenExpiry: number = 0;

const devnetTokenRoute = createRoute({
  method: 'get',
  path: '/devnet/token',
  summary: 'Get Seaport Devnet Token',
  description: 'Fetches the M2M JWT token for the Seaport Devnet from the authorization server.',
  responses: {
    200: {
      description: 'Devnet Token',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            expiresIn: z.number(),
          }),
        },
      },
    },
    500: {
      description: 'Failed to fetch devnet token',
    }
  },
});

import { config } from '../config';

authRouter.openapi(devnetTokenRoute, async (c) => {
  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if still valid (with a 60-second buffer)
  if (cachedDevnetToken && devnetTokenExpiry > now + 60) {
    return c.json({
      token: cachedDevnetToken,
      expiresIn: devnetTokenExpiry - now,
    }, 200);
  }

  logger.info('Fetching new Devnet M2M token...');
  try {
    const response = await fetch(config.devnet.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.devnet.clientId,
        client_secret: config.devnet.clientSecret,
        audience: config.devnet.clientId,
        scope: 'daml_ledger_api',
      }).toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('Auth server rejected request', { status: response.status, errText });
      return c.json({ error: 'Auth provider rejected request' }, 500);
    }

    const data = await response.json() as any;
    cachedDevnetToken = data.access_token;
    devnetTokenExpiry = now + (data.expires_in || 28800);

    return c.json({
      token: cachedDevnetToken,
      expiresIn: data.expires_in,
    }, 200);

  } catch (err) {
    logger.error('Failed to fetch devnet token', { err: String(err) });
    return c.json({ error: 'Failed to communicate with auth server' }, 500);
  }
});

