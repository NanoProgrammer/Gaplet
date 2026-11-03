import { calcom } from './calcom';
import { calendly } from './calendly';
import { cliniko } from './cliniko';
import { clio } from './clio';
import { microsoft } from './microsoft';
import { ProviderAdapter } from './types';

export const ADAPTERS: Record<string, ProviderAdapter> = { microsoft, calendly, cliniko, clio, calcom };
export const getAdapter = (key: string): ProviderAdapter | undefined => ADAPTERS[key];

/** OAuth providers are only offered when the server has their app credentials. */
export const isConfigured = (a: ProviderAdapter) => a.auth.type === 'apikey' || a.auth.envVars.every((v) => !!process.env[v]);
