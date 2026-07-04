/**
 * @file tests/integration/api.integration.test.ts
 * @description Integration tests for the synCCap REST API.
 *
 * These tests exercise the full HTTP → Express → LedgerService pipeline.
 * They require a running Canton Daml sandbox with the synCCap DAR deployed.
 *
 * Running the tests:
 * ------------------
 * 1. Start the sandbox:
 *      dpm sandbox --json-api-port 7575 --dar .daml/dist/synccap-0.1.0.dar
 *
 * 2. Run the tests:
 *      cd backend && npm run test:integration
 *
 * Test Design:
 * ------------
 * - Tests run sequentially (`--runInBand`) because they share ledger state.
 * - Each test builds on the contracts created by previous tests
 *   (e.g., accept transfer requires a prior propose transfer).
 * - Tests that need the sandbox will be wrapped in a describe block that
 *   can be conditionally skipped.
 *
 * Canton-Specific Notes:
 * ----------------------
 * - The sandbox must be running BEFORE the tests start.
 * - Sandbox tokens use HS256 with the JWT secret from .env.
 * - Party names in the sandbox are simple strings (e.g., "TSMC").
 */

import request from 'supertest';
import { createApp } from '../../src/app';
import { serve } from '@hono/node-server';

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

let app: any;

afterAll((done) => {
  if (app && typeof app.close === 'function') {
    app.close(done);
  } else {
    done();
  }
});

/** Party names for the test scenario. */
// Canton Sandbox is persistent between runs unless restarted.
// We append a random suffix to ensure a clean state for every test execution.
const runId = Math.random().toString(36).substring(2, 8);
const MANUFACTURER = `synccap-manufacturer-${runId}`;
const PRIMARY_BUYER = `synccap-primary-buyer-${runId}`;
const SECONDARY_BUYER = `synccap-secondary-buyer-${runId}`;

/** Tokens obtained during setup. */
let manufacturerToken: string;
let primaryBuyerToken: string;
let secondaryBuyerToken: string;

/**
 * Dual-party token: can act as both manufacturer AND primary buyer.
 * Required for CapacityAsset creation (dual-signatory).
 */
let dualPartyToken: string;

/**
 * Fully-qualified Canton party IDs (e.g., TSMC::1220abc...).
 * These are returned by /auth/token and must be used in contract fields.
 */
let manufacturerPartyId: string = MANUFACTURER;
let primaryBuyerPartyId: string = PRIMARY_BUYER;
let secondaryBuyerPartyId: string = SECONDARY_BUYER;

/** Contract IDs captured during the test flow. */
let assetContractId: string;
let rfqContractId: string;
let penaltyAssetContractId: string;
let penaltyContractId: string;

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'development'; // Allow Canton party allocation
  process.env.JWT_SECRET = 'test-secret-key-for-integration';
  process.env.LEDGER_API_BASE_URL = 'http://localhost:7575';

  const honoApp = createApp();
  app = serve({ fetch: honoApp.fetch, port: 0 });
});

// ---------------------------------------------------------------------------
// Auth Tests
// ---------------------------------------------------------------------------

describe('POST /auth/token', () => {
  it('should issue a token for a valid party', async () => {
    const res = await request(app)
      .post('/auth/token')
      .send({ party: MANUFACTURER })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    manufacturerToken = res.body.token;
    // Capture the real Canton party ID (TSMC::1220...)
    if (res.body.partyId) manufacturerPartyId = res.body.partyId;
  });

  it('should issue tokens for all test parties', async () => {
    const primaryRes = await request(app)
      .post('/auth/token')
      .send({ party: PRIMARY_BUYER })
      .expect(200);
    primaryBuyerToken = primaryRes.body.token;
    if (primaryRes.body.partyId) primaryBuyerPartyId = primaryRes.body.partyId;

    const secondaryRes = await request(app)
      .post('/auth/token')
      .send({ party: SECONDARY_BUYER })
      .expect(200);
    secondaryBuyerToken = secondaryRes.body.token;
    if (secondaryRes.body.partyId) secondaryBuyerPartyId = secondaryRes.body.partyId;

    // Dual-party token: actAs Manufacturer AND Primary Buyer
    const dualRes = await request(app)
      .post('/auth/token')
      .send({
        party: MANUFACTURER,
        additionalActAs: [PRIMARY_BUYER],
      })
      .expect(200);
    dualPartyToken = dualRes.body.token;
    // Re-capture manufacturer ID (may differ on subsequent calls due to existing party)
    if (dualRes.body.partyId) manufacturerPartyId = dualRes.body.partyId;
  });

  it('should reject empty party', async () => {
    await request(app)
      .post('/auth/token')
      .send({ party: '' })
      .expect(400);
  });

  it('should reject missing party field', async () => {
    await request(app)
      .post('/auth/token')
      .send({})
      .expect(400);
  });
});

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('should return service health', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('synccap-backend');
  });
});

