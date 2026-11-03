import { CalEvent } from '../calendar-diff';
import { env, listOf, requestJson } from './http';
import { parseLocal } from './time';
import { ProviderAdapter } from './types';

/*
 * UNVERIFIED (written without access to Open Dental's documentation or an office). Checklist:
 *  1. Authorization header format `ODFHIR {developerKey}/{customerKey}`.
 *  2. GET /appointments query names (dateStart, dateEnd) and the response field names
 *     (AptNum, AptDateTime, AptStatus, Pattern, PatNum).
 *  3. That AptStatus "Scheduled" is the only "still booked" status.
 *  4. GET /patients/{PatNum} returns `Email`.
 *  5. Pattern: each character = 5 minutes.
 *  6. AptDateTime is in the OFFICE's local time (we require the timezone setting).
 */
const BASE = 'https://api.opendental.com/api/v1';
const auth = (customerKey: string) => ({ Authorization: `ODFHIR ${env('OPEN_DENTAL_DEVELOPER_KEY')}/${customerKey}`, Accept: 'application/json' });
const day = (d: Date) => d.toISOString().slice(0, 10);

export const opendental: ProviderAdapter = {
  key: 'opendental',
  name: 'Open Dental',
  maturity: 'unverified',
  bookingSupported: false,
  needsTimezone: true,
  auth: {
    type: 'apikey',
    envVars: ['OPEN_DENTAL_DEVELOPER_KEY'],
    fields: [{ name: 'customerKey', label: 'Open Dental customer key', secret: true, placeholder: 'Provided by your office in Open Dental' }],
    async validate(values) {
      const key = (values.customerKey ?? '').trim();
      if (!key) throw new Error('Enter your Open Dental customer key.');
      const today = day(new Date());
      listOf(await requestJson(`${BASE}/appointments?${new URLSearchParams({ dateStart: today, dateEnd: today })}`, { headers: auth(key) }, 'Open Dental'), '', 'Open Dental');
      return { accessToken: key };
    },
  },
  async listAppointments(ctx, from, to) {
    if (!ctx.timezone) throw new Error('Set your office time zone in Business settings first (Open Dental returns local times).');
    const rows = listOf(await requestJson(`${BASE}/appointments?${new URLSearchParams({ dateStart: day(from), dateEnd: day(to) })}`, { headers: auth(ctx.accessToken) }, 'Open Dental'), '', 'Open Dental');
    const known = new Map((ctx.previous ?? []).map((p) => [p.id, p.email]));
    const out: CalEvent[] = [];
    for (const a of rows) {
      if (a.AptStatus !== 'Scheduled' || !a.AptDateTime) continue;
      const start = parseLocal(a.AptDateTime, ctx.timezone);
      if (start < from || start > to) continue;
      const minutes = Math.max(String(a.Pattern ?? '').length * 5, 5);
      const id = String(a.AptNum);
      let email = known.get(id);
      if (email === undefined && a.PatNum) {
        const p: any = await requestJson(`${BASE}/patients/${a.PatNum}`, { headers: auth(ctx.accessToken) }, 'Open Dental').catch(() => ({}));
        email = typeof p.Email === 'string' ? p.Email.toLowerCase() || undefined : undefined;
      }
      out.push({ id, start, end: new Date(start.getTime() + minutes * 60_000), summary: a.ProcDescript || undefined, email });
    }
    return out;
  },
};
