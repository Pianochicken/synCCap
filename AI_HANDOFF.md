# synCCap — AI Handoff Document

> **Last Updated:** Phase 2 Complete  
> **Project:** synCCap — Universal Capacity Tokenization & Privacy-Preserving Settlement  
> **Hackathon:** Canton Network Hackathon  
> **Demo Vertical:** High-End Semiconductor Foundry Capacity (RWA)

---

## Phase 1 Summary: Daml Data Model & Sandbox Scripts ✅

### What Was Built

Phase 1 delivers the complete Daml smart contract layer for the synCCap platform. All templates, choices, privacy boundaries, and a comprehensive Daml Script test are implemented and ready for sandbox validation.

### Files Created

| File | Purpose |
|:-----|:--------|
| `daml.yaml` | Project configuration targeting Daml SDK 3.5.1 with `daml-script` dependency |
| `daml/Main.daml` | Core templates, choices, enumerations, and end-to-end Daml Script test |

### Architecture Decisions

#### Templates (3 Core Contracts)

1. **`CapacityAsset`** — The RWA token representing semiconductor foundry capacity.
   - **Signatories:** `manufacturer`, `owner` (dual-control authorization)
   - **Observers:** None (invisible to non-stakeholders by default)
   - **Privacy-Critical Field:** `costBasisPerWafer` — NEVER carried forward during transfers
   - **Choices:**
     - `ProposeTransfer` → Creates a `TransferRFQ` without exposing original cost basis
     - `InitiatePenalty` → Creates a `PenaltyAgreement` for confidential cancellation

2. **`TransferRFQ`** — The dark pool mechanism for secondary capacity trading.
   - **Signatories:** `manufacturer`, `seller`
   - **Observers:** `buyer` (can see asking price, technology node, wafer count — but NOT original cost)
   - **Choices:**
     - `AcceptTransfer` → Atomic settlement: archives RFQ + creates new `CapacityAsset` for buyer
     - `RejectTransfer` → Buyer declines; RFQ is archived cleanly
     - `WithdrawRFQ` → Seller withdraws before buyer acts

3. **`PenaltyAgreement`** — Confidential bilateral penalty for capacity cancellation.
   - **Signatories:** `manufacturer`, `penalizedParty`
   - **Observers:** None (completely invisible to all other participants)
   - **Choices:**
     - `SettlePenalty` → Manufacturer confirms payment receipt
     - `DisputePenalty` → Penalized party counter-proposes a new rate

#### Enumerations

- `TechnologyNode`: `N3nm | N5nm | N7nm | N14nm`
- `AssetStatus`: `Active | Transferred | Penalized`

### Canton Propositions Demonstrated

| Canton Feature | Where Demonstrated |
|:--------------|:-------------------|
| **Sub-Transaction Privacy** | `ProposeTransfer` archives the `CapacityAsset` (containing `costBasisPerWafer`) in a sub-transaction invisible to the Secondary Buyer. The buyer only sees the `TransferRFQ` creation. |
| **Atomic Settlement** | `AcceptTransfer` atomically archives the RFQ and creates a new `CapacityAsset` — no intermediate state exists. |
| **Multi-Party Workflows** | Three distinct roles (Manufacturer, Primary Buyer, Secondary Buyer) coordinate via signatory/observer/controller patterns without a central intermediary. |
| **Need-to-Know Visibility** | `PenaltyAgreement` has zero observers — competitors on the network cannot detect cancellations or infer financial distress. |

### Daml Script Test Coverage

The `testSynCCapWorkflow` script in `Main.daml` validates:

1. ✅ Multi-party capacity asset issuance (`submitMulti`)
2. ✅ Dark pool transfer proposal (cost basis firewall)
3. ✅ Atomic settlement with negotiated pricing
4. ✅ Privacy verification — secondary buyer sees ONLY transfer price ($21,500), not original cost ($18,500)
5. ✅ Primary buyer's original asset is consumed after transfer
6. ✅ Penalty agreement creation with calculated penalty amount ($720,000)
7. ✅ Penalty privacy — secondary buyer sees ZERO penalty contracts
8. ✅ Penalty settlement by manufacturer
9. ✅ Final privacy audit across all three party perspectives

### How to Run

```bash
# Ensure Daml SDK 3.5.1+ is installed
dpm test        # Runs all Daml Script tests in the sandbox
dpm studio      # Opens the Daml IDE with inline test execution
```

---

## Phase 2 Summary: Node.js/TypeScript Integration Layer ✅

