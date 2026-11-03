import { CalEvent } from '../calendar-diff';
import { bearer, listOf, requestJson } from './http';
import { ProviderAdapter } from './types';

const API = 'https://api.cal.com/v2';
const H = (key: string) => ({ ...bearer(key), 'cal-api-version': '2024-08-13' });

export const calcom: ProviderAdapter = {
  key: 'calcom',
  name: 'Cal.com',
  maturity: 'beta',
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [{ name: 'apiKey', label: 'Cal.com API key', secret: true, placeholder: 'cal_live_…' }],
    async validate(values) {
      const key = (values.apiKey ?? '').trim();
      if (!key) throw new Error('Enter your Cal.com API key.');
      await requestJson(`${API}/bookings?take=1`, { headers: H(key) }, 'Cal.com');
      return { accessToken: key };
    },
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    for (let skip = 0, page = 0; page < 20; page++) {
      const qs = new URLSearchParams({ status: 'upcoming', afterStart: from.toISOString(), beforeEnd: to.toISOString(), take: '100', skip: String(skip) });
      const j: any = await requestJson(`${API}/bookings?${qs}`, { headers: H(ctx.accessToken) }, 'Cal.com');
      const rows: any[] = listOf(j, 'data', 'Cal.com');
      for (const b of rows) {
        if (b.status && b.status !== 'accepted') continue;
        out.push({ id: String(b.uid ?? b.id), start: new Date(b.start), end: new Date(b.end), summary: b.title, email: b.attendees?.[0]?.email?.toLowerCase() });
      }
      if (rows.length < 100) break;
      skip += 100;
    }
    return out;
  },
};
