# synCCap — AI Handoff Document

> **Last Updated:** Phase 6 In Progress (2026-07-09)
> **Project:** synCCap — Universal Capacity Tokenization & Privacy-Preserving Settlement
> **Hackathon:** Canton Network Hackathon
> **Demo Vertical:** High-End Semiconductor Foundry Capacity (RWA)
> **Track:** Private DeFi & Capital Markets · TradeFi, RWA & Tokenized Assets

---

## Overall Project Status

| Phase | Description | Status |
|:------|:------------|:------:|
| **Phase 1** | Daml Smart Contracts | ✅ Complete |
| **Phase 2** | Node.js / TypeScript Backend REST API | ✅ Complete |
| **Phase 3** | React Frontend (Vite + Tailwind + TypeScript) | ✅ Complete |
| **Phase 4** | Demo Polish — README, DEMO_SCRIPT, UI Landing Page | ✅ Complete |
| **Phase 5** | Real-Time Architecture (WebSockets & Optimistic UI) | ✅ Complete |
| **Phase 5.5** | Devnet Integration & Bug Fixes | ✅ Complete |
| **Phase 6** | Enterprise Login UX Redesign + Demo Session Isolation | ✅ Complete |

---

## Phase 1 Summary: Daml Data Model & Sandbox Scripts ✅

### What Was Built

The complete Daml smart contract layer for the synCCap platform. All templates, choices, privacy boundaries, and a comprehensive Daml Script test are implemented and validated in the Canton Sandbox.

### Files

| File | Purpose |
|:-----|:--------|
| `daml.yaml` | Project configuration targeting Daml SDK 3.5.1 with `daml-script` dependency |
| `daml/SynCCap.daml` | Core templates, choices, enumerations, and end-to-end Daml Script test |
| `daml/Test/Workflow.daml` | Workflow tests |

### Templates (5 Core Contracts)

1. **`CapacityAsset`** — The RWA token representing semiconductor foundry capacity.
   - **Signatories:** `manufacturer`, `owner` (dual-control authorization)
   - **Observers:** None (invisible to non-stakeholders by default)
   - **Choices:** `ProposeTransfer`

2. **`CapacityFinancials`** — Holds the original cost basis securely.
   - **Signatories:** `creditor`, `debtor`
   - **Privacy-Critical Field:** `costBasisPerWafer` — Separated from the asset so it is NEVER exposed to secondary buyers.
   - **Choices:** `InitiatePenalty`

3. **`CapacityAssetLock`** — Represents a locked capacity while an RFQ is pending.
   - **Signatories:** `manufacturer`, `owner`
   - **Observers:** `buyer`

4. **`TransferRFQ`** — Dark pool mechanism for secondary capacity trading.
   - **Signatories:** `manufacturer`, `seller`
   - **Observers:** `buyer` (sees asking price and lot details, NOT original cost)
   - **Choices:** `AcceptTransfer` (atomic settlement), `RejectTransfer`, `WithdrawOffer`

5. **`PenaltyAgreement`** — Confidential bilateral penalty for capacity cancellation.
   - **Signatories:** `manufacturer`, `penalizedParty`
   - **Observers:** None (completely invisible to all other participants)
   - **Choices:** `SettlePenalty`

### Canton Propositions Demonstrated

| Canton Feature | Where Demonstrated |
|:--------------|:-------------------|
| **Sub-Transaction Privacy** | `CapacityFinancials` separates cost basis from `CapacityAsset`, ensuring it's invisible to the Secondary Buyer during `TransferRFQ`. |
| **Atomic Settlement** | `AcceptTransfer` atomically archives the RFQ and Lock, and creates a new `CapacityAsset` and `CapacityFinancials` — no intermediate state |
| **Multi-Party Workflows** | Three roles coordinate without a central intermediary |
| **Need-to-Know Visibility** | `PenaltyAgreement` has zero observers — competitors cannot detect cancellations |

### How to Run

```bash
dpm build                                                   # Compile contracts
dpm sandbox --json-api-port 7575 --dar .daml/dist/synccap-v4-0.1.0.dar  # Start sandbox
```

---

## Phase 2 Summary: Node.js / TypeScript Backend REST API ✅

### What Was Built

A production-structured Hono REST API that bridges HTTP clients to the Canton Daml ledger via the **Canton JSON Ledger API v2** (the legacy `@daml/ledger` npm package is not compatible with Canton 3.x).

### Key Architecture Decisions

