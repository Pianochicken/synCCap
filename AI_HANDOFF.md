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

Phase 2 delivers a production-structured Hono REST API that bridges HTTP clients to the Canton Daml ledger. The integration layer uses the **Canton JSON Ledger API v2** directly (the legacy `@daml/ledger` npm package is not compatible with Canton 3.x).

### Key Architecture Decision: Canton JSON API v2 & Hono

The `@daml/ledger` npm package stopped at version 2.10.4 and is **incompatible** with Canton SDK 3.x. The recommended approach (per Canton docs) is to use raw HTTP against the JSON Ledger API v2 endpoints:

- **`POST /v2/commands/submit-and-wait`** — Create contracts & exercise choices
- **`POST /v2/state/active-contracts`** — Query the Active Contract Set (ACS)
- **`GET /v2/state/ledger-end`** — Get the current ledger offset

Template IDs use the fully qualified format: `packageId:ModuleName:TemplateName`.

**Framework Choice**: The backend uses **Hono** with `@hono/zod-openapi` and `@hono/node-server`. This provides excellent performance, built-in strict typing, and auto-generates our Swagger documentation from our Zod schemas, replacing the legacy Express.js setup.

### Files Created/Modified

| File | Purpose |
|:-----|:--------|
| `backend/package.json` | Dependencies: `@daml/types@3.5.1`, `hono`, `@hono/node-server`, `@hono/zod-openapi`, `jsonwebtoken`, `winston` |
| `backend/tsconfig.json` | Strict TypeScript with path alias for codegen output |
| `backend/.env.example` | Environment variable documentation |
| `backend/jest.config.js` | Jest + ts-jest configuration with codegen module mapping |
| `backend/src/config.ts` | Validated runtime configuration from environment variables |
| `backend/src/logger.ts` | Winston structured logger (JSON prod / pretty dev) |
| `backend/src/validators.ts` | Hono/Zod schemas for all API request bodies and Swagger metadata |
| `backend/src/middleware/auth.ts` | JWT → `PartyContext` middleware + sandbox token issuer |
| `backend/src/services/LedgerService.ts` | **Core service layer** — Canton JSON API v2 client |
| `backend/src/routes/api.ts` | REST API routes using Hono `createRoute` |
| `backend/src/routes/auth-routes.ts` | Sandbox token issuance endpoint using Hono `createRoute` |
| `backend/src/app.ts` | Hono `OpenAPIHono` app factory and Swagger UI setup |
| `backend/src/server.ts` | Server entrypoint using `@hono/node-server` with graceful shutdown |
| `backend/tests/integration/api.integration.test.ts` | 27 tests passing using `supertest` with Hono |
| `backend/daml.js/` | Generated TypeScript bindings from `daml codegen js` |

### REST API Endpoints

| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/docs` | GET | No | OpenAPI 3.0 specification JSON |
| `/swagger` | GET | No | Swagger UI documentation portal |
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
- **Frontend UI:** ✅ Complete (Phase 3)
- **Demo Flow:** ⬜ Not started (Phase 4)

---

## Phase 3 Summary: React Frontend ✅

### What Was Built

Phase 3 delivers a modern React SPA using Vite, Tailwind CSS (v3), and TypeScript. It implements the multi-party dashboard required to visually demonstrate the Canton Network's privacy model for semiconductor capacity tokenization.

### Files Created

| File | Purpose |
|:-----|:--------|
| `frontend/src/App.tsx` | Main orchestrator, manages current party state and unified dashboard layout. |
| `frontend/src/api/client.ts` | Axios HTTP client configured to connect to the backend REST API with JWT bearer tokens. |
| `frontend/src/components/PartySwitcher.tsx` | UI component to toggle between TSMC, AppleInc, and QualcommInc. |
| `frontend/src/components/views/ManufacturerView.tsx` | Form to issue CapacityAssets and list existing inventory. Also settles penalties. |
| `frontend/src/components/views/PrimaryBuyerView.tsx` | Lists owned capacity. Allows proposing Dark Pool transfers and initiating penalty cancellations. |
| `frontend/src/components/views/SecondaryBuyerView.tsx` | Displays incoming Dark Pool RFQs. Allows accepting transfers (atomic settlement). |
| `frontend/src/components/views/PrivacyAuditPanel.tsx` | A side-by-side Canton state visibility matrix, explicitly showing what data points are visible/hidden to the currently logged-in party. |

### How to Run

```bash
cd frontend
npm install
npm run dev
```

---

## Phase 4 Prompt: Demo Flow & Polish

Copy and paste the following prompt to initiate Phase 4:

---

```
[Role & Expertise]
You are a Lead Web3 Architect and Senior Full-Stack Engineer. You are helping me finalize the "synCCap" project for the Canton Network Hackathon.

[Project Context]
* Phase 1 (Smart Contracts): Complete.
* Phase 2 (Backend REST API): Complete.
* Phase 3 (React Frontend): Complete.
* All code is successfully integrated and tested.

[Phase 4: Demo Flow & Polish (Current Task)]
We need to ensure the end-to-end demonstration runs flawlessly for the Hackathon judges.
Your task right now is to execute Phase 4:
1. Write a `README.md` at the root of the project with a high-level overview, architecture diagram (text or mermaid), and step-by-step instructions on how to run the entire stack (Sandbox -> Backend -> Frontend).
2. Write a `DEMO_SCRIPT.md` that provides a step-by-step script for the live presentation, highlighting exactly what to click and what to say about Canton's privacy guarantees (e.g., "Notice how Qualcomm cannot see Apple's original cost basis").
3. Conduct a final review of the repository structure. Add any missing `.gitignore` files or clean up unnecessary artifacts.

[Output Constraints]
* Ensure the README is visually appealing and professional.
* The Demo Script should be timed for a ~3-5 minute presentation.
```

---

> **⚠️ Do not proceed to Phase 4 until explicitly instructed.**