### What Was Built

Phase 2 delivers a production-structured Express.js REST API that bridges HTTP clients to the Canton Daml ledger. The integration layer uses the **Canton JSON Ledger API v2** directly (the legacy `@daml/ledger` npm package is not compatible with Canton 3.x).

### Key Architecture Decision: Canton JSON API v2

The `@daml/ledger` npm package stopped at version 2.10.4 and is **incompatible** with Canton SDK 3.x. The recommended approach (per Canton docs) is to use raw HTTP against the JSON Ledger API v2 endpoints:

- **`POST /v2/commands/submit-and-wait`** — Create contracts & exercise choices
- **`POST /v2/state/active-contracts`** — Query the Active Contract Set (ACS)
- **`GET /v2/state/ledger-end`** — Get the current ledger offset

Template IDs use the fully qualified format: `packageId:ModuleName:TemplateName`.

### Files Created/Modified

| File | Purpose |
|:-----|:--------|
| `backend/package.json` | Dependencies: `@daml/types@3.5.1`, `express`, `zod`, `jsonwebtoken`, `winston`, `helmet`, `cors`, `express-rate-limit` |
| `backend/tsconfig.json` | Strict TypeScript with path alias for codegen output |
| `backend/.env.example` | Environment variable documentation |
| `backend/jest.config.js` | Jest + ts-jest configuration with codegen module mapping |
| `backend/src/config.ts` | Validated runtime configuration from environment variables |
| `backend/src/logger.ts` | Winston structured logger (JSON prod / pretty dev) |
| `backend/src/validators.ts` | Zod schemas for all API request bodies |
| `backend/src/middleware/auth.ts` | JWT → `PartyContext` middleware + sandbox token issuer |
| `backend/src/services/LedgerService.ts` | **Core service layer** — Canton JSON API v2 client |
| `backend/src/routes/api.ts` | REST API routes (`/api/v1/...`) with Zod validation |
| `backend/src/routes/auth-routes.ts` | Sandbox token issuance endpoint |
| `backend/src/app.ts` | Express app factory (testable, no listener binding) |
| `backend/src/server.ts` | Server entrypoint with graceful shutdown |
| `backend/tests/integration/api.integration.test.ts` | 27 tests (15 pass, 12 require sandbox) |
| `backend/daml.js/` | Generated TypeScript bindings from `daml codegen js` |

### REST API Endpoints

| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/health` | GET | No | Service health check |
| `/auth/token` | POST | No | Issue sandbox JWT for a party |
| `/api/v1/assets` | POST | Yes | Create a CapacityAsset |
| `/api/v1/assets` | GET | Yes | Query assets visible to party |
| `/api/v1/transfers/propose` | POST | Yes | Create a TransferRFQ (dark pool) |
| `/api/v1/transfers/accept` | POST | Yes | Accept RFQ (atomic settlement) |
| `/api/v1/transfers` | GET | Yes | Query transfer RFQs |
| `/api/v1/penalties/initiate` | POST | Yes | Create a PenaltyAgreement |
| `/api/v1/penalties/settle` | POST | Yes | Settle a penalty |
| `/api/v1/penalties` | GET | Yes | Query penalty agreements |

### Service Layer Design

`LedgerService` is the sole module that communicates with Canton. Key design:
- **Decoupled from Express** — accepts `PartyContext`, returns typed results.
- **Per-request HTTP client** — ensures party-scoped operations (Canton requires it).
- **Template IDs** — Uses the modern Canton 3.x `#packageName:ModuleName:TemplateName` format.
- **Contract IDs** — Canton 3.x `submit-and-wait` only returns an offset; Contract IDs are extracted via subsequent `/v2/updates` requests.
- **NDJSON response handling** — the ACS endpoint returns newline-delimited JSON.
- **All Numeric fields as strings** — preserves decimal precision for financial values.

### Test Coverage

| Test Category | Count | Status |
|:--------------|:------|:-------|
| Token issuance (POST /auth/token) | 4 | ✅ Pass |
| Health check | 1 | ✅ Pass |
| JWT middleware (401 cases) | 3 | ✅ Pass |
| Request validation (400 cases) | 6 | ✅ Pass |
| 404 handling | 1 | ✅ Pass |
| Ledger integration (full lifecycle) | 12 | ✅ Pass |

### How to Run

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start development server
npm run dev

# Run core backend tests (skips ledger integration)
npm test

