import { promises as dns } from 'dns';
import * as net from 'net';

/** True for loopback, private, link-local, CGNAT, multicast and metadata ranges. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') ||
      v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff');
  }
  return true;
}

/** Throws unless `raw` is an https URL that resolves only to public addresses. */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const normalized = raw.trim().replace(/^webcal:\/\//i, 'https://');
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'https:') throw new Error('Only https:// URLs are allowed');
  if (url.username || url.password) throw new Error('URLs with credentials are not allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true }).catch(() => {
        throw new Error('Host could not be resolved');
      });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('URL points to a private or unsupported address');
  }
  return url;
}

/** GET with timeout, manual redirects (each hop re-validated) and size cap. */
export async function safeFetchText(
  raw: string,
  opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {},
): Promise<string> {
  const { maxBytes = 5 * 1024 * 1024, timeoutMs = 10_000, maxRedirects = 3 } = opts;
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicHttpsUrl(current);
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Remote server responded ${res.status}`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > maxBytes) throw new Error('Response too large');
    const text = await res.text();
    if (Buffer.byteLength(text) > maxBytes) throw new Error('Response too large');
    return text;
  }
  throw new Error('Too many redirects');
}
