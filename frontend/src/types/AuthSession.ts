/**
 * @file types/AuthSession.ts
 * @description Authentication session types for the synCCap platform.
 *
 * Each authenticated user represents a single company. Users log in as
 * their company (Manufacturer, Primary Buyer, or Secondary Buyer) and
 * the session scopes all ledger queries to that company's perspective.
 */

/** The role this authenticated company plays on the platform. */
export type PartyRole = 'Manufacturer' | 'PrimaryBuyer' | 'SecondaryBuyer';

/**
 * Represents the authenticated session for a single company user.
 * Stored in sessionStorage to persist across page refreshes within
 * the same browser tab, but cleared when the tab is closed.
 */
export interface AuthSession {
  /** The fully qualified Canton Party ID, e.g. "TSMC::1220abc..." */
  partyId: string;
  /** Human-readable company name, e.g. "TSMC" */
  displayName: string;
  /** The role this company plays on the platform */
  role: PartyRole;
  /**
   * Demo Session ID (Devnet only). An 8-char unique ID stored in localStorage
   * used to filter contracts on the public demo URL, preventing data collision
   * between multiple simultaneous visitors sharing the same Canton party.
   */
  demoSessionId?: string;
}

/** Pre-registered companies on the synCCap platform (Canton sandbox). */
export interface CompanyConfig {
  id: string;
  displayName: string;
  role: PartyRole;
  description: string;
  icon: string;
  accentColor: string;
}