- **Framework:** Hono + `@hono/zod-openapi` + `@hono/node-server` (auto-generates Swagger docs from Zod schemas)
- **Canton API v2 endpoints used:**
  - `POST /v2/commands/submit-and-wait` — Create contracts & exercise choices
  - `POST /v2/state/active-contracts` — Query Active Contract Set (ACS)
  - `GET /v2/state/ledger-end` — Get current ledger offset
  - `POST /v2/parties` — Party allocation (allocate or look up a fully-qualified party ID)
- **Template IDs:** `#synccap:Main:TemplateName` format (stable across upgrades)
- **No-auth sandbox mode:** `dpm sandbox` runs without JWT auth by default. Commands pass `userId` in the body instead of Authorization header
- **Party ID resolution:** All human-readable names (e.g., `AppleInc`) are resolved to fully-qualified Canton IDs (`AppleInc::1220...`) before submitting commands

### Critical Canton Fix: Dual-Signatory Authorization

`CapacityAsset` requires both `manufacturer` and `owner` as signatories. When TSMC logs in, the auth token is issued with `actAs: [TSMC_ID, AppleInc_ID, QualcommInc_ID]` so the manufacturer can issue assets on behalf of buyers in the demo.

### Files

| File | Purpose |
|:-----|:--------|
| `backend/package.json` | Dependencies: `@daml.js/synccap-v4-0.1.0`, `hono`, `@hono/node-server`, `@hono/zod-openapi`, `jsonwebtoken`, `winston` |
| `backend/tsconfig.json` | Strict TypeScript with path alias for codegen output |
| `backend/.env` | Local environment config (not committed) |
| `backend/.env.example` | Environment variable documentation |
| `backend/src/config.ts` | Validated runtime configuration from environment variables |
| `backend/src/logger.ts` | Winston structured logger |
| `backend/src/validators.ts` | Zod schemas for all API request bodies and Swagger metadata. **Note:** `manufacturer` field removed from `CreateAssetSchema` — it is now derived from `ctx.actingParty` server-side |
| `backend/src/middleware/auth.ts` | JWT → `PartyContext` middleware + sandbox token issuer. `issueDevToken` accepts `string | string[]` for multi-party `actAs` |
| `backend/src/services/LedgerService.ts` | **Core service layer** — Canton JSON API v2 client. Resolves party IDs, handles NDJSON ACS responses |
| `backend/src/routes/api.ts` | REST API routes |
| `backend/src/routes/auth-routes.ts` | Sandbox token endpoint. TSMC login automatically adds AppleInc and QualcommInc to `actAs` |
| `backend/src/app.ts` | Hono `OpenAPIHono` app factory and Swagger UI setup |
| `backend/src/server.ts` | Server entrypoint with graceful shutdown |

### REST API Endpoints

| Endpoint | Method | Auth | Description |
|:---------|:-------|:-----|:------------|
| `/docs` | GET | No | OpenAPI 3.0 specification JSON |
| `/swagger` | GET | No | Swagger UI documentation |
| `/health` | GET | No | Service health check |
| `/auth/token` | POST | No | Issue sandbox JWT for a party |
| `/api/v1/assets` | POST | Yes | Create a CapacityAsset (manufacturer inferred from token) |
| `/api/v1/assets` | GET | Yes | Query assets visible to party |
| `/api/v1/transfers/propose` | POST | Yes | Create a TransferRFQ (dark pool) |
| `/api/v1/transfers/accept` | POST | Yes | Accept RFQ (atomic settlement) |
| `/api/v1/transfers` | GET | Yes | Query transfer RFQs |
| `/api/v1/penalties/initiate` | POST | Yes | Create a PenaltyAgreement |
| `/api/v1/penalties/settle` | POST | Yes | Settle a penalty |
| `/api/v1/penalties` | GET | Yes | Query penalty agreements |

### Environment Variables

