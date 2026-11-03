/** JSON request with timeout and readable errors (never includes tokens). */
export async function requestJson<T = any>(url: string, init: RequestInit = {}, label = 'Provider'): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const detail = data?.error?.message ?? data?.message ?? data?.error_description ?? (typeof data?.error === 'string' ? data.error : '') ?? '';
    throw new Error(`${label} error ${res.status}${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
  }
  return data as T;
}

/**
 * Returns j[key] only if it is really an array. An unexpected 200 body must be an ERROR: treating it as
 * "no appointments" would make every upcoming appointment look cancelled.
 */
export function listOf(j: any, key: string, label: string): any[] {
  const v = key ? j?.[key] : j;
  if (!Array.isArray(v)) throw new Error(`${label} returned an unexpected response (missing "${key || 'list'}"). Not syncing.`);
  return v;
}

export const form = (o: Record<string, string>) => new URLSearchParams(o);
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
export const env = (name: string, fallback = '') => process.env[name] || fallback;
