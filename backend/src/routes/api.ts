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

import { Router, Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { LedgerService } from '../services/LedgerService';
import { PartyContext } from '../middleware/auth';
import { logger } from '../logger';
import {
  CreateAssetSchema,
  ProposeTransferSchema,
  AcceptTransferSchema,
  InitiatePenaltySchema,
  SettlePenaltySchema,
} from '../validators';

const router = Router();
const ledgerService = new LedgerService();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the PartyContext from an authenticated request.
 * Throws if the middleware didn't set it (should never happen in practice
 * since the router is mounted behind `authenticate`).
 */
function getPartyContext(req: Request): PartyContext {
  if (!req.partyContext) {
    throw new Error(
      'PartyContext not found on request — is the authenticate middleware applied?'
    );
  }
  return req.partyContext;
}

/**
 * Validates a request body against a Zod schema.
 * Returns the parsed data on success, or sends a 400 response on failure.
 *
 * @returns Parsed data or `null` if validation failed (response already sent).
 */
function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  res: Response
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request body validation failed.',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return null;
  }
  return result.data;
}

/**
 * Maps Daml ledger errors to appropriate HTTP status codes.
 *
 * Canton error patterns:
 * - "Contract not found" → 404 (archived or never visible)
 * - "Authorization" → 403 (party not authorized for this choice)
 * - "Assertion failed" → 400 (business logic violation in Daml)
 * - Everything else → 500
 */