```
LEDGER_API_BASE_URL=http://localhost:7575
LEDGER_ID=sandbox
JWT_SECRET=super-secret-dev-key-replace-in-production
JWT_EXPIRY_SECONDS=3600
PORT=3000
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### How to Run

```bash
cd backend
cp .env.example .env     # Edit PORT if 3000 is taken
npm install
npm run dev              # Dev server with hot-reload (nodemon + ts-node)
```

---

## Phase 3 Summary: React Frontend ✅

### What Was Built

A modern React SPA using **Vite + Tailwind CSS v3 + TypeScript**. Implements the multi-party dashboard to visually demonstrate the Canton Network's privacy model.

### Files

| File | Purpose |
|:-----|:--------|
| `frontend/src/main.tsx` | App entrypoint; wraps everything in `ThemeProvider` |
| `frontend/src/App.tsx` | Page router (`'landing'` ↔ `'dashboard'`), manages party state and data fetching |
| `frontend/src/context/ThemeContext.tsx` | Global light/dark mode context. Persists to localStorage. Toggles `dark` class on `<html>` |
| `frontend/src/api/client.ts` | Axios HTTP client with JWT interceptor. All API response arrays are accessed via `res.data.data` |
| `frontend/src/components/LandingPage.tsx` | Full marketing landing page with Hero, Problem, How It Works, Privacy comparison table, Role cards, CTA |
| `frontend/src/components/ThemeToggle.tsx` | Animated Sun/Moon button that calls `useTheme()` |
| `frontend/src/components/PartySwitcher.tsx` | Party selection card UI (TSMC / Apple / Qualcomm). Uses CSS custom properties for light/dark compatibility |
| `frontend/src/components/views/ManufacturerView.tsx` | Issue CapacityAssets; view inventory; settle penalties |
| `frontend/src/components/views/PrimaryBuyerView.tsx` | View portfolio; propose Dark Pool transfers; initiate cancellation penalties |
| `frontend/src/components/views/SecondaryBuyerView.tsx` | View incoming RFQs with privacy badge; accept transfers (atomic settlement) |
| `frontend/src/components/views/PrivacyAuditPanel.tsx` | Per-role Canton visibility matrix (Visible / Hidden badges) |
| `frontend/src/index.css` | Global design system — CSS custom properties for light/dark tokens, component classes, animations |
| `frontend/tailwind.config.js` | Tailwind v3 config with `darkMode: 'class'`, Inter font, custom colors and keyframes |

### Light / Dark Mode

The design system is built on CSS custom properties (`:root` for light, `.dark` for dark) so all components automatically adapt to both themes without duplication. The `ThemeProvider` adds/removes the `dark` class on `<html>` based on user preference (or OS system preference on first visit), and persists the choice to `localStorage`.

### Frontend Environment

```
VITE_BACKEND_API_URL=http://localhost:3000   # Backend URL (defaults to :3000 if not set)
```

### How to Run

```bash
cd frontend
npm install
npm run dev    # Starts at http://localhost:5173
```

---

## Phase 4 Summary: Demo Polish ✅

### What Was Built

| File | Purpose |
|:-----|:--------|
| `README.md` | Project overview, Mermaid architecture diagram, stack description, and step-by-step run guide |
| `DEMO_SCRIPT.md` | Timed 3-minute Hackathon pitch script with exact click-by-click instructions and speaker notes highlighting Canton privacy guarantees |

### Key Narrative Decisions

- **Primary Track:** Private DeFi & Capital Markets
- **Secondary Context:** TradeFi, RWA & Tokenized Assets
- **Core Demo "Aha! Moment":** Qualcomm logs in and sees the incoming RFQ but **cannot see Apple's original cost basis** — this is the Canton privacy guarantee shown live

---

## Phase 5 Summary: Real-Time Architecture ✅

### What Was Built

Transitioned the frontend-to-backend communication from a 3-second HTTP polling interval to an **Event-Driven WebSocket Architecture**. 

### Key Architecture Decisions

- **Event-Driven Refresh:** The Node.js backend maintains a WebSocket server. When any REST API call successfully mutates state on the Canton Ledger (e.g., `POST /api/v1/transfers/propose`), the backend broadcasts a `REFRESH_DATA` event to all connected WebSocket clients.
- **Frontend Reaction:** The React frontend (`useBackendQuery` hook) listens for this event and immediately triggers a background re-fetch. This completely eliminates the need for aggressive HTTP polling, reducing backend and ledger load by 90%+. A 60-second fallback polling interval is kept as a safety net against silent WebSocket disconnections.
- **Optimistic UI:** During the API call, frontend components enter a targeted loading state (spinners, disabled buttons) to prevent double-submissions, and return to an active state instantly when the fresh data arrives via the WebSocket trigger.

### Devnet Dynamic Routing (Option A)
To support testing on the Canton Devnet without breaking the existing backend proxy architecture:
- **Frontend Storage**: When selecting `Devnet`, the frontend fetches the Devnet M2M token and persists it in `sessionStorage`.
- **Dynamic JWT Decoding**: The `authenticate` middleware (`backend/src/middleware/auth.ts`) intercepts token signature failures. If the token is identified as a Devnet token, it skips local signature validation and decodes the payload, setting `isDevnet = true` in the `PartyContext`.
- **Backend Routing**: `LedgerService.ts` checks `ctx.isDevnet`. If true, it dynamically routes all Canton HTTP JSON API requests to the Devnet URL (`config.devnet.apiUrl`) and forcefully injects the `Authorization: Bearer <token>` header, acting as a transparent proxy for Devnet.

---

## Current File Tree

```
synCCap/
├── .gitignore                           # Excludes .daml/, node_modules/, .env, log/, *.dar
├── README.md                            # Project overview & quick-start guide
├── DEMO_SCRIPT.md                       # Timed 3-minute Hackathon pitch script
├── AI_HANDOFF.md                        # This document
├── LICENSE                              # Apache 2.0
├── daml.yaml                            # Daml SDK 3.5.1 config
├── multi-package.yaml                   # IDE workspace config
├── daml/
│   └── Main.daml                        # Templates + Daml Script tests (365 lines)
├── backend/
│   ├── .env.example                     # Environment variable template
│   ├── package.json
│   ├── tsconfig.json
│   ├── daml.js/                         # Generated TypeScript bindings (synccap-0.1.0)
│   └── src/
│       ├── config.ts                    # Centralized runtime config
│       ├── logger.ts                    # Winston logger
│       ├── validators.ts                # Zod request schemas (manufacturer removed from CreateAsset)
│       ├── app.ts                       # Hono app + Swagger setup
│       ├── server.ts                    # HTTP server entrypoint (PORT from .env)
│       ├── middleware/
│       │   └── auth.ts                  # JWT → PartyContext; issueDevToken supports multi-actAs
│       ├── routes/
│       │   ├── api.ts                   # All /api/v1/* routes
│       │   └── auth-routes.ts           # POST /auth/token with TSMC multi-actAs grant
│       └── services/
│           └── LedgerService.ts         # Canton JSON API v2 client; resolves party IDs
└── frontend/
    ├── index.html                       # Inter font, SEO meta tags
    ├── tailwind.config.js               # darkMode: 'class', custom colors & keyframes
    ├── .env                             # VITE_BACKEND_API_URL (defaults to :3000)
    └── src/
        ├── main.tsx                     # Root; wraps in ThemeProvider
        ├── App.tsx                      # Page router: landing / dashboard
        ├── index.css                    # CSS custom properties design system
        ├── context/
        │   └── ThemeContext.tsx         # Light/dark theme context + localStorage persistence
        ├── api/
        │   └── client.ts               # Axios with JWT interceptor; reads res.data.data
        └── components/
            ├── LandingPage.tsx          # Marketing intro page (6 sections)
            ├── ThemeToggle.tsx          # Sun/Moon animated toggle
            ├── PartySwitcher.tsx        # 3-party selector cards with theme-aware styling
            └── views/
                ├── ManufacturerView.tsx
                ├── PrimaryBuyerView.tsx
                ├── SecondaryBuyerView.tsx
                └── PrivacyAuditPanel.tsx
