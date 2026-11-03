import { CalEvent } from '../calendar-diff';
import { ParsedClient, normalizePhone } from '../csv';
import { requestJson } from './http';
import { ProviderAdapter } from './types';

const UA = 'Gaplets (support@gaplets.com)';
const base = (shard: string) => `https://api.${shard}.cliniko.com/v1`;
// Cliniko API keys end with the shard, e.g. "...-au2".
export const shardOf = (key: string) => (key.trim().split('-').pop() || '').toLowerCase();
const headers = (key: string) => ({ Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, Accept: 'application/json', 'User-Agent': UA });
const idFromUrl = (u?: string) => (u ? u.split('/').pop() : undefined);

async function allPages(url: string, key: string, listKey: string, maxPages: number) {
  const items: any[] = [];
  let next: string | undefined = url;
  for (let p = 0; next && p < maxPages; p++) {
    const j: any = await requestJson(next, { headers: headers(key) }, 'Cliniko');
    items.push(...(j[listKey] ?? []));
    next = j.links?.next;
  }
  return items;
}

export const cliniko: ProviderAdapter = {
  key: 'cliniko',
  name: 'Cliniko',
  maturity: 'beta',
  // Creating an appointment needs practitioner, type and business ids we do not map yet.
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiKey', label: 'Cliniko API key', secret: true, placeholder: 'Settings → My info → Manage API keys' }],
    async validate(values) {
      const key = (values.apiKey ?? '').trim();
      const shard = shardOf(key);
      if (!key || !/^[a-z]{2}\d+$/.test(shard)) throw new Error('That does not look like a Cliniko API key (it should end with a region such as -au2 or -uk1).');
      await requestJson(`${base(shard)}/user`, { headers: headers(key) }, 'Cliniko');
      return { accessToken: key, extra: { shard } };
    },
  },
  async listAppointments(ctx, from, to) {
    const { shard } = ctx.extra;
    const qs = new URLSearchParams({ per_page: '100' });
    qs.append('q[]', `starts_at:>=${from.toISOString()}`);
    qs.append('q[]', `starts_at:<=${to.toISOString()}`);
    const rows = await allPages(`${base(shard)}/individual_appointments?${qs}`, ctx.accessToken, 'individual_appointments', 20);
    const known = new Map((ctx.previous ?? []).map((p) => [p.id, p.email]));
    const out: CalEvent[] = [];
    for (const a of rows) {
      if (a.cancelled_at || !a.starts_at || !a.ends_at) continue;
      const id = String(a.id);
      let email = known.get(id);
      if (email === undefined) {
        const pid = idFromUrl(a.patient?.links?.self);
        const p: any = pid ? await requestJson(`${base(shard)}/patients/${pid}`, { headers: headers(ctx.accessToken) }, 'Cliniko').catch(() => ({})) : {};
        email = p.email?.toLowerCase();
      }
      out.push({ id, start: new Date(a.starts_at), end: new Date(a.ends_at), summary: a.appointment_type?.name, email });
    }
    return out;
  },
  async listClients(ctx) {
    const rows = await allPages(`${base(ctx.extra.shard)}/patients?per_page=100`, ctx.accessToken, 'patients', 50);
    const out: ParsedClient[] = [];
    for (const p of rows) {
      const email = typeof p.email === 'string' && /^[^\s@]+@[^\s@]+$/.test(p.email) ? p.email.toLowerCase() : undefined;
      const phone = normalizePhone(p.patient_phone_numbers?.[0]?.number);
      if (!email && !phone) continue;
      out.push({ name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Client', email, phone, services: [] });
    }
    return out;
  },
};