function mapLedgerError(
  err: unknown,
  res: Response,
  operation: string
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error("RAW LEDGER ERROR:", message);

  logger.error(`Ledger error during ${operation}`, { error: message });

  if (message.includes('NOT_FOUND') || message.includes('Contract not found')) {
    res.status(404).json({
      error: 'CONTRACT_NOT_FOUND',
      message: `The contract was not found. It may have been archived or is not visible to your party.`,
    });
  } else if (message.includes('PERMISSION_DENIED') || message.includes('Authorization')) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: `Your party is not authorized to perform this operation.`,
    });
  } else if (message.includes('INVALID_ARGUMENT') || message.includes('Assertion failed')) {
    res.status(400).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: `The operation was rejected by the smart contract: ${message}`,
    });
  } else {
    res.status(500).json({
      error: 'LEDGER_ERROR',
      message: `An unexpected error occurred while communicating with the Canton ledger.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Asset Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/assets
 *
 * Creates a new CapacityAsset representing tokenized semiconductor
 * foundry capacity.
 *
 * Canton note: Requires the token to have `actAs` for both the manufacturer
 * and owner parties (dual-signatory authorization).
 *
 * @example
 * curl -X POST http://localhost:3000/api/v1/assets \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "manufacturer": "TSMC",
 *     "owner": "AppleInc",
 *     "assetId": "LOT-TSMC-3NM-2025Q3-001",
 *     "technologyNode": "N3nm",
 *     "waferStartsPerMonth": 200,
 *     "costBasisPerWafer": "18500.00",
 *     "commitmentStartDate": "2025-07-01",
 *     "commitmentEndDate": "2026-06-30"
 *   }'
 */
router.post('/assets', async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const data = validateBody(CreateAssetSchema, req.body, res);
    if (!data) return;

    const ctx = getPartyContext(req);
    const result = await ledgerService.createCapacityAsset(ctx, data);

    res.status(201).json({
      message: 'CapacityAsset created successfully.',
      data: result,
    });
  } catch (err) {
    mapLedgerError(err, res, 'createCapacityAsset');
  }
});

/**
 * GET /api/v1/assets
 *
 * Queries all CapacityAsset contracts visible to the authenticated party.
 *
 * Canton privacy: The response is party-scoped. A manufacturer sees all
 * assets they issued. An owner sees only their own. A third party with
 * no signatory/observer relationship sees nothing.
 */
router.get('/assets', async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const ctx = getPartyContext(req);
    const assets = await ledgerService.queryAssetsByParty(ctx);

    res.status(200).json({
      data: assets,
      count: assets.length,
    });
  } catch (err) {
    mapLedgerError(err, res, 'queryAssetsByParty');
  }
});

// ---------------------------------------------------------------------------
// Transfer Routes (Dark Pool)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/transfers/propose
 *
 * Proposes a capacity transfer by creating a TransferRFQ.
 * This is the entry point to the dark pool mechanism.
 *
 * Canton privacy: The original CapacityAsset (containing costBasisPerWafer)
 * is archived in a sub-transaction invisible to the secondary buyer.
 * The buyer can only see the TransferRFQ with the asking price.
 */
router.post(
  '/transfers/propose',
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const data = validateBody(ProposeTransferSchema, req.body, res);
      if (!data) return;

      const ctx = getPartyContext(req);
      const result = await ledgerService.proposeTransfer(ctx, data);

      res.status(201).json({
        message: 'TransferRFQ created. The buyer can now see and act on this offer.',
        data: result,
      });
    } catch (err) {
      mapLedgerError(err, res, 'proposeTransfer');
    }
  }
);

/**
 * POST /api/v1/transfers/accept
 *
 * Accepts a TransferRFQ, triggering atomic settlement.
 *
 * Canton atomic settlement: In a single indivisible transaction:
 *   1. The TransferRFQ is archived.
 *   2. A new CapacityAsset is created for the buyer.
 * No partial settlement is possible.
 */
router.post(
  '/transfers/accept',
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const data = validateBody(AcceptTransferSchema, req.body, res);
      if (!data) return;

      const ctx = getPartyContext(req);
      const result = await ledgerService.acceptTransfer(ctx, data);

      res.status(200).json({
        message: 'Atomic settlement complete. New CapacityAsset created for buyer.',
        data: result,
      });
    } catch (err) {
      mapLedgerError(err, res, 'acceptTransfer');
    }
  }
);

/**
 * GET /api/v1/transfers
 *
 * Queries all TransferRFQ contracts visible to the authenticated party.
 */
router.get('/transfers', async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const ctx = getPartyContext(req);
    const rfqs = await ledgerService.queryTransferRFQs(ctx);

    res.status(200).json({
      data: rfqs,
      count: rfqs.length,
    });
  } catch (err) {
    mapLedgerError(err, res, 'queryTransferRFQs');
  }
});

// ---------------------------------------------------------------------------
// Penalty Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/penalties/initiate
 *
 * Initiates a penalty workflow for capacity cancellation.
 *
 * Canton privacy: The resulting PenaltyAgreement has ZERO observers.
 * Competitors cannot detect that a cancellation occurred.
 */
router.post(
  '/penalties/initiate',
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const data = validateBody(InitiatePenaltySchema, req.body, res);
      if (!data) return;

      const ctx = getPartyContext(req);
      const result = await ledgerService.initiatePenalty(ctx, data);

      res.status(201).json({
        message: 'PenaltyAgreement created. Only manufacturer and penalized party can see it.',
        data: result,
      });
    } catch (err) {
      mapLedgerError(err, res, 'initiatePenalty');
    }
  }
);

/**
 * POST /api/v1/penalties/settle
 *
 * Settles a PenaltyAgreement, confirming payment receipt.
 */
router.post(
  '/penalties/settle',
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const data = validateBody(SettlePenaltySchema, req.body, res);
      if (!data) return;

      const ctx = getPartyContext(req);
      const result = await ledgerService.settlePenalty(ctx, data);

      res.status(200).json({
        message: 'Penalty settled successfully.',
        data: result,
      });
    } catch (err) {
      mapLedgerError(err, res, 'settlePenalty');
    }
  }
);

/**
 * GET /api/v1/penalties
 *
 * Queries all PenaltyAgreement contracts visible to the authenticated party.
 *
 * Canton privacy: Only returns penalties where the party is a signatory.
 * A competing buyer querying this endpoint receives an empty array.
 */
router.get('/penalties', async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const ctx = getPartyContext(req);
    const penalties = await ledgerService.queryPenaltyAgreements(ctx);

    res.status(200).json({
      data: penalties,
      count: penalties.length,
    });
  } catch (err) {
    mapLedgerError(err, res, 'queryPenaltyAgreements');
  }
});

export { router as apiRouter };