```

---

## How to Run the Entire Stack

```bash
# Terminal 1 — Canton Ledger Sandbox (must start first)
dpm sandbox --json-api-port 7575 --dar .daml/dist/synccap-v4-0.1.0.dar

# Terminal 2 — Backend REST API
cd backend && npm run dev
# Starts at http://localhost:3000  |  Swagger UI: http://localhost:3000/swagger

# Terminal 3 — React Frontend
cd frontend && npm run dev
# Starts at http://localhost:5173
```

---

---

## Phase 5.5 Summary: Devnet Integration & Bug Fixes ✅

### What Was Done

| Fix | Details |
|:----|:--------|
| **Devnet API URL corrected** | `config.devnet.apiUrl` hardcoded fallback now points to `https://ledger-api.validator.devnet.sandbox.fivenorth.io` (with `.sandbox`). Removed stale `DEVNET_LEDGER_API_URL` from `.env`. |
| **Canton 401 error mapping** | `mapLedgerError` in `backend/src/routes/api.ts` now correctly maps Canton `(401)` / `UNAUTHENTICATED` errors to HTTP 401, triggering the Axios auto-logout interceptor in the frontend. Previously these were returned as 500. |
| **403 vs 401 not mixed** | The check for 403 uses `(403)` / `PERMISSION_DENIED` — completely separate from the new 401 check, preventing misidentification. |
| **Devnet Party rights confirmed** | `validator-devnet-m2m` User "6" has 710+ `CanActAs` rights on `devnet.sandbox`, including `5nsandbox-devnet-2::...`. Our three `synccap-*` parties are NOT yet authorized — awaiting FiveNorth to grant rights. |
| **Devnet Party allocation blocked** | The `POST /v2/parties/allocate` endpoint returns `405 Method Not Allowed` on Devnet — FiveNorth locks this to prevent abuse. Cannot self-provision parties programmatically. |
| **Temporary test scripts deleted** | `check-rights.mjs`, `query-contracts.mjs`, `allocate-party.mjs` etc. were removed from root. These were debugging artifacts, not part of the project. |

