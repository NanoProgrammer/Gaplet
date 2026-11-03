/** Providers handled by the generic engine (polling + imported/synced client list). */
export const ADAPTER_KEYS = ['microsoft', 'calendly', 'cliniko', 'clio', 'calcom', 'jobber', 'opendental', 'zoho', 'wodify', 'pushpress', 'pabau', 'shopmonkey', 'workiz'] as const;
export type AdapterKey = (typeof ADAPTER_KEYS)[number];

export const GENERIC_PROVIDERS = ['google', 'ics', 'webhook', ...ADAPTER_KEYS] as const;
export type GenericProvider = (typeof GENERIC_PROVIDERS)[number];

export const isGenericProvider = (p: string): p is GenericProvider => (GENERIC_PROVIDERS as readonly string[]).includes(p);
export const isAdapterKey = (p: string): p is AdapterKey => (ADAPTER_KEYS as readonly string[]).includes(p);