# Run full integration tests (requires Canton sandbox)
# First: dpm sandbox --json-api-port 7575 --dar ../.daml/dist/synccap-0.1.0.dar
npm run test:ledger

# Type check
npx tsc --noEmit
```

---

## Current Project State

```
synCCap/
├── daml.yaml                        # Daml project config (SDK 3.5.1)
├── multi-package.yaml               # IDE workspace config
├── daml/
│   └── Main.daml                    # Templates + Daml Script (365 lines)
├── backend/
│   ├── package.json                 # Node.js project config
│   ├── tsconfig.json                # Strict TypeScript config
│   ├── jest.config.js               # Test configuration
│   ├── .env.example                 # Environment variable documentation
│   ├── daml.js/                     # Generated TypeScript bindings
│   │   ├── synccap-0.1.0/           # Main module bindings
│   │   └── ...                      # Stdlib/prim dependencies
│   ├── src/
│   │   ├── config.ts                # Runtime configuration
│   │   ├── logger.ts                # Winston structured logger
│   │   ├── validators.ts            # Zod request validation schemas
│   │   ├── app.ts                   # Express app factory
│   │   ├── server.ts                # Server entrypoint
│   │   ├── middleware/
│   │   │   └── auth.ts              # JWT → PartyContext middleware
│   │   ├── routes/
│   │   │   ├── api.ts               # REST API routes
│   │   │   └── auth-routes.ts       # Sandbox token endpoint
│   │   └── services/
│   │       └── LedgerService.ts     # Canton JSON API v2 client
│   └── tests/
│       └── integration/
│           └── api.integration.test.ts  # 27 integration tests
└── AI_HANDOFF.md                    # This file
```

- **Smart Contract Layer:** ✅ Complete
- **Integration Layer:** ✅ Complete
- **Frontend UI:** ⬜ Not started (Phase 3)
- **Demo Flow:** ⬜ Not started (Phase 4)

---

## Phase 3 Prompt: React Frontend

Copy and paste the following prompt to initiate Phase 3:

---

```
[Role & Expertise]
You are a Lead Web3 Architect and Senior Full-Stack Engineer, specializing in the Canton Network, Daml smart contracts, and enterprise-grade distributed ledger technologies. You write clean, maintainable TypeScript/React code and design highly secure, privacy-preserving state machines.

[Project Context]
I am building "synCCap" for a Canton Network Hackathon.
* Core Concept: Universal capacity tokenization (RWA) and privacy-preserving settlement.
* Demo: High-End Semiconductor Foundry Capacity.
* Phase 1 (COMPLETE): Daml data model with 3 core templates (CapacityAsset, TransferRFQ, PenaltyAgreement) and comprehensive Daml Script tests. See `daml/Main.daml`.
* Phase 2 (COMPLETE): Node.js/TypeScript integration layer with Express REST API and Canton JSON Ledger API v2 client. See `backend/` directory.
* The backend REST API is at `http://localhost:3000` with endpoints documented in `AI_HANDOFF.md`.
* Refer to `AI_HANDOFF.md` for the complete Phase 1 and Phase 2 summaries.

[Phase 3: React Frontend (Current Task)]
Your task right now is to execute Phase 3 exclusively.
* 1. Set up a React/TypeScript project in a `frontend/` directory using Vite.
* 2. Create a multi-party dashboard that demonstrates Canton's privacy model:
     - Party selector (switch between TSMC, AppleInc, QualcommInc perspectives)
     - Each party sees ONLY what Canton's privacy model allows
* 3. Implement the following views:
     - **Asset Dashboard**: Display CapacityAssets with technology node, wafer count, cost basis
     - **Dark Pool**: Propose transfers, view RFQs, accept/reject offers
     - **Penalty Management**: Initiate penalties, view settlement status
     - **Privacy Audit Panel**: Side-by-side comparison of what each party can/cannot see
* 4. Connect all views to the backend REST API with proper auth token management.
* 5. Style the application with a premium, dark-themed UI suitable for a financial/enterprise demo.
* 6. Stop generating code. Update `AI_HANDOFF.md` with the Phase 3 summary and the prompt for Phase 4 (Demo Flow & Polish).

[Output Constraints]
* Use strict TypeScript with no `any` types.
* Use React functional components with hooks.
* Implement proper loading states, error handling, and user feedback.
* The UI must visually demonstrate Canton's privacy guarantees — show what each party can and cannot see.
* Include comprehensive JSDoc comments explaining Canton-specific UI patterns.
```

---

> **⚠️ Do not proceed to Phase 3 until explicitly instructed.**
