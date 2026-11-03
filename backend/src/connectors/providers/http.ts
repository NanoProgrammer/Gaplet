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

export const form = (o: Record<string, string>) => new URLSearchParams(o);
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
export const env = (name: string, fallback = '') => process.env[name] || fallback;
