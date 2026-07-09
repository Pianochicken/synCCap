/**
 * @file hooks/useDemoSession.ts
 * @description Manages the Demo Session ID for public demo isolation.
 *
 * When the app runs on a public URL (Devnet mode), multiple visitors will
 * share the same Canton parties. This hook generates a unique 8-char
 * session ID per browser, stored in localStorage, and used to tag/filter
 * contracts so each visitor sees only their own demo data.
 *
 * Only active in Devnet mode. Local sandbox has physical Canton isolation.
 */

const STORAGE_KEY = 'synccap_demo_session_id';

/** Generates a random 8-character alphanumeric session ID. */
function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Gets the existing session ID from localStorage, or generates and stores a new one. */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const newId = generateSessionId();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    return generateSessionId();
  }
}

/** Explicitly sets the session ID (e.g. when joining via an invite link). */
export function setSessionId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/** Clears the stored session ID and generates a fresh one. */
export function clearSessionId(): string {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return getOrCreateSessionId();
}

/** The suffix format appended to asset IDs to tag them with the session. */
export function sessionSuffix(sessionId: string): string {
  return `_SID_${sessionId}`;
}

/** Checks if a given asset ID belongs to this session. */
export function belongsToSession(assetId: string, sessionId: string): boolean {
  return assetId.includes(`_SID_${sessionId}`);
}
