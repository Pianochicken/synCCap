---
name: canton-blockchain-development
description: >
  Canton Network / Daml blockchain development patterns and gotchas. Triggers on:
  Canton sandbox, Daml contracts, ledger API, party management, JWT auth with Canton,
  smart contract templates, signatory/observer patterns, sub-transaction privacy,
  and any integration between a backend service and the Canton JSON Ledger API.
---

# Canton Network & Daml Development Standards

Hard-won patterns from integrating with Canton SDK 3.x and the JSON Ledger API v2.
These gotchas are poorly documented and will waste hours if not known in advance.

---

## 1. Canton SDK 3.x: The `@daml/ledger` Package is Dead

### Rule
**Do NOT install `@daml/ledger` from npm.** It stopped at v2.10.4 and is incompatible
with Canton SDK 3.x. Use raw HTTP against the JSON Ledger API v2 endpoints instead.

### Endpoints
```
POST /v2/commands/submit-and-wait    — Create contracts & exercise choices
POST /v2/state/active-contracts      — Query the Active Contract Set (ACS)
GET  /v2/state/ledger-end            — Get current ledger offset
POST /v2/parties                     — Allocate or look up parties
```

### Template ID Format
Use the stable package-name format, not the package hash:
```
#synccap:Main:CapacityAsset     ✅ Stable across recompilations
abc123...hash:Main:CapacityAsset  ❌ Changes on every daml build
```

---

## 2. Party ID Resolution is Mandatory

### Rule
Canton uses fully-qualified party IDs like `Manufacturer::1220abc...def`.
Human-readable names (`Manufacturer`, `PrimaryBuyer`) are just "hints" — they must be
resolved to full IDs before any ledger command.

### Implementation Pattern
```typescript
async function resolvePartyId(partyHint: string): Promise<string> {
  // Try to allocate — if party exists, Canton returns the existing ID
  const res = await fetch(`${LEDGER_URL}/v2/parties`, {
    method: 'POST',
    body: JSON.stringify({
      party_id_hint: partyHint,
      display_name: partyHint,
    }),
  });
  const data = await res.json();
  return data.party_details.party; // "Manufacturer::1220abc...def"
}
```

### Anti-Pattern
```typescript
// ❌ WILL FAIL — Canton rejects raw display names in commands
commands: [{ actAs: ['Manufacturer'] }]

// ✅ CORRECT — resolved full ID
commands: [{ actAs: ['Manufacturer::1220abc...def'] }]
```

---

## 3. Dual-Signatory Contracts Require Multi-Party `actAs`

### Rule
If a Daml template has **multiple signatories** (e.g., both `manufacturer` and `owner`),
the submitting party's token must include ALL signatories in the `actAs` claim.
In sandbox/demo mode, this means the issuing party (e.g., Manufacturer) needs a token
that can act as both itself AND the buyer.

### Implementation Pattern
```typescript
// When Manufacturer logs in, grant actAs for all demo parties
if (partyHint === 'Manufacturer') {
  const manufacturerId = await resolvePartyId('Manufacturer');
  const primaryBuyerId = await resolvePartyId('PrimaryBuyer');
  const secondaryBuyerId = await resolvePartyId('SecondaryBuyer');
  return issueToken({ actAs: [manufacturerId, primaryBuyerId, secondaryBuyerId] });
}
```

### Why This Catches People Off Guard
In single-signatory templates, `actAs: [submitter]` works fine. The moment you add a
second signatory, Canton **silently rejects** the command with an authorization error
unless both parties are in the `actAs` list. The error message does NOT clearly say
"missing signatory" — it says something vague about authorization.

---

## 4. Canton Sandbox Runs Without Auth

### Rule
The `dpm sandbox` command starts Canton in **no-auth mode**. Do NOT send an
`Authorization` header to the Canton JSON API — it will fail JWT validation.
Instead, pass `userId` directly in the command body.

```typescript
// ✅ CORRECT for sandbox
const body = {
  commands: { ... },
  user_id: partyId,  // NOT in a header
};

// ❌ WRONG — sandbox rejects JWT headers
headers: { 'Authorization': `Bearer ${token}` }
```

> **Note:** In production Canton nodes, you DO use proper JWT via an Identity Provider.
> This sandbox behavior is a common trap for developers.

---

## 5. ACS Response Format: Handle Both JSON Array and NDJSON

### Rule
The `/v2/state/active-contracts` endpoint may return results as either:
- A standard JSON array (Canton 3.5.x default)
- Newline-Delimited JSON (NDJSON) in some configurations

Your parser must handle both:
```typescript
function parseACSResponse(text: string): Contract[] {
  try {
    // Try standard JSON first
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Fall back to NDJSON
    return text.trim().split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
}
```

---

## 6. Numeric Fields Must Be Strings

### Rule
All monetary/financial values in Daml use `Decimal`, which maps to **string** in the
JSON API to preserve precision. Never use JavaScript `number` for financial fields.

```typescript
// ✅ CORRECT
interface AssetPayload {
  costBasisPerWafer: string;    // "18500.00"
  penaltyAmount: string;        // "720000.00"
}

// ❌ WRONG — floating point precision loss
interface AssetPayload {
  costBasisPerWafer: number;    // 18500 (lost decimal precision)
}
```