// ---------------------------------------------------------------------------
// Auth Middleware Tests
// ---------------------------------------------------------------------------

describe('Authentication middleware', () => {
  it('should reject requests without Authorization header', async () => {
    await request(app)
      .get('/api/v1/assets')
      .expect(401);
  });

  it('should reject requests with invalid token', async () => {
    await request(app)
      .get('/api/v1/assets')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });

  it('should reject requests with expired token', async () => {
    // Create a token that's already expired
    const jwt = await import('jsonwebtoken');
    const expiredToken = jwt.default.sign(
      { actAs: ['TestParty'], readAs: [], sub: 'TestParty' },
      'test-secret-key-for-integration',
      { expiresIn: -10 } // Already expired
    );

    await request(app)
      .get('/api/v1/assets')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});

// ---------------------------------------------------------------------------
// Validation Tests
// ---------------------------------------------------------------------------

describe('Request validation', () => {
  it('should reject asset creation with missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${manufacturerToken}`)
      .send({ manufacturer: MANUFACTURER })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('should reject invalid technologyNode', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${manufacturerToken}`)
      .send({
        manufacturer: MANUFACTURER,
        owner: PRIMARY_BUYER,
        assetId: 'TEST-001',
        technologyNode: 'InvalidNode',
        waferStartsPerMonth: 100,
        costBasisPerWafer: '15000.00',
        commitmentStartDate: '2025-07-01',
        commitmentEndDate: '2026-06-30',
      })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject negative wafer starts', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${manufacturerToken}`)
      .send({
        manufacturer: MANUFACTURER,
        owner: PRIMARY_BUYER,
        assetId: 'TEST-001',
        technologyNode: 'N3nm',
        waferStartsPerMonth: -100,
        costBasisPerWafer: '15000.00',
        commitmentStartDate: '2025-07-01',
        commitmentEndDate: '2026-06-30',
      })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject zero costBasisPerWafer', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${manufacturerToken}`)
      .send({
        manufacturer: MANUFACTURER,
        owner: PRIMARY_BUYER,
        assetId: 'TEST-001',
        technologyNode: 'N3nm',
        waferStartsPerMonth: 100,
        costBasisPerWafer: '0',
        commitmentStartDate: '2025-07-01',
        commitmentEndDate: '2026-06-30',
      })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject penalty rate > 1', async () => {
    const res = await request(app)
      .post('/api/v1/penalties/initiate')
      .set('Authorization', `Bearer ${primaryBuyerToken}`)
      .send({
        assetContractId: 'some-id',
        penaltyRate: '1.5',
        cancellationReason: 'test',
      })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject propose transfer with missing secondaryBuyer', async () => {
    const res = await request(app)
      .post('/api/v1/transfers/propose')
      .set('Authorization', `Bearer ${primaryBuyerToken}`)
      .send({
        assetContractId: 'some-id',
        askingPricePerWafer: '21500.00',
      })
      .expect(400);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 404 Tests
// ---------------------------------------------------------------------------

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/api/v1/nonexistent')
      .set('Authorization', `Bearer ${manufacturerToken}`)
      .expect(404);

    expect(res.body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Ledger Integration Tests (Require Running Sandbox)
// ---------------------------------------------------------------------------

/**
 * These tests require a running Daml sandbox. They are wrapped in a
 * conditional describe block that skips if SKIP_LEDGER_TESTS is set.
 *
 * To run:
 *   1. Start sandbox: dpm sandbox --json-api-port 7575 --dar .daml/dist/synccap-0.1.0.dar
 *   2. Run: npm run test:integration
 *
 * To skip:
 *   SKIP_LEDGER_TESTS=1 npm run test:integration
 */
const describeLedger = process.env.SKIP_LEDGER_TESTS
  ? describe.skip
  : describe;

describeLedger('Ledger integration (requires running sandbox)', () => {
  // -----------------------------------------------------------------------
  // Asset Lifecycle
  // -----------------------------------------------------------------------

  describe('CapacityAsset lifecycle', () => {
    it('POST /api/v1/assets — should create a CapacityAsset', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${dualPartyToken}`)
        .send({
          manufacturer: manufacturerPartyId,
          owner: primaryBuyerPartyId,
          assetId: 'LOT-TSMC-3NM-2025Q3-001',
          technologyNode: 'N3nm',
          waferStartsPerMonth: 200,
          costBasisPerWafer: '18500.00',
          commitmentStartDate: '2025-07-01',
          commitmentEndDate: '2026-06-30',
        });

      if (res.status !== 201) {
        console.error('Asset creation failed:', res.body);
      }
      expect(res.status).toBe(201);

      expect(res.body.data).toHaveProperty('contractId');
      expect(res.body.data.assetId).toBe('LOT-TSMC-3NM-2025Q3-001');
      assetContractId = res.body.data.contractId;
    });

    it('POST /api/v1/assets — should create a second asset for penalty testing', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${dualPartyToken}`)
        .send({
          manufacturer: manufacturerPartyId,
          owner: primaryBuyerPartyId,
          assetId: 'LOT-TSMC-5NM-2025Q4-002',
          technologyNode: 'N5nm',
          waferStartsPerMonth: 150,
          costBasisPerWafer: '12000.00',
          commitmentStartDate: '2025-10-01',
          commitmentEndDate: '2026-09-30',
        })
        .expect(201);

      penaltyAssetContractId = res.body.data.contractId;
    });

    it('GET /api/v1/assets — manufacturer should see created assets', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body.count).toBeGreaterThanOrEqual(2);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/v1/assets — secondary buyer should see no assets (privacy)', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${secondaryBuyerToken}`)
        .expect(200);

      // Secondary buyer has no signatory/observer relationship yet
      expect(res.body.count).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Transfer (Dark Pool) Lifecycle
  // -----------------------------------------------------------------------

  describe('TransferRFQ lifecycle (dark pool)', () => {
    it('POST /api/v1/transfers/propose — should create a dark pool RFQ', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/propose')
        .set('Authorization', `Bearer ${primaryBuyerToken}`)
        .send({
          assetContractId,
          secondaryBuyer: secondaryBuyerPartyId,
          askingPricePerWafer: '21500.00',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('rfqContractId');
      rfqContractId = res.body.data.rfqContractId;
    });

    it('GET /api/v1/transfers — buyer should see the RFQ', async () => {
      const res = await request(app)
        .get('/api/v1/transfers')
        .set('Authorization', `Bearer ${secondaryBuyerToken}`)
        .expect(200);

      expect(res.body.count).toBeGreaterThanOrEqual(1);

      // Buyer should see asking price but NOT costBasisPerWafer
      const rfq = res.body.data[0];
      expect(rfq.payload.askingPricePerWafer).toBeDefined();
      expect(rfq.payload).not.toHaveProperty('costBasisPerWafer');
    });

    it('POST /api/v1/transfers/accept — should atomically settle the transfer', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/accept')
        .set('Authorization', `Bearer ${secondaryBuyerToken}`)
        .send({
          rfqContractId,
          agreedPricePerWafer: '21500.00',
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('newAssetContractId');
    });

    it('GET /api/v1/assets — secondary buyer should now own an asset', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${secondaryBuyerToken}`)
        .expect(200);

      expect(res.body.count).toBeGreaterThanOrEqual(1);

      // The buyer's cost basis should be the AGREED price, not the original
      const asset = res.body.data.find(
        (a: { payload: { owner: string } }) => a.payload.owner === secondaryBuyerPartyId
      );
      expect(asset).toBeDefined();
      // Wait, let's also verify costBasisPerWafer format. Daml Numeric 10 has 10 decimal places.
      expect(parseFloat(asset.payload.costBasisPerWafer)).toBe(21500.0);
    });
  });

  // -----------------------------------------------------------------------
  // Penalty Lifecycle
  // -----------------------------------------------------------------------

  describe('PenaltyAgreement lifecycle', () => {
    it('POST /api/v1/penalties/initiate — should create a penalty agreement', async () => {
      const res = await request(app)
        .post('/api/v1/penalties/initiate')
        .set('Authorization', `Bearer ${primaryBuyerToken}`)
        .send({
          assetContractId: penaltyAssetContractId,
          penaltyRate: '0.25',
          cancellationReason: 'Market downturn — reducing capacity commitment',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('penaltyContractId');
      penaltyContractId = res.body.data.penaltyContractId;
    });

    it('GET /api/v1/penalties — manufacturer should see the penalty', async () => {
      const res = await request(app)
        .get('/api/v1/penalties')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/penalties — secondary buyer should see NO penalties (privacy)', async () => {
      const res = await request(app)
        .get('/api/v1/penalties')
        .set('Authorization', `Bearer ${secondaryBuyerToken}`)
        .expect(200);

      // PenaltyAgreement has zero observers — completely invisible
      expect(res.body.count).toBe(0);
    });

    it('POST /api/v1/penalties/settle — manufacturer should settle the penalty', async () => {
      const res = await request(app)
        .post('/api/v1/penalties/settle')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          penaltyContractId,
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('settledContractId');
    });
  });
});
