import { CalEvent } from '../calendar-diff';
import { listOf, requestJson } from './http';
import { isoNoMs, parseUtcLoose } from './time';
import { ProviderAdapter } from './types';

/*
 * UNVERIFIED (docs.wodify.com read by the owner; never run against a real gym). Checklist:
 *  1. Filtering by `utc_appointment_start_datetime` in the `q` syntax: the docs do not confirm that field is filterable.
 *  2. Which `booking_status` values mean cancelled (we also use cancelled.cancelled_on_datetime).
 *  3. The bookings payload carries no client e-mail, so the person who cancelled CANNOT be excluded from the invitations.
 *  4. Date strings are documented as UTC; a missing "Z" is tolerated.
 */
const BASE = 'https://api.wodify.com/v1';
const H = (key: string) => ({ 'x-api-key': key, Accept: 'application/json' });
const PAGE = 100;

function check(j: any) {
  if (j?.wodify_validation_result) throw new Error(`Wodify rejected the request: ${JSON.stringify(j.wodify_validation_result).slice(0, 200)}`);
  return listOf(j, 'client_appointment_bookings', 'Wodify');
}

export const wodify: ProviderAdapter = {
  key: 'wodify',
  name: 'Wodify',
  maturity: 'unverified',
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiKey', label: 'Wodify API key', secret: true, placeholder: 'Wodify Core → Automations → Integrations' }],
    async validate(values) {
      const key = (values.apiKey ?? '').trim();
      if (!key) throw new Error('Enter your Wodify API key.');
      check(await requestJson(`${BASE}/appointments/bookings/clients?page=1&page_size=1`, { headers: H(key) }, 'Wodify'));
      return { accessToken: key };
    },
  },
  async listAppointments(ctx, from, to) {
    const q = `utc_appointment_start_datetime|gte|${isoNoMs(from)};utc_appointment_start_datetime|lte|${isoNoMs(to)}`;
    const out: CalEvent[] = [];
    for (let page = 1; page <= 20; page++) {
      const j: any = await requestJson(`${BASE}/appointments/bookings/clients/search?${new URLSearchParams({ q, page: String(page), page_size: String(PAGE) })}`, { headers: H(ctx.accessToken) }, 'Wodify');
      for (const b of check(j)) {
        if (b.cancelled?.cancelled_on_datetime || /cancel/i.test(String(b.booking_status ?? ''))) continue;
        if (!b.utc_appointment_start_datetime || !b.utc_appointment_end_datetime || b.booking_id == null) continue;
        const start = parseUtcLoose(String(b.utc_appointment_start_datetime));
        if (start < from || start > to) continue;
        out.push({ id: String(b.booking_id), start, end: parseUtcLoose(String(b.utc_appointment_end_datetime)), summary: typeof b.service === 'string' ? b.service : undefined });
      }
      if (!j.pagination?.has_more) break;
    }
    return out;
  },
};
