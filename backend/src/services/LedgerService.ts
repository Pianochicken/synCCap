/**
 * @file services/LedgerService.ts
 * @description Typed service layer wrapping the Canton JSON Ledger API v2.
 *
 * Architecture:
 * -------------
 * This service is the **only** module that communicates with the Canton
 * participant node. It is fully decoupled from Express — every method
 * accepts a {@link PartyContext} and returns a typed result. This makes
 * the service independently testable and swappable (e.g., for a mock
 * implementation in unit tests).
 *
 * Canton SDK 3.x Integration:
 * ----------------------------
 * The legacy `@daml/ledger` npm package is NOT compatible with Canton 3.x.
 * Instead, this service communicates directly with the Canton JSON Ledger
 * API v2 via raw HTTP fetch calls:
 *
 *   - POST /v2/commands/submit-and-wait  — Create contracts & exercise choices
 *   - POST /v2/state/active-contracts    — Query the Active Contract Set (ACS)
 *   - GET  /v2/state/ledger-end          — Get the current ledger offset
 *
 * This approach is the recommended pattern for Canton 3.x applications.
 * See: Canton docs on JSON Ledger API v2.
 *
 * Template IDs:
 * -------------
 * Canton 3.x requires fully qualified template IDs in the format:
 *   `packageId:ModuleName:TemplateName`
 *
 * The package ID is extracted from the codegen output at startup and
 * used to construct all template IDs.
 *
 * Numeric Handling:
 * -----------------
 * All Daml `Numeric` fields are represented as **strings** in the JSON
 * encoding to preserve arbitrary decimal precision. This service accepts
 * string inputs for all financial values and passes them directly to the
 * ledger without lossy floating-point conversion.
 */

import { PartyContext } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../logger';
import {
  CreateAssetRequest,
  ProposeTransferRequest,
  AcceptTransferRequest,
  InitiatePenaltyRequest,
  SettlePenaltyRequest,
} from '../validators';

// Import the package ID from the codegen output
import { packageId, Main } from '@daml.js/synccap-0.1.0';

// Alias the generated template types for cleaner usage
type CapacityAssetType = Main.CapacityAsset;
type TransferRFQType = Main.TransferRFQ;
type PenaltyAgreementType = Main.PenaltyAgreement;

// ---------------------------------------------------------------------------
// Canton JSON API v2 Constants
// ---------------------------------------------------------------------------

/** Fully qualified template IDs for the Canton JSON API v2. */
const TEMPLATE_IDS = {
  CapacityAsset: `${packageId}:Main:CapacityAsset`,
  TransferRFQ: `${packageId}:Main:TransferRFQ`,
  PenaltyAgreement: `${packageId}:Main:PenaltyAgreement`,
} as const;

// ---------------------------------------------------------------------------
// Canton API Response Types
// ---------------------------------------------------------------------------

/**
 * A contract event as returned by the Canton JSON API v2.
 * This represents a single active contract in the ACS query response.
 */
interface CantonCreatedEvent {
  createdEvent: {
    contractId: string;
    templateId: string;
    createArguments: Record<string, unknown>;
  };
}

/**
 * Response from POST /v2/commands/submit-and-wait.
 * Contains the transaction result including created/exercised events.
 */
interface SubmitAndWaitResponse {
  transaction?: {
    events: CantonEvent[];
  };
  exerciseResult?: string;
}

/** Union of event types returned in transaction results. */
interface CantonEvent {
  createdEvent?: {
    contractId: string;
    templateId: string;
    createArguments: Record<string, unknown>;
  };
  exercisedEvent?: {
    contractId: string;
    templateId: string;
    choice: string;
    exerciseResult: unknown;
    childEvents?: CantonEvent[];
  };
}

/**
 * Response from GET /v2/state/ledger-end.
 */
interface LedgerEndResponse {
  offset: string;
}

/**
 * Response from POST /v2/state/active-contracts.
 * Returns a stream-like response with contract entries.
 */
