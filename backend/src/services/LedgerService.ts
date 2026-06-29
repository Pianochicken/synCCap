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
import { SynCCap } from '@daml.js/synccap-0.1.0';

// Alias the generated template types for cleaner usage
type CapacityAssetType = SynCCap.CapacityAsset;
type TransferRFQType = SynCCap.TransferRFQ;
type PenaltyAgreementType = SynCCap.PenaltyAgreement;

// ---------------------------------------------------------------------------
// Canton JSON API v2 Constants
// ---------------------------------------------------------------------------

/**
 * Template IDs for the Canton JSON API v2.
 *
 * Canton 3.x supports two formats:
 *   1. Package-hash format: `<packageId>:Module:Template`  — exact package version
 *   2. Package-name format: `#<packageName>:Module:Template` — resolves to latest vetted package
 *
 * We use the package-name format (`#synccap:...`) which is stable across
 * package upgrades and is the recommended format for application code.
 */
const TEMPLATE_IDS = {
  CapacityAsset: '#synccap-v2:SynCCap:CapacityAsset',
  TransferRFQ: '#synccap-v2:SynCCap:TransferRFQ',
  PenaltyAgreement: '#synccap-v2:SynCCap:PenaltyAgreement',
} as const;

// ---------------------------------------------------------------------------
// Canton API Response Types
// ---------------------------------------------------------------------------

/**
 * A contract event as returned by the Canton JSON API v2 ACS endpoint.
 */
interface CantonCreatedEvent {
  createdEvent: {
    contractId: string;
    templateId: string;
    createArgument: Record<string, unknown>; // Note: Canton uses createArgument (not createArguments) in events
  };
}

/**
 * Response from POST /v2/commands/submit-and-wait.
 * In Canton 3.x this only returns updateId + completionOffset.
 * To get created events, use POST /v2/updates with the offset range.
 */
interface SubmitAndWaitResponse {
  updateId: string;
  completionOffset: number;
}

/**
 * A single update entry from POST /v2/updates.
 */
interface UpdateEntry {
  update?: {
    Transaction?: {
      value?: {
        events?: Array<{
          CreatedEvent?: {
            contractId: string;
            templateId: string;
            createArgument: Record<string, unknown>;
          };
          ExercisedEvent?: {
            contractId: string;
            exerciseResult?: unknown;
            childEvents?: Array<{
              CreatedEvent?: { contractId: string };
            }>;
          };
        }>;
      };
    };
  };
}

/**
 * Response from GET /v2/state/ledger-end.
 */
interface LedgerEndResponse {
  offset: number;
}

/**
 * A single NDJSON line from POST /v2/state/active-contracts.
 * Canton 3.x wraps active contract events in JsActiveContract.
 */
interface ActiveContractsResponseLine {
  contractEntry?: {
    /** Canton 3.x wraps the event inside JsActiveContract */
    JsActiveContract?: {
      createdEvent: {
        contractId: string;
        templateId: string;
        createArgument: Record<string, unknown>;
      };
    };
    /** Fallback for potential older format */
    createdEvent?: {
      contractId: string;
      templateId: string;
      createArgument: Record<string, unknown>;
    };
  };
  streamContinuationToken?: string;
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
  // Party Management
  // -------------------------------------------------------------------------

