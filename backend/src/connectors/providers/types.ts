import { CalEvent, SnapshotEvent } from '../calendar-diff';
import { ParsedClient } from '../csv';

export type Credentials = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  /** provider-specific data kept in ConnectedIntegration.config.extra (e.g. API shard, user URI) */
  extra?: Record<string, string>;
};

export type ProviderField = { name: string; label: string; secret?: boolean; placeholder?: string };

export type Ctx = {
  accessToken: string;
  timezone?: string;
  extra: Record<string, string>;
  /** previous snapshot, so adapters can avoid re-fetching details they already know */
  previous?: SnapshotEvent[];
};

export type OAuthAuth = {
  type: 'oauth2';
  envVars: string[];
  authorizeUrl(redirectUri: string, state: string): string;
  exchange(code: string, redirectUri: string): Promise<Credentials>;
  refresh?(refreshToken: string, extra: Record<string, string>): Promise<Credentials>;
};

export type ApiKeyAuth = {
  type: 'apikey';
  /** server-side env vars this provider needs even though the customer pastes a key (e.g. a developer key) */
  envVars?: string[];
  fields: ProviderField[];
  /** validates the pasted credentials against the vendor and returns what to store */
  validate(values: Record<string, string>): Promise<Credentials>;
};

export interface ProviderAdapter {
  key: string;
  name: string;
  auth: OAuthAuth | ApiKeyAuth;
  /**
   * 'unverified' = written WITHOUT access to the vendor documentation or an account; off unless
   * ENABLE_UNVERIFIED_PROVIDERS=true. Every assumption is marked `UNVERIFIED:` in its source.
   * 'beta' = implemented from public documentation summaries and unit-tested against simulated
   * responses; NOT yet verified with real vendor credentials.
   */
  maturity: 'beta' | 'unverified' | 'verified';
  /** true only when book() creates the appointment in the vendor system */
  bookingSupported: boolean;
  /** timed, non-cancelled appointments in [from, to] */
  listAppointments(ctx: Ctx, from: Date, to: Date): Promise<CalEvent[]>;
  /** IANA zone for vendors that return local times; falls back to the integration's configured timezone */
  needsTimezone?: boolean;
  listClients?(ctx: Ctx): Promise<ParsedClient[]>;
  book?(ctx: Ctx, slot: { start: Date; end: Date; service?: string }, client: { name: string; email?: string; phone?: string }): Promise<string>;
}
