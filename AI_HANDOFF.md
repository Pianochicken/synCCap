# synCCap — AI Handoff Document

> **Last Updated:** Phase 1 Complete  
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
| `daml.yaml` | Project configuration targeting Daml SDK 3.4.9 with `daml-script` dependency |
| `daml/Main.daml` | Core templates, choices, enumerations, and end-to-end Daml Script test |

### Architecture Decisions

#### Templates (3 Core Contracts)

1. **`CapacityAsset`** — The RWA token representing semiconductor foundry capacity.
   - **Signatories:** `manufacturer`, `owner` (-control authorizdualation)
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
# Ensure Daml SDK 3.4.9+ is installed
daml test        # Runs all Daml Script tests in the sandbox
daml studio      # Opens the Daml IDE with inline test execution
```

---

## Current Project State

```
synCCap/
├── daml.yaml              # Project config (SDK 3.4.9)
├── daml/
│   └── Main.daml          # Templates + Daml Script (558 lines)
└── AI_HANDOFF.md          # This file
```

- **Smart Contract Layer:** ✅ Complete
- **Integration Layer:** ⬜ Not started (Phase 2)
- **Frontend UI:** ⬜ Not started (Phase 3)
- **Demo Flow:** ⬜ Not started (Phase 4)

---

## Phase 2 Prompt: Node.js/TypeScript Integration Layer

Copy and paste the following prompt to initiate Phase 2:

---

```
[Role & Expertise]
You are a Lead Web3 Architect and Senior Full-Stack Engineer, specializing in the Canton Network, Daml smart contracts, and enterprise-grade distributed ledger technologies. You write clean, maintainable TypeScript/React code and design highly secure, privacy-preserving state machines.

[Project Context]
I am building "synCCap" for a Canton Network Hackathon.
* Core Concept: Universal capacity tokenization (RWA) and privacy-preserving settlement.
* Demo: High-End Semiconductor Foundry Capacity.
* Phase 1 (COMPLETE): The Daml data model is in `daml/Main.daml`. It contains:
  - `CapacityAsset` template (RWA token with privacy-critical costBasisPerWafer)
  - `TransferRFQ` template (dark pool mechanism with observer-based visibility)
  - `PenaltyAgreement` template (bilateral confidential penalty settlement)
  - Full Daml Script test validating all privacy and settlement workflows.
* Refer to `AI_HANDOFF.md` for the complete Phase 1 summary.

[Phase 2: Node.js/TypeScript Integration Layer (Current Task)]
Your task right now is to execute Phase 2 exclusively.
* 1. Set up a Node.js/TypeScript project in a `backend/` directory with proper tsconfig.json and package.json.
* 2. Generate Daml TypeScript bindings from the compiled `.dar` file (using `daml codegen js`).
* 3. Create a typed service layer (`services/LedgerService.ts`) that wraps the Daml Ledger API:
     - `createCapacityAsset()` — issues a new capacity token
     - `proposeTransfer()` — initiates a dark pool RFQ
     - `acceptTransfer()` — exercises atomic settlement
     - `initiatePenalty()` — triggers penalty workflow
     - `settlePenalty()` — confirms penalty payment
     - `queryAssetsByParty()` — privacy-respecting asset query
* 4. Create an Express.js REST API (`routes/api.ts`) exposing these operations as HTTP endpoints.
* 5. Implement authentication middleware that maps HTTP requests to Daml party identities.
* 6. Write integration tests that exercise the API against the Daml sandbox.
* 7. Stop generating code. Update `AI_HANDOFF.md` with the Phase 2 summary and the prompt for Phase 3 (React Frontend).

[Output Constraints]
* Use strict TypeScript with no `any` types.
* Follow REST API best practices (proper status codes, error handling, request validation).
* Ensure the service layer is decoupled from the HTTP layer for testability.
* Include comprehensive JSDoc comments explaining Canton-specific integration patterns.
```

---

> **⚠️ Do not proceed to Phase 2 until explicitly instructed.**