  /**
   * Allocates a party on the Canton sandbox (or returns its existing ID).
   *
   * Canton 3.x requires fully-qualified party IDs in the format:
   *   `DisplayName::1220<fingerprint>`
   *
   * Simple strings like "TSMC" are NOT valid party IDs on their own.
   * The sandbox creates a unique fingerprint for each party. This method
   * calls the `/v2/parties` endpoint to allocate the party and returns
   * the fully-qualified ID.
   *
   * @param partyHint - Human-readable name (used as the party ID hint).
   * @returns The fully-qualified party ID (e.g., `TSMC::1220abc...`).
   */
  async allocateParty(partyHint: string): Promise<string> {
    const url = `${this.baseUrl}/v2/parties`;

    logger.info('Allocating party on Canton sandbox', { partyHint });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyIdHint: partyHint, identityProviderId: '' }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        partyDetails: { party: string };
      };
      const partyId = data.partyDetails.party;
      logger.info('Party allocated', { partyHint, partyId });
      return partyId;
    }

    const errorBody = await response.text();

    // Canton returns 400 INVALID_ARGUMENT if the party already exists
    if (response.status === 400 && errorBody.includes('already exists')) {
      logger.debug('Party already exists, fetching ID', { partyHint });
      const listResponse = await fetch(`${this.baseUrl}/v2/parties`, {
        method: 'GET',
      });
      if (listResponse.ok) {
        const listData = (await listResponse.json()) as {
          partyDetails: { party: string }[];
        };
        const found = listData.partyDetails.find((p) =>
          p.party.startsWith(`${partyHint}::`)
        );
        if (found) {
          logger.info('Using existing party ID', { partyHint, partyId: found.party });
          return found.party;
        }
      }
    }

    throw new Error(
      `Failed to allocate party "${partyHint}" (${response.status}): ${errorBody}`
    );
  }


  /**
   * Makes an HTTP request to the Canton JSON Ledger API v2.
   *
   * Canton sandbox note: When running `dpm sandbox` without a custom auth
   * config, the sandbox operates WITHOUT authorization. Sending an
   * Authorization header causes the sandbox to attempt JWT validation against
   * its user-management service, which fails with INVALID_TOKEN because no
   * `userId` claim is present in our party-scoped JWTs.
   *
   * In no-auth sandbox mode:
   *   - No Authorization header is sent.
   *   - Commands include a `userId` field instead.
   *   - The sandbox accepts ANY userId string.
   *
   * @param ctx - Party context (used for party IDs, not forwarded as auth).
   * @param path - API endpoint path (e.g., '/v2/commands/submit-and-wait').
   * @param body - Request body to send as JSON.
   * @returns Parsed JSON response.
   * @throws Error with descriptive message if the request fails.
   */
  private async cantonFetch<T>(
    _ctx: PartyContext,
    path: string,
    body: Record<string, unknown>,
    method: 'POST' | 'GET' = 'POST'
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    logger.debug('Canton API request', { method, path });

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header — dpm sandbox runs without auth.
        // Canton validates any JWT against user-management, which fails for
        // party-scoped tokens. The correct pattern for the no-auth sandbox
        // is to pass userId in the command body instead.
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
  private async getLedgerEnd(_ctx: PartyContext): Promise<number> {
    const url = `${this.baseUrl}/v2/state/ledger-end`;

    // No Authorization header — sandbox runs without auth.
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to get ledger end (${response.status}): ${body}`);
    }

    const data = (await response.json()) as LedgerEndResponse;
    return data.offset;
  }

  /**
   * Fetches a transaction from /v2/updates and extracts the first created
   * contract ID.
   *
   * Canton 3.x: submit-and-wait returns only {updateId, completionOffset}.
   * To obtain the created contractId, fetch the transaction at that offset.
   */
  private async getContractIdFromUpdate(
    ctx: PartyContext,
    completionOffset: number
  ): Promise<string> {
    const url = `${this.baseUrl}/v2/updates`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beginExclusive: completionOffset - 1,
        endInclusive: completionOffset,
        updateFormat: {
          includeTransactions: {
            transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
            eventFormat: {
              filtersByParty: {
                [ctx.actingParty]: {
                  cumulative: [{
                    identifierFilter: {
                      WildcardFilter: { value: { includeCreatedEventBlob: false } },
                    },
                  }],
                },
              },
              verbose: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch update at offset ${completionOffset}: ${body}`);
    }

    // The response is an array of update entries (one per NDJSON line or JSON array)
    const text = await response.text();
    if (!text.trim()) return 'unknown';

    // Response may be a JSON array or NDJSON
    let entries: UpdateEntry[] = [];
    if (text.trim().startsWith('[')) {
      entries = JSON.parse(text) as UpdateEntry[];
    } else {
      entries = text
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as UpdateEntry);
    }

    for (const entry of entries) {
      const txEvents = entry.update?.Transaction?.value?.events ?? [];
      for (const event of txEvents) {
        if (event.CreatedEvent?.contractId) {
          return event.CreatedEvent.contractId;
        }
        // For exercise commands, look at child events for the new contract
        if (event.ExercisedEvent?.childEvents) {
          for (const child of event.ExercisedEvent.childEvents) {
            if (child.CreatedEvent?.contractId) {
              return child.CreatedEvent.contractId;
            }
          }
        }
      }
    }

    return 'unknown';
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

    // Canton JSON API v2 command body.
    // In no-auth sandbox mode, `userId` replaces the Authorization header.
    // The sandbox accepts any userId string and uses actAs/readAs for scoping.
    return this.cantonFetch<SubmitAndWaitResponse>(
      ctx,
      '/v2/commands/submit-and-wait',
      {
        commands,
        actAs: actAs ?? [ctx.actingParty],
        readAs: ctx.readAsParties,
        commandId,
        userId: 'synccap-backend',
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

    const url = `${this.baseUrl}/v2/state/active-contracts`;

    // ACS query body per Canton JSON API v2 spec.
    // filtersByParty scopes results to the acting party (Canton's privacy model).
    // No Authorization header — sandbox runs without auth.
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeAtOffset: offset,
        eventFormat: {
          filtersByParty: {
            [ctx.actingParty]: {
              cumulative: [
                {
                  identifierFilter: {
                    TemplateFilter: {
                      value: {
                        templateId,
                        includeCreatedEventBlob: false,
                      },
                    },
                  },
                },
              ],
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

    // Response is a JSON array (Canton 3.5.x) or NDJSON
    let lines: string[];
    if (responseText.trim().startsWith('[')) {
      // JSON array — parse each element as a line
      const arr = JSON.parse(responseText) as unknown[];
      lines = arr.map((item) => JSON.stringify(item));
    } else {
      lines = responseText.split('\n').filter((l) => l.trim().length > 0);
    }

    const events: CantonCreatedEvent[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as ActiveContractsResponseLine;
        // Canton 3.x wraps inside JsActiveContract
        const createdEvent =
          parsed.contractEntry?.JsActiveContract?.createdEvent ??
          parsed.contractEntry?.createdEvent;
        if (createdEvent) {
          events.push({ createdEvent });
        }
      } catch {
        logger.debug('Skipping non-JSON ACS line', { line: line.slice(0, 100) });
      }
    }

    return events;
  }

  // (Removed — in Canton 3.x submit-and-wait only returns updateId + completionOffset.
  //  Use getContractIdFromUpdate() instead.)

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
    const ownerId = await this.allocateParty(req.owner);

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
              manufacturer: ctx.actingParty,
              owner: ownerId,
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
      [ctx.actingParty, ownerId] // Dual-signatory: both must be in actAs
    );

    // Canton 3.x: submit-and-wait returns {updateId, completionOffset}.
    // Fetch the transaction at that offset to get the created contractId.
    const contractId = await this.getContractIdFromUpdate(ctx, response.completionOffset);

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
    const buyerId = await this.allocateParty(req.secondaryBuyer);

    logger.info('Proposing transfer (dark pool RFQ)', {
      party: ctx.actingParty,
      assetContractId: req.assetContractId,
      buyer: buyerId,
    });

    const response = await this.submitAndWait(ctx, [
      {
        ExerciseCommand: {
          templateId: TEMPLATE_IDS.CapacityAsset,
          contractId: req.assetContractId,
          choice: 'ProposeTransfer',
          choiceArgument: {
            secondaryBuyer: buyerId,
            askingPricePerWafer: req.askingPricePerWafer,
          },
        },
      },
    ]);

    const rfqContractId = await this.getContractIdFromUpdate(ctx, response.completionOffset);

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

    const newAssetContractId = await this.getContractIdFromUpdate(ctx, response.completionOffset);

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

    const penaltyContractId = await this.getContractIdFromUpdate(ctx, response.completionOffset);

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

    // For archive/settle commands, the settled contract ID is the archived one.
    const settledContractId = req.penaltyContractId;
    // Confirm the transaction succeeded by checking completionOffset exists.
    logger.info('Penalty settled', { settledContractId, completionOffset: response.completionOffset });

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
      payload: event.createdEvent.createArgument as unknown as CapacityAssetType,
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
      payload: event.createdEvent.createArgument as unknown as TransferRFQType,
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
      payload: event.createdEvent.createArgument as unknown as PenaltyAgreementType,
    }));
  }
}
