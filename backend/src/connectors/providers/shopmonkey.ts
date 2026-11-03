import { CalEvent } from '../calendar-diff';
import { bearer, listOf, requestJson } from './http';
import { parseMaybeLocal } from './time';
import { ProviderAdapter } from './types';

/*
 * UNVERIFIED (shopmonkey.dev read by the owner; never run against a real shop). Checklist:
 *  1. A cancelled appointment is either deleted or carries `cancellationNote`; no explicit status exists.
 *     We treat both as cancelled. `confirmationStatus: Declined` is NOT treated as a cancellation.
 *  2. startDate/endDate format (ISO with zone?). A value without a zone needs the time zone setting.
 *  3. Shape of customer.emails (array of strings or of {email}); both handled.
 *  4. Recurring appointments: stable id = recurringExceptionId, else `${id}@${startDate}`.
 *  5. POST /appointment/search `where.startDate.{gte,lte}` semantics and that skip/limit paginate.
 */
const BASE = 'https://api.shopmonkey.cloud/v3';
const H = (t: string) => ({ ...bearer(t), 'Content-Type': 'application/json', Accept: 'application/json' });
const PAGE = 100;

/** Shopmonkey says to ALWAYS check `success`: false is an error even on HTTP 200. */
function check(j: any) {
  if (j?.success !== true) throw new Error(`Shopmonkey reported failure${j?.message ? `: ${String(j.message).slice(0, 200)}` : ''}`);
  return listOf(j, 'data', 'Shopmonkey');
}

const emailOf = (c: any): string | undefined => {
  const first = Array.isArray(c?.emails) ? c.emails[0] : undefined;
  const v = typeof first === 'string' ? first : first?.email;
  return typeof v === 'string' && v ? v.toLowerCase() : undefined;
};

export const shopmonkey: ProviderAdapter = {
  key: 'shopmonkey',
  name: 'Shopmonkey',
  maturity: 'unverified',
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiKey', label: 'Shopmonkey API key', secret: true, placeholder: 'Settings → Integration → API Keys' }],
    async validate(values) {
      const key = (values.apiKey ?? '').trim();
      if (!key) throw new Error('Enter your Shopmonkey API key.');
      check(await requestJson(`${BASE}/appointment?limit=1`, { headers: H(key) }, 'Shopmonkey'));
      return { accessToken: key };
    },
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    for (let skip = 0, page = 0; page < 20; page++, skip += PAGE) {
      const j: any = await requestJson(`${BASE}/appointment/search`, {
        method: 'POST',
        headers: H(ctx.accessToken),
        body: JSON.stringify({ limit: PAGE, skip, orderBy: { startDate: 'asc' }, where: { startDate: { gte: from.toISOString(), lte: to.toISOString() } } }),
      }, 'Shopmonkey');
      const rows = check(j);
      for (const a of rows) {
        if (a.allDay || !a.startDate || !a.endDate || !a.id) continue;
        if (typeof a.cancellationNote === 'string' && a.cancellationNote.trim()) continue;
        const start = parseMaybeLocal(String(a.startDate), ctx.timezone);
        if (start < from || start > to) continue;
        const id = a.recurringExceptionId ? String(a.recurringExceptionId) : a.recurring ? `${a.id}@${a.startDate}` : String(a.id);
        out.push({ id, start, end: parseMaybeLocal(String(a.endDate), ctx.timezone), summary: a.name || undefined, email: emailOf(a.customer) });
      }
      if (rows.length < PAGE) break;
    }
    return out;
  },
};
