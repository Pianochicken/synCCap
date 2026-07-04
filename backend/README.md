# synCCap Backend

This directory contains the **Node.js Integration Layer** for the synCCap Canton Network project. It acts as a bridge between HTTP clients (like a frontend dashboard) and the Canton Daml Ledger.

## ⚡ Tech Stack

The backend was modernized in **Phase 2.5** to use a high-performance modern web stack:
- **Framework:** [Hono](https://hono.dev/) (running on `@hono/node-server`)
- **Validation:** [Zod](https://zod.dev/) via `@hono/zod-openapi`
- **Documentation:** Auto-generated Swagger UI (`@hono/swagger-ui`)
- **Ledger Connectivity:** Direct integration with the **Canton JSON Ledger API v2** using native JavaScript `fetch`.

## ✨ Features

- **Automated OpenAPI Specs**: Zod schemas power both runtime request validation and auto-generated Swagger documentation.
- **Strict TypeScript**: Configured with strict compiler options (`noImplicitAny`, `strictNullChecks`, etc.).
- **Decoupled Architecture**: Canton ledger interactions are strictly contained within `LedgerService.ts`, making the API routing layer completely framework-agnostic regarding the ledger.
- **Canton 3.x Compatible**: Uses the latest JSON API v2 endpoints (`/v2/commands/submit-and-wait`, `/v2/state/active-contracts`, `/v2/updates`) and fully-qualified Template IDs.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.20.0 or higher
- Canton Sandbox running (for full functionality)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Running the Server

Start the development server with live reload:
```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## 📚 API Documentation (Swagger UI)

Because this project uses `@hono/zod-openapi`, the API documentation is fully automated and interactive!

1. Start the server (`npm run dev`)
2. Navigate to: **[http://localhost:3000/swagger](http://localhost:3000/swagger)**

From the Swagger UI, you can view the exact schema requirements for each endpoint and send test requests directly to the ledger. 

> **Note:** For Canton integration endpoints under `/api/v1/*`, you will need a Bearer token. 
> - **Local Sandbox**: Generate a token for any party using `POST /auth/token`.
> - **Devnet**: Get the Hackathon M2M Devnet token using `GET /auth/devnet/token`.

## 🧪 Testing

The backend includes a comprehensive integration test suite that tests the full lifecycle of the Capacity Asset, Dark Pool Transfer (RFQ), and Penalty Agreement workflows against a real Canton Sandbox.

```bash
# Run basic tests (skips ledger integration)
npm test

# Run full ledger integration suite (Requires Canton sandbox on port 7575)
npm run test:ledger
```

## 🏗 Directory Structure

```text
src/
├── app.ts                 # Hono app factory and global middleware
├── config.ts              # Strongly typed environment variables
├── logger.ts              # Winston structured logging
├── server.ts              # Server entrypoint and graceful shutdown
├── validators.ts          # Zod schemas with OpenAPI descriptions
├── middleware/
│   └── auth.ts            # Canton JWT validation and Context injection
├── routes/
│   ├── api.ts             # Main API routes for Ledger interactions
│   └── auth-routes.ts     # Sandbox token issuer
└── services/
    └── LedgerService.ts   # Core service bridging HTTP to Canton JSON API v2
```
