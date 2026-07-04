/**
 * @file config.ts
 * @description Centralised runtime configuration for the synCCap backend.
 *
 * All environment-specific values are validated here at startup.
 * The rest of the application imports from this module — never from
 * `process.env` directly — to ensure a single source of truth.
 */

import dotenv from 'dotenv';

dotenv.config();

/** Parses and validates a required string environment variable. */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}

/** Parses an optional integer environment variable with a fallback default. */
function optionalIntEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be an integer, got: "${raw}"`
    );
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Exported configuration object — strongly typed, no `any`.
// ---------------------------------------------------------------------------

export const config = {
  /**
   * Node.js environment (development | production | test).
   */
  env: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',

  /**
   * Express server port.
   */
  port: optionalIntEnv('PORT', 3000),

  /**
   * Canton HTTP JSON Ledger API V2 base URL.
   *
   * @example http://localhost:7575
   *
   * Canton-specific note: The JSON Ledger API provides an OpenAPI spec
   * at <baseUrl>/docs/openapi that can be used for client generation.
   * The @daml/ledger package wraps the V1 HTTP JSON API; for V2 in
   * production, use the raw fetch client against /v2/ endpoints.
   */
  ledger: {
    baseUrl: process.env.LEDGER_API_BASE_URL ?? 'http://localhost:7575',
    ledgerId: process.env.LEDGER_ID ?? 'sandbox',
  },

  /**
   * JWT configuration for Daml party authentication.
   *
   * Canton-specific note: Each JWT token encodes the acting party and
   * read-as parties. The sandbox accepts HS256 tokens; production Canton
   * nodes require RS256 tokens issued by the participant's IAM system.
   */
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-replace-in-production',
    expirySeconds: optionalIntEnv('JWT_EXPIRY_SECONDS', 3600),
  },

  /**
   * CORS allowed origins.
   */
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },

  /**
   * Devnet Seaport Auth Configuration (Hackathon M2M Client)
   */
  devnet: {
    clientId: process.env.DEVNET_CLIENT_ID || '',
    clientSecret: process.env.DEVNET_CLIENT_SECRET || '',
    tokenUrl: process.env.DEVNET_TOKEN_URL || 'https://auth.sandbox.fivenorth.io/application/o/token/',
  }
} as const;
