/**
 * @file routes/api.ts
 * @description REST API routes for synCCap ledger operations.
 *
 * All routes in this module are mounted under `/api/v1/` and require
 * the `authenticate` middleware to have populated `req.partyContext`.
 *
 * Route Design:
 * -------------
 * - POST routes for state-changing operations (create, exercise choices).
 * - GET routes for read-only queries.
 * - Request bodies are validated with Zod schemas before reaching the service.
 * - Errors from the Daml ledger are caught and mapped to appropriate HTTP
 *   status codes (400 for validation/business logic, 500 for unexpected).
 *
 * Canton-Specific Patterns:
 * -------------------------
 * - The authenticated party determines visibility. A GET /assets by party A
 *   returns a completely different set than party B — this is Canton's
 *   privacy model in action, enforced at the ledger level.
 * - Exercise operations (transfer, penalty) operate on contract IDs. If a
 *   contract has already been archived (e.g., double-accept), the ledger
 *   returns an error which is surfaced as a 400 response.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { LedgerService } from '../services/LedgerService';
import { AuthVariables } from '../middleware/auth';
import { logger } from '../logger';
import { broadcastRefresh } from '../ws';
import {
  CreateAssetSchema,
  ProposeTransferSchema,
  AcceptTransferSchema,
  WithdrawRFQSchema,
  RejectTransferSchema,
  AcknowledgeRejectionSchema,
  InitiatePenaltySchema,
  SettlePenaltySchema,
} from '../validators';

export const apiRouter = new OpenAPIHono<{ Variables: AuthVariables }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({
        error: 'VALIDATION_ERROR',
        message: 'Request body validation failed.',
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPartyContext(c: any) {
  const ctx = c.get('partyContext');
  if (!ctx) throw new Error('PartyContext not found. Is authenticate middleware applied?');
  return ctx;
}

function mapLedgerError(err: unknown, c: any, operation: string) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("RAW LEDGER ERROR:", message);
  logger.error(`Ledger error during ${operation}`, { error: message });

  if (message.includes('NOT_FOUND') || message.includes('Contract not found')) {
    return c.json({ error: 'CONTRACT_NOT_FOUND', message: 'Contract not found or not visible.' }, 404);
  } else if (message.includes('PERMISSION_DENIED') || message.includes('Authorization')) {
    return c.json({ error: 'FORBIDDEN', message: 'Not authorized.' }, 403);
  } else if (message.includes('INVALID_ARGUMENT') || message.includes('Assertion failed')) {
    return c.json({ error: 'BUSINESS_LOGIC_ERROR', message }, 400);
  } else {
    return c.json({ error: 'LEDGER_ERROR', message: 'Unexpected Canton error.' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/assets',
    summary: 'Create a CapacityAsset',
    request: { body: { content: { 'application/json': { schema: CreateAssetSchema } } } },
    responses: {
      201: { description: 'Asset created', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.createCapacityAsset(ctx, data);
      broadcastRefresh();
      return c.json({ message: 'CapacityAsset created successfully.', data: result }, 201);
    } catch (err) {
      return mapLedgerError(err, c, 'createCapacityAsset');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/assets',
    summary: 'Query CapacityAssets',
    responses: {
      200: { description: 'List of assets', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const assets = await ledgerService.queryAssetsByParty(ctx);
      return c.json({ data: assets, count: assets.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryAssetsByParty');
    }
  }
);
apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/financials',
    summary: 'Query CapacityFinancials',
    responses: {
      200: { description: 'List of financials', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const financials = await ledgerService.queryFinancialsByParty(ctx);
      return c.json({ data: financials, count: financials.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryFinancialsByParty');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/locks',
    summary: 'Query CapacityAssetLocks',
    responses: {
      200: { description: 'List of locks', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const locks = await ledgerService.queryLocksByParty(ctx);
      return c.json({ data: locks, count: locks.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryLocksByParty');
    }
  }
);
apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/transfers/propose',
    summary: 'Propose a capacity transfer (Dark Pool)',
    request: { body: { content: { 'application/json': { schema: ProposeTransferSchema } } } },
    responses: {
      201: { description: 'TransferRFQ created', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.proposeTransfer(ctx, data);
      broadcastRefresh();
      return c.json({ message: 'TransferRFQ created.', data: result }, 201);
    } catch (err) {
      return mapLedgerError(err, c, 'proposeTransfer');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/transfers/accept',
    summary: 'Accept a TransferRFQ (Atomic settlement)',
    request: { body: { content: { 'application/json': { schema: AcceptTransferSchema } } } },
    responses: {
      200: { description: 'Transfer settled', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.acceptTransfer(ctx, data);
      broadcastRefresh();
      return c.json({ message: 'Atomic settlement complete.', data: result }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'acceptTransfer');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/transfers/withdraw',
    summary: 'Withdraw a TransferRFQ',
    request: { body: { content: { 'application/json': { schema: WithdrawRFQSchema } } } },
    responses: {
      200: { description: 'Transfer withdrawn', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.withdrawRFQ(ctx, data.rfqContractId);
      broadcastRefresh();
      return c.json({ message: 'Transfer RFQ withdrawn.', data: result }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'withdrawRFQ');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/transfers/reject',
    summary: 'Reject a TransferRFQ',
    request: { body: { content: { 'application/json': { schema: RejectTransferSchema } } } },
    responses: {
      200: { description: 'Transfer rejected', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.rejectTransfer(ctx, data.rfqContractId);
      broadcastRefresh();
      return c.json({ message: 'Transfer RFQ rejected.', data: result }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'rejectTransfer');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/transfers/acknowledge-rejection',
    summary: 'Acknowledge a rejected transfer and restore asset',
    request: { body: { content: { 'application/json': { schema: AcknowledgeRejectionSchema } } } },
    responses: {
      200: { description: 'Asset restored', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.acknowledgeRejection(ctx, data.logContractId);
      broadcastRefresh();
      return c.json({ message: 'Asset restored.', data: result }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'acknowledgeRejection');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/transfers',
    summary: 'Query TransferRFQs',
    responses: {
      200: { description: 'List of transfers', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const rfqs = await ledgerService.queryTransferRFQs(ctx);
      return c.json({ data: rfqs, count: rfqs.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryTransferRFQs');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/penalties/initiate',
    summary: 'Initiate a penalty workflow',
    request: { body: { content: { 'application/json': { schema: InitiatePenaltySchema } } } },
    responses: {
      201: { description: 'PenaltyAgreement created', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.initiatePenalty(ctx, data);
      broadcastRefresh();
      return c.json({ message: 'PenaltyAgreement created.', data: result }, 201);
    } catch (err) {
      return mapLedgerError(err, c, 'initiatePenalty');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'post',
    path: '/penalties/settle',
    summary: 'Settle a PenaltyAgreement',
    request: { body: { content: { 'application/json': { schema: SettlePenaltySchema } } } },
    responses: {
      200: { description: 'Penalty settled', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const ctx = getPartyContext(c);
      const result = await ledgerService.settlePenalty(ctx, data);
      broadcastRefresh();
      return c.json({ message: 'Penalty settled successfully.', data: result }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'settlePenalty');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/penalties',
    summary: 'Query PenaltyAgreements',
    responses: {
      200: { description: 'List of penalties', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const penalties = await ledgerService.queryPenaltyAgreements(ctx);
      return c.json({ data: penalties, count: penalties.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryPenaltyAgreements');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/logs/rejected',
    summary: 'Query RejectedTransferLogs',
    responses: {
      200: { description: 'List of rejected logs', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const logs = await ledgerService.queryRejectedLogs(ctx);
      return c.json({ data: logs, count: logs.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryRejectedLogs');
    }
  }
);

apiRouter.openapi(
  createRoute({
    method: 'get',
    path: '/logs/withdrawn',
    summary: 'Query WithdrawnTransferLogs',
    responses: {
      200: { description: 'List of withdrawn logs', content: { 'application/json': { schema: z.any() } } }
    }
  }),
  async (c) => {
    try {
      const ctx = getPartyContext(c);
      const logs = await ledgerService.queryWithdrawnLogs(ctx);
      return c.json({ data: logs, count: logs.length }, 200);
    } catch (err) {
      return mapLedgerError(err, c, 'queryWithdrawnLogs');
    }
  }
);