---

## 7. Server-Side Field Derivation for Security

### Rule
Security-sensitive fields (like `manufacturer`) should be derived from the
authenticated context on the server, never accepted from client input.

```typescript
// ✅ CORRECT — manufacturer comes from the authenticated party
const manufacturer = ctx.actingParty;  // From JWT

// ❌ WRONG — client can forge the manufacturer identity
const { manufacturer } = req.body;
```

---

## 8. Canton Privacy Model: Design Implications

### Key Principle
Canton's privacy model is **physical state segregation**, not just access control.
When designing UIs and APIs:

- A party literally **cannot see** contracts where they are not a signatory or observer
- Querying the ACS as Party A returns a DIFFERENT result set than querying as Party B
- This is not a bug — it's the core Canton value proposition
- Design your UI to make this invisible state segregation VISIBLE to users
  (e.g., Privacy Audit Matrix showing what each party can/cannot see)

### Template Privacy Design Checklist
- [ ] Who are the signatories? (They can see everything and must authorize)
- [ ] Who are the observers? (They can see but not act)
- [ ] What fields should NEVER transfer to new contracts? (e.g., `costBasisPerWafer`)
- [ ] Which choices create new contracts visible to different parties?
- [ ] Is there a sub-transaction that archives a contract containing sensitive data
      before a new observer can see it?

---

## 9. Canton 3.x User Management & JSON API Rights Format

### Rule: Users are Mandatory for Command Submission
In Canton 3.x, even if the sandbox is running in **no-auth mode**, the `userId` provided in a command payload MUST actually exist in Canton's user management database. If you submit a command with an unknown `userId`, Canton will reject it with `404 USER_NOT_FOUND`. 
Therefore, after allocating a Party, you MUST also create a User via `POST /v2/users`.

### Rule: Strict gRPC-JSON Transcoded Rights Format
When creating a User via the JSON API, the format for the `rights` array uses strict gRPC transcoded syntax (nested `kind` objects with capitalized variants). The older Canton 2.x syntax (`{ type: 'canActAs', party: '...' }`) will fail with `INVALID_ARGUMENT: unknown kind of right`.

### Implementation Pattern
```typescript
// ✅ CORRECT Canton 3.x Format
const userPayload = {
  user: { 
    id: "my-valid-user-id", // Must match [a-z0-9_.-]+ (no double colons '::')
    primaryParty: "my-party::12345",
    identityProviderId: "" // REQUIRED field
  },
  rights: [
    { kind: { CanActAs: { value: { party: "my-party::12345" } } } },
    { kind: { CanReadAs: { value: { party: "other-party::67890" } } } }
  ]
};

// ❌ WRONG (Canton 2.x Format - Will cause INVALID_ARGUMENT)
const wrongPayload = {
  user: { id: "my-user", primaryParty: "my-party::123" },
  rights: [
    { type: "participantAdmin" },
    { type: "canActAs", party: "my-party::123" }
  ]
};
```

---

## 10. Granting Additional Rights in Canton 3.x (M2M Token Pattern)

### Rule: Dynamically Granting Rights to M2M Users
When using a shared Machine-to-Machine (M2M) JWT token in Devnet/Sandbox environments to submit commands on behalf of dynamically created parties, the M2M user does NOT automatically have authorization. You MUST explicitly grant `CanActAs` and `CanReadAs` rights to the M2M user (whose ID is the `sub` claim in the JWT) for the new party *before* submitting any commands. Failing to do so results in silent failures or a `403 Forbidden` error during `POST /v2/commands/submit-and-wait`.

### Rule: The Endpoint and The `userId` Payload Trap
In Canton 3.x, the endpoint for granting rights changed from the old `/v2/user-rights/grant` to **`POST /v2/users/{user-id}/rights`**. 

**CRITICAL TRAP**: Even though the `user-id` is specified in the URL path, **the JSON body MUST still include the `userId` field**. If omitted, Canton will reject the request with a confusing error: `INVALID_ARGUMENT: <user-id> does not match user in body: Some()`. 
Additionally, depending on the exact Canton version, the property for the rights array might be expected as `grantRights` (mapped from gRPC `GrantUserRightsRequest`) or `rights`. 

### Implementation Pattern
```typescript
async function grantM2MRights(m2mUserId: string, targetPartyId: string) {
  // 1. Use the NEW endpoint format: /v2/users/{user-id}/rights
  const url = `${LEDGER_URL}/v2/users/${m2mUserId}/rights`;
  
  // 2. MUST include userId in the body despite it being in the URL
  // 3. Provide both grantRights and rights to ensure schema compatibility
  const payload = {
    userId: m2mUserId, 
    grantRights: [
      { kind: { CanActAs: { value: { party: targetPartyId } } } },
      { kind: { CanReadAs: { value: { party: targetPartyId } } } }
    ],
    rights: [
      { kind: { CanActAs: { value: { party: targetPartyId } } } },
      { kind: { CanReadAs: { value: { party: targetPartyId } } } }
    ]
  };

  await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
}
```
