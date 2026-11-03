import { CalEvent } from '../calendar-diff';
import { listOf, requestJson } from './http';
import { parseMaybeLocal, validZone } from './time';
import { ProviderAdapter } from './types';

/*
 * UNVERIFIED (Workiz Swagger read by the owner; never run against a real account). Checklist:
 *  1. FUTURE JOBS: `start_date` is documented as "from that date up to TODAY". It is NOT known whether jobs
 *     scheduled in the future are returned at all. If they are not, this provider sees nothing and stays silent.
 *     Test: create a job for next week and check it appears in GET /job/all/.
 *  2. `data` for /job/all/ is expected to be an array (Swagger says a single Job); anything else is an error.
 *  3. We use only_open=false so Canceled jobs are visible; Done jobs are KEPT (marking a future job Done must not
 *     look like a cancellation). Only Status "Canceled"/"Cancelled" removes a job from the list.
 *  4. JobDateTime has no offset: it is read in the job's own Timezone (e.g. "US/Pacific"), else the time zone setting.
 */
const base = (token: string) => `https://api.workiz.com/api/v1/${encodeURIComponent(token)}`; // the token travels in the PATH
const PAGE = 100;

function check(j: any) {
  if (j?.flag !== true) throw new Error(`Workiz reported failure${j?.msg ? `: ${String(j.msg).slice(0, 200)}` : ''}`);
  return listOf(j, 'data', 'Workiz');
}

export const workiz: ProviderAdapter = {
  key: 'workiz',
  name: 'Workiz',
  maturity: 'unverified',
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiToken', label: 'Workiz API token', secret: true, placeholder: 'Workiz Marketplace → Developer' }],
    async validate(values) {
      const token = (values.apiToken ?? '').trim();
      if (!token || /[\s/]/.test(token)) throw new Error('That does not look like a Workiz API token.');
      check(await requestJson(`${base(token)}/job/all/?records=1&only_open=true`, {}, 'Workiz'));
      return { accessToken: token };
    },
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    const startDate = new Date().toISOString().slice(0, 10);
    for (let offset = 0, page = 0; page < 10; page++, offset += PAGE) {
      const qs = new URLSearchParams({ start_date: startDate, offset: String(offset), records: String(PAGE), only_open: 'false' });
      const rows = check(await requestJson(`${base(ctx.accessToken)}/job/all/?${qs}`, {}, 'Workiz'));
      for (const job of rows) {
        if (!job.UUID || !job.JobDateTime) continue;
        if (/^cancel/i.test(String(job.Status ?? ''))) continue;
        const tz = validZone(job.Timezone) ? job.Timezone : ctx.timezone;
        const start = parseMaybeLocal(String(job.JobDateTime), tz);
        if (start < from || start > to) continue;
        const end = job.JobEndDateTime ? parseMaybeLocal(String(job.JobEndDateTime), tz) : new Date(start.getTime() + 60 * 60_000);
        out.push({ id: String(job.UUID), start, end, summary: job.JobType || undefined, email: typeof job.Email === 'string' && job.Email ? job.Email.toLowerCase() : undefined });
      }
      if (rows.length < PAGE) break;
    }
    return out;
  },
};
