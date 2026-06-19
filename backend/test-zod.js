const { CreateAssetSchema } = require('./src/validators');

const body = {
  manufacturer: 'TSMC',
  owner: 'AppleInc',
  assetId: 'LOT-TSMC-3NM-2025Q3-001',
  technologyNode: 'N3nm',
  waferStartsPerMonth: 200,
  costBasisPerWafer: '18500.00',
  commitmentStartDate: '2025-07-01',
  commitmentEndDate: '2026-06-30'
};

const result = CreateAssetSchema.safeParse(body);
if (!result.success) {
  console.log("Validation Failed:", JSON.stringify(result.error.issues, null, 2));
} else {
  console.log("Validation Succeeded!");
}
