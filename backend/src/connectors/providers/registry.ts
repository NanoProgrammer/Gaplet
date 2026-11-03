import { calcom } from './calcom';
import { calendly } from './calendly';
import { cliniko } from './cliniko';
import { clio } from './clio';
import { microsoft } from './microsoft';
import { jobber } from './jobber';
import { opendental } from './opendental';
import { zoho } from './zoho';
import { ProviderAdapter } from './types';

export const ADAPTERS: Record<string, ProviderAdapter> = { microsoft, calendly, cliniko, clio, calcom, jobber, opendental, zoho };
export const getAdapter = (key: string): ProviderAdapter | undefined => ADAPTERS[key];

/** A provider is offered only if the server has its credentials and, when unverified, the explicit opt-in. */
export const isConfigured = (a: ProviderAdapter) =>
  (a.maturity !== 'unverified' || process.env.ENABLE_UNVERIFIED_PROVIDERS === 'true') &&
  (a.auth.envVars ?? []).every((v) => !!process.env[v]);