interface ActiveContractsResponse {
  contractEntry?: {
    createdEvent: {
      contractId: string;
      templateId: string;
      createArguments: Record<string, unknown>;
    };
  };
  activeAtOffset?: string;
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

/**
 * Result of creating a new CapacityAsset on the ledger.
 * Contains the contract ID needed for subsequent operations (transfer, penalty).
 */
export interface CreateAssetResult {
  /** The ledger-assigned contract ID for the new CapacityAsset. */
  contractId: string;
  /** Echo of the asset ID for client-side correlation. */
  assetId: string;
}

/**
 * Result of proposing a transfer (creating a TransferRFQ).
 * The RFQ contract ID is needed by the buyer to accept/reject.
 */
export interface ProposeTransferResult {
  /** Contract ID of the newly created TransferRFQ. */
  rfqContractId: string;
  /** The buyer who can now see and act on this RFQ. */
  buyer: string;
}

/**
 * Result of accepting a transfer (atomic settlement).
 * Contains the new CapacityAsset contract ID owned by the buyer.
 */
export interface AcceptTransferResult {
  /** Contract ID of the new CapacityAsset (owned by buyer). */
  newAssetContractId: string;
}

/**
 * Result of initiating a penalty workflow.
 * Contains the PenaltyAgreement contract ID.
 */
export interface InitiatePenaltyResult {
  /** Contract ID of the new PenaltyAgreement. */
  penaltyContractId: string;
}

/**
 * Result of settling a penalty.
 * Contains the updated (settled) PenaltyAgreement contract ID.
 */
export interface SettlePenaltyResult {
  /** Contract ID of the settled PenaltyAgreement. */
  settledContractId: string;
}

/**
 * A CapacityAsset contract as returned by query operations.
 * Includes the contract ID alongside all template fields.
 */
export interface AssetContract {
  contractId: string;
  payload: CapacityAssetType;
}

/**
 * A TransferRFQ contract as returned by query operations.
 */
export interface TransferRFQContract {
  contractId: string;
  payload: TransferRFQType;
}

/**
 * A PenaltyAgreement contract as returned by query operations.
 */
export interface PenaltyAgreementContract {
  contractId: string;
  payload: PenaltyAgreementType;
}

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

/**
 * LedgerService: The sole interface between the synCCap backend and the
 * Canton participant node's JSON Ledger API v2.
 *
 * Canton 3.x notes:
 * - Uses raw HTTP against /v2/ endpoints (NOT the deprecated @daml/ledger).
 * - All operations are scoped to the party encoded in the JWT token.
 * - Template IDs use the format `packageId:ModuleName:TemplateName`.
 * - The Canton ledger enforces signatory/observer rules server-side;
 *   this service does not replicate those checks.
 * - Contract IDs are opaque strings that expire when contracts are archived.
 */
export class LedgerService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? config.ledger.baseUrl;
  }

  // -------------------------------------------------------------------------
  // Canton JSON API v2 HTTP Helpers
  // -------------------------------------------------------------------------

  /**
   * Makes an authenticated HTTP request to the Canton JSON Ledger API v2.
   *
   * @param ctx - Party context containing the JWT token.
   * @param path - API endpoint path (e.g., '/v2/commands/submit-and-wait').
   * @param body - Request body to send as JSON.
   * @returns Parsed JSON response.
   * @throws Error with descriptive message if the request fails.
   */
  private async cantonFetch<T>(
    ctx: PartyContext,
    path: string,
    body: Record<string, unknown>,
    method: 'POST' | 'GET' = 'POST'
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    logger.debug('Canton API request', { method, path, party: ctx.actingParty });

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.token}`,
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Canton API error', {
        status: response.status,
        path,
        body: errorBody,
      });
      throw new Error(
        `Canton API error (${response.status}): ${errorBody}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetches the current ledger end offset, required for ACS queries.
   *
   * Canton note: The active contracts query requires an offset to ensure
   * a consistent snapshot. This offset represents the latest committed
   * transaction on the ledger.
   */
  private async getLedgerEnd(ctx: PartyContext): Promise<string> {
    const url = `${this.baseUrl}/v2/state/ledger-end`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get ledger end: ${response.status}`);
    }

    const data = (await response.json()) as LedgerEndResponse;
    return data.offset;
  }

  /**
   * Submits a command (create or exercise) to the Canton ledger and waits
   * for the transaction to be committed.
   *
   * Canton note: The submit-and-wait endpoint is synchronous — it blocks
   * until the transaction is sequenced and committed, or returns an error.
   * This is the recommended approach for command submission in interactive
   * applications.
   *
   * @param ctx - Party context.
   * @param commands - Array of Daml commands to submit.
   * @param actAs - Parties to act as (defaults to the authenticated party).
   * @returns The transaction result.
   */
  private async submitAndWait(
    ctx: PartyContext,
    commands: Record<string, unknown>[],
    actAs?: string[]
  ): Promise<SubmitAndWaitResponse> {
    const commandId = `synccap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return this.cantonFetch<SubmitAndWaitResponse>(
      ctx,
      '/v2/commands/submit-and-wait',
      {
        commands,
        actAs: actAs ?? [ctx.actingParty],
        readAs: ctx.readAsParties,
        commandId,
        applicationId: 'synccap-backend',
      }
    );
  }

  /**
   * Queries active contracts from the Canton ACS (Active Contract Set).
   *
   * Canton note: The ACS query requires:
   *   1. A ledger offset (for snapshot consistency)
   *   2. A party filter (what contracts to return)
   *   3. Optional template filter (narrow to specific contract types)
   *
   * The response is party-scoped — only contracts where the querying
   * party is a signatory or observer are returned.
   */
  private async queryActiveContracts(
    ctx: PartyContext,
    templateId: string
  ): Promise<CantonCreatedEvent[]> {
    const offset = await this.getLedgerEnd(ctx);

    // The ACS endpoint returns newline-delimited JSON (NDJSON) in some
    // Canton versions. We handle both single-object and multi-line responses.
    const url = `${this.baseUrl}/v2/state/active-contracts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.token}`,
      },
      body: JSON.stringify({
        activeAtOffset: offset,
        eventFormat: {
          filtersByParty: {
            [ctx.actingParty]: {
              templateIds: [templateId],
            },
          },
          verbose: true,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ACS query failed (${response.status}): ${errorBody}`);
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      return [];
    }

    // Handle NDJSON (newline-delimited JSON) responses
    const lines = responseText
      .split('\n')
      .filter((line) => line.trim().length > 0);

    const events: CantonCreatedEvent[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as ActiveContractsResponse;
        if (parsed.contractEntry?.createdEvent) {
          events.push({
            createdEvent: parsed.contractEntry.createdEvent,
          });
        }
      } catch {
        // Skip non-JSON lines (e.g., stream metadata)
        logger.debug('Skipping non-JSON ACS line', { line: line.slice(0, 100) });
      }
    }

    return events;
  }

  /**
   * Extracts a contract ID from a submit-and-wait response.
   *
   * For exercise commands, the exercise result is typically the contract ID
   * of the newly created contract (as a string).
   *
   * For create commands, we look for created events in the transaction.
   */
  private extractContractId(
    response: SubmitAndWaitResponse,
    operation: string
  ): string {
    // First check for exercise result (direct string return)
    if (response.exerciseResult) {
      return response.exerciseResult;
    }

    // Then check transaction events for created contracts
    if (response.transaction?.events) {
      for (const event of response.transaction.events) {
        if (event.createdEvent) {
          return event.createdEvent.contractId;
        }
        // For exercise events, check the result
        if (event.exercisedEvent?.exerciseResult) {
          const result = event.exercisedEvent.exerciseResult;
          if (typeof result === 'string') {
            return result;
          }
        }
        // Check child events of exercised events
        if (event.exercisedEvent?.childEvents) {
          for (const child of event.exercisedEvent.childEvents) {
            if (child.createdEvent) {
              return child.createdEvent.contractId;
            }
          }
        }
      }
    }

    logger.warn(`Could not extract contract ID from ${operation} response`, {
      response: JSON.stringify(response).slice(0, 500),
    });
    return 'unknown';
  }

  // -------------------------------------------------------------------------
  // Command Methods (State-Changing Operations)
  // -------------------------------------------------------------------------

  /**
   * Creates a new CapacityAsset on the Canton ledger.
   *
   * Canton authorization: Requires the authenticated party to have `actAs`
   * rights for BOTH the manufacturer and owner parties. In the sandbox,
   * this is achieved by issuing a token with both parties in `actAs`.
   * In production, this would be a multi-party submission.
   *
   * Canton API: Uses POST /v2/commands/submit-and-wait with a CreateCommand.
   *
   * @param ctx - Authenticated party context.
   * @param req - Validated asset creation request.
   * @returns The contract ID and asset ID of the created asset.
   * @throws Error if the ledger rejects the command (e.g., authorization failure).
   */
  async createCapacityAsset(
    ctx: PartyContext,
    req: CreateAssetRequest
  ): Promise<CreateAssetResult> {
    logger.info('Creating CapacityAsset', {
      party: ctx.actingParty,
      assetId: req.assetId,
      technologyNode: req.technologyNode,
    });

    const response = await this.submitAndWait(
      ctx,
      [
        {
          CreateCommand: {
            templateId: TEMPLATE_IDS.CapacityAsset,
            createArguments: {
              manufacturer: req.manufacturer,
              owner: req.owner,
              assetId: req.assetId,
              technologyNode: req.technologyNode,
              waferStartsPerMonth: req.waferStartsPerMonth.toString(),
              costBasisPerWafer: req.costBasisPerWafer,
              commitmentStartDate: req.commitmentStartDate,
              commitmentEndDate: req.commitmentEndDate,
              status: 'Active',
            },
          },
        },
      ],
      [req.manufacturer, req.owner] // Dual-signatory: both must be in actAs
    );

    const contractId = this.extractContractId(response, 'createCapacityAsset');

    logger.info('CapacityAsset created', {
      contractId,
      assetId: req.assetId,
    });

    return {
      contractId,
      assetId: req.assetId,
    };
  }

  /**
   * Proposes a capacity transfer by exercising the `ProposeTransfer` choice
   * on an existing CapacityAsset.
   *
   * Canton privacy: This choice archives the original CapacityAsset (which
   * contains the PRIVATE costBasisPerWafer) and creates a TransferRFQ that
   * the secondary buyer can observe. The buyer sees the asking price but
   * NOT the original cost — demonstrating Canton's sub-transaction privacy.
   *
   * Canton API: Uses POST /v2/commands/submit-and-wait with an ExerciseCommand.
   *
   * @param ctx - Authenticated party context (must be the asset owner).
   * @param req - Validated transfer proposal request.
   * @returns The contract ID of the new TransferRFQ.
   */
  async proposeTransfer(
    ctx: PartyContext,
    req: ProposeTransferRequest
  ): Promise<ProposeTransferResult> {
    logger.info('Proposing transfer (dark pool RFQ)', {
      party: ctx.actingParty,
      assetContractId: req.assetContractId,
      buyer: req.secondaryBuyer,
    });

    const response = await this.submitAndWait(ctx, [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.CapacityAsset,
          contractId: req.assetContractId,
          choice: 'ProposeTransfer',
          choiceArgument: {
            secondaryBuyer: req.secondaryBuyer,
            askingPricePerWafer: req.askingPricePerWafer,
          },
        },
      },
    ]);

    const rfqContractId = this.extractContractId(response, 'proposeTransfer');

    logger.info('TransferRFQ created', {
      rfqContractId,
      buyer: req.secondaryBuyer,
    });

    return {
      rfqContractId,
      buyer: req.secondaryBuyer,
    };
  }

  /**
   * Accepts a TransferRFQ, triggering atomic settlement.
   *
   * Canton atomic settlement: This single ledger command atomically:
   *   1. Archives the TransferRFQ contract.
   *   2. Creates a NEW CapacityAsset owned by the buyer.
   *
   * There is no intermediate state — either both happen or neither does.
   * The new asset's costBasisPerWafer is set to the agreed price, permanently
   * severing the link to the original seller's cost basis.
   *
   * Canton API: Uses POST /v2/commands/submit-and-wait with an ExerciseCommand.
   *
   * @param ctx - Authenticated party context (must be the buyer).
   * @param req - Validated transfer acceptance request.
   * @returns The contract ID of the new CapacityAsset owned by the buyer.
   */
  async acceptTransfer(
    ctx: PartyContext,
    req: AcceptTransferRequest
  ): Promise<AcceptTransferResult> {
    logger.info('Accepting transfer (atomic settlement)', {
      party: ctx.actingParty,
      rfqContractId: req.rfqContractId,
    });

    const response = await this.submitAndWait(ctx, [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.TransferRFQ,
          contractId: req.rfqContractId,
          choice: 'AcceptTransfer',
          choiceArgument: {
            agreedPricePerWafer: req.agreedPricePerWafer,
          },
        },
      },
    ]);

    const newAssetContractId = this.extractContractId(
      response,
      'acceptTransfer'
    );

    logger.info('Atomic settlement complete', {
      newAssetContractId,
      party: ctx.actingParty,
    });

    return { newAssetContractId };
  }

  /**
   * Initiates a penalty workflow by exercising `InitiatePenalty` on a
   * CapacityAsset.
   *
   * Canton privacy: The resulting PenaltyAgreement has ZERO observers.
   * It is visible only to the manufacturer and the penalized party.
   * No other network participant — including secondary market buyers —
   * can detect the cancellation or infer financial distress.
   *
   * Canton API: Uses POST /v2/commands/submit-and-wait with an ExerciseCommand.
   *
   * @param ctx - Authenticated party context (must be the asset owner).
   * @param req - Validated penalty initiation request.
   * @returns The contract ID of the new PenaltyAgreement.
   */
  async initiatePenalty(
    ctx: PartyContext,
    req: InitiatePenaltyRequest
  ): Promise<InitiatePenaltyResult> {
    logger.info('Initiating penalty workflow', {
      party: ctx.actingParty,
      assetContractId: req.assetContractId,
      penaltyRate: req.penaltyRate,
    });

    const response = await this.submitAndWait(ctx, [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.CapacityAsset,
          contractId: req.assetContractId,
          choice: 'InitiatePenalty',
          choiceArgument: {
            penaltyRate: req.penaltyRate,
            cancellationReason: req.cancellationReason,
          },
        },
      },
    ]);

    const penaltyContractId = this.extractContractId(
      response,
      'initiatePenalty'
    );

    logger.info('PenaltyAgreement created', { penaltyContractId });

    return { penaltyContractId };
  }

  /**
   * Settles a penalty by exercising `SettlePenalty` on a PenaltyAgreement.
   *
   * Canton note: Only the manufacturer can exercise this choice, confirming
   * receipt of the penalty payment. In production, this would integrate with
   * a payment rail (e.g., Canton DvP with a cash token).
   *
   * Canton API: Uses POST /v2/commands/submit-and-wait with an ExerciseCommand.
   *
   * @param ctx - Authenticated party context (must be the manufacturer).
   * @param req - Validated penalty settlement request.
   * @returns The contract ID of the settled PenaltyAgreement.
   */
  async settlePenalty(
    ctx: PartyContext,
    req: SettlePenaltyRequest
  ): Promise<SettlePenaltyResult> {
    logger.info('Settling penalty', {
      party: ctx.actingParty,
      penaltyContractId: req.penaltyContractId,
    });

    const response = await this.submitAndWait(ctx, [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.PenaltyAgreement,
          contractId: req.penaltyContractId,
          choice: 'SettlePenalty',
          choiceArgument: {},
        },
      },
    ]);

    const settledContractId = this.extractContractId(
      response,
      'settlePenalty'
    );

    logger.info('Penalty settled', { settledContractId });

    return { settledContractId };
  }

  // -------------------------------------------------------------------------
  // Query Methods (Read-Only Operations)
  // -------------------------------------------------------------------------

  /**
   * Queries all CapacityAsset contracts visible to the authenticated party.
   *
   * Canton privacy: The ledger only returns contracts where the authenticated
   * party is a signatory or observer. This means:
   *   - A manufacturer sees all assets they issued.
   *   - An owner sees only their own assets.
   *   - A secondary buyer sees NOTHING until they are added as an observer
   *     via a TransferRFQ.
   *
   * Canton API: Uses POST /v2/state/active-contracts with template filter.
   *
   * @param ctx - Authenticated party context.
   * @returns Array of CapacityAsset contracts with IDs and payloads.
   */
  async queryAssetsByParty(ctx: PartyContext): Promise<AssetContract[]> {
    logger.debug('Querying CapacityAssets', { party: ctx.actingParty });

    const events = await this.queryActiveContracts(
      ctx,
      TEMPLATE_IDS.CapacityAsset
    );

    return events.map((event) => ({
      contractId: event.createdEvent.contractId,
      payload: event.createdEvent.createArguments as unknown as CapacityAssetType,
    }));
  }

  /**
   * Queries all TransferRFQ contracts visible to the authenticated party.
   *
   * Canton privacy: Returns RFQs where the party is a signatory (seller
   * or manufacturer) or observer (buyer). The buyer can see the asking
   * price but NOT the original CapacityAsset's costBasisPerWafer.
   *
   * @param ctx - Authenticated party context.
   * @returns Array of TransferRFQ contracts.
   */
  async queryTransferRFQs(ctx: PartyContext): Promise<TransferRFQContract[]> {
    logger.debug('Querying TransferRFQs', { party: ctx.actingParty });

    const events = await this.queryActiveContracts(
      ctx,
      TEMPLATE_IDS.TransferRFQ
    );

    return events.map((event) => ({
      contractId: event.createdEvent.contractId,
      payload: event.createdEvent.createArguments as unknown as TransferRFQType,
    }));
  }

  /**
   * Queries all PenaltyAgreement contracts visible to the authenticated party.
   *
   * Canton privacy: PenaltyAgreements have ZERO observers — only the
   * manufacturer and penalized party can see them. A competing buyer
   * querying this endpoint will receive an empty array, which is exactly
   * the privacy guarantee Canton provides.
   *
   * @param ctx - Authenticated party context.
   * @returns Array of PenaltyAgreement contracts.
   */
  async queryPenaltyAgreements(
    ctx: PartyContext
  ): Promise<PenaltyAgreementContract[]> {
    logger.debug('Querying PenaltyAgreements', { party: ctx.actingParty });

    const events = await this.queryActiveContracts(
      ctx,
      TEMPLATE_IDS.PenaltyAgreement
    );

    return events.map((event) => ({
      contractId: event.createdEvent.contractId,
      payload: event.createdEvent.createArguments as unknown as PenaltyAgreementType,
    }));
  }
}