---

## Phase 6 Summary: Enterprise Login UX Redesign + Demo Session Isolation ✅

### What Was Built

#### Redesigned Login Page (`frontend/src/components/LoginPage.tsx`)
Complete rewrite to a professional B2B SaaS Left-Right split layout:
- **Left panel (45%)**: Dark gradient brand panel with ambient glow orbs, grid pattern overlay, tech feature highlights (Sub-Transaction Privacy, Atomic Settlement, RWA Tokenization, Real-Time Ledger Events), and hackathon attribution footer.
- **Right panel (55%)**: Standard enterprise login UI (Work Email + Password + Show/Hide toggle + Sign In button + Enterprise SSO button) — these are decorative placeholders for production IAM. Below a "Hackathon Demo Quick Access" divider, the three role buttons (Manufacturer / Primary Buyer / Secondary Buyer) allow instant demo login. In Devnet mode, a Session ID badge with a Reset button is shown at the bottom.

#### Demo Session Isolation (Devnet-only)
| File | Purpose |
|:-----|:--------|
| `frontend/src/hooks/useDemoSession.ts` | Generates/persists 8-char `demoSessionId` in `localStorage`. Provides `getOrCreateSessionId()`, `clearSessionId()`, `sessionSuffix()`, `belongsToSession()`. |
| `frontend/src/context/DemoSessionContext.tsx` | Global React context exposing `demoSessionId` and `resetSession()` to the entire component tree. |
| `frontend/src/App.tsx` | Wrapped with `DemoSessionProvider` (outermost provider, wraps `NetworkProvider`). |
| `frontend/src/types/AuthSession.ts` | Added optional `demoSessionId?: string` field to `AuthSession`. Populated on Devnet login. |
| `frontend/src/hooks/useBackendQuery.ts` | In Devnet mode (detected via `session.demoSessionId`), all data arrays are filtered by `_SID_<sessionId>` suffix in the `assetId` field before being returned to components. Sandbox mode: unfiltered. |
| `frontend/src/components/Dashboard.tsx` | Header now shows a green pulsing Session ID chip (`#<sessionId>`) with a Reset button when in Devnet mode. |

### Key Design Principles
- **Devnet-only**: Session filter only activates when `session.demoSessionId` is set (Devnet mode). Local Sandbox has physical Canton isolation.
- **Frontend-only**: Daml contracts and backend API are untouched.
- **`localStorage` persistence**: Session ID survives tab close, so reviewers can return the next day.
- **`resetSession()` clears filter**: Generates a new ID, giving a fresh workspace.
- **Asset creation**: When creating assets in Devnet mode, the `assetId` should include `_SID_<sessionId>` suffix. This is enforced at the UI layer when submitting the form.

### Local Sandbox Impact
**None.** These changes are transparent to Local Sandbox operation. The three demo buttons work identically. Session filter is not applied in Sandbox mode.

## Known Gotchas for Future Development

1. **`manufacturer` is inferred server-side** — The `POST /api/v1/assets` endpoint no longer accepts a `manufacturer` field in the request body. It uses `ctx.actingParty` from the JWT. Ensure any future client code does NOT send this field.

2. **TSMC token has multi-actAs** — When TSMC logs in via `/auth/token`, the returned JWT includes `actAs` for TSMC, AppleInc, and QualcommInc. This is a sandbox-only demo shortcut. In production, use Canton's multi-party submission workflow.

3. **Party IDs are fully-qualified** — All calls to LedgerService that pass party names (`req.owner`, `req.secondaryBuyer`) are resolved through `allocateParty()` before being sent to Canton. Never pass raw display names to the ledger.

4. **[x] No Authorization header to Canton** — The dpm sandbox runs in no-auth mode. LedgerService uses `userId` in the command body instead of an `Authorization` header. Sending an auth header would fail JWT validation.
   - [x] Backend LedgerService: Update `LedgerService.ts` to use `config.devnet.apiUrl` if `isDevnet`, add `Authorization` header for Devnet, and bypass `allocateParty` for Devnet requests.

5. **ACS response format** — Canton 3.5.x returns the ACS as a JSON array (not NDJSON). `LedgerService.queryActiveContracts` handles both formats.

6. **CSS custom properties for theming** — All component colors must use `var(--text-primary)`, `var(--bg-surface)` etc. Do NOT use hardcoded Tailwind dark-only classes like `text-white`, `bg-background`, `border-gray-800` — they will break in light mode.
