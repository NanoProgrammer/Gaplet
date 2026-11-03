import { CalEvent } from '../calendar-diff';
import { listOf, requestJson } from './http';
import { parseLocal, validZone } from './time';
import { ProviderAdapter } from './types';

/*
 * UNVERIFIED (Pabau's Postman docs read by the owner; never run against a real clinic). Checklist:
 *  1. Date filters start_date/end_date are inclusive and day-granular, so we widen by one day and filter locally.
 *  2. GET /appointments excludes cancelled appointments (as /appointments/all exists to include them).
 *     If it does NOT exclude them, cancellations are still detected through appointment_status below.
 *  3. appointment_status values meaning cancelled are not documented; we skip /cancel|no.?show|deleted/.
 *  4. Times are clinic-local (we require the time zone setting).
 *  5. Rate limit 110 req/min: a poll uses ceil(total/100) requests.
 */
const base = (key: string) => `https://api.oauth.pabau.com/${encodeURIComponent(key)}`; // the key travels in the PATH
const day = (d: Date, shiftDays = 0) => new Date(d.getTime() + shiftDays * 86_400_000).toISOString().slice(0, 10);
const PAGE = 100;

function check(j: any) {
  if (j?.status === false) throw new Error('Pabau reported an error (status=false)');
  return listOf(j, 'appointments', 'Pabau');
}

export const pabau: ProviderAdapter = {
  key: 'pabau',
  name: 'Pabau',
  maturity: 'unverified',
  bookingSupported: false,
  needsTimezone: true,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiKey', label: 'Pabau API key', secret: true, placeholder: 'From your Pabau account' }],
    async validate(values) {
      const key = (values.apiKey ?? '').trim();
      if (!key || /[\s/]/.test(key)) throw new Error('That does not look like a Pabau API key.');
      check(await requestJson(`${base(key)}/appointments?per_page=1&page=1`, {}, 'Pabau'));
      return { accessToken: key };
    },
  },
  async listAppointments(ctx, from, to) {
    if (!validZone(ctx.timezone)) throw new Error('Set your clinic time zone in Business settings first (Pabau returns local times).');
    const out: CalEvent[] = [];
    let seen = 0;
    for (let page = 1; page <= 20; page++) {
      const qs = new URLSearchParams({ start_date: day(from, -1), end_date: day(to, 1), per_page: String(PAGE), page: String(page), order: 'ASC' });
      const j: any = await requestJson(`${base(ctx.accessToken)}/appointments?${qs}`, {}, 'Pabau');
      const rows = check(j);
      seen += rows.length;
      for (const a of rows) {
        const d = a.dates ?? {};
        if (!a.details?.appointment_id || !d.start_date || !d.start_time) continue;
        if (/cancel|no.?show|deleted/i.test(String(a.details.appointment_status ?? ''))) continue;
        const start = parseLocal(`${d.start_date} ${d.start_time}`, ctx.timezone);
        if (start < from || start > to) continue;
        const end = d.end_date && d.end_time ? parseLocal(`${d.end_date} ${d.end_time}`, ctx.timezone) : new Date(start.getTime() + (Number(d.duration) || 60) * 60_000);
        out.push({
          id: String(a.details.appointment_id), start, end,
          summary: a.service?.[0]?.service,
          email: typeof a.client?.[0]?.Email === 'string' ? a.client[0].Email.toLowerCase() || undefined : undefined,
        });
      }
      if (rows.length < PAGE || (typeof j.total === 'number' && seen >= j.total)) break;
    }
    return out;
  },
};
