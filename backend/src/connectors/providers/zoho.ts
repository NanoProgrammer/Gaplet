import { CalEvent } from '../calendar-diff';
import { env, form, listOf, requestJson } from './http';
import { formatZoho, parseZoho } from './time';
import { Credentials, ProviderAdapter } from './types';

/*
 * UNVERIFIED (written without access to Zoho's documentation or an account). Checklist:
 *  1. Authorize/token URLs and scope names (data centre: ZOHO_ACCOUNTS_URL, e.g. https://accounts.zoho.eu).
 *  2. `api_domain` in the token response and the base path `/bookings/v1/json`.
 *  3. Header `Authorization: Zoho-oauthtoken <token>`.
 *  4. POST /fetchappointment: form fields (from_time, to_time, status, page, per_page), date format
 *     "dd-MMM-yyyy HH:mm:ss", and the nested response shape read below.
 *  5. Which `status` values mean "still booked".
 *  6. Times are in the Zoho workspace time zone (we require the timezone setting).
 */
const accounts = () => env('ZOHO_ACCOUNTS_URL', 'https://accounts.zoho.com').replace(/\/$/, '');
const SCOPE = 'zohobookings.data.READ,zohobookings.data.CREATE,zohobookings.data.UPDATE';

const toCreds = (j: any, prevRefresh?: string, prevDomain?: string): Credentials => {
  if (!j.access_token) throw new Error('Zoho did not return an access token');
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? prevRefresh ?? null,
    expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000),
    extra: { apiDomain: j.api_domain ?? prevDomain ?? 'https://www.zohoapis.com' },
  };
};
const tokenCall = (params: Record<string, string>) =>
  requestJson(`${accounts()}/oauth/v2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: env('ZOHO_CLIENT_ID'), client_secret: env('ZOHO_CLIENT_SECRET'), ...params }) }, 'Zoho');

export const zoho: ProviderAdapter = {
  key: 'zoho',
  name: 'Zoho Bookings',
  maturity: 'unverified',
  bookingSupported: false,
  needsTimezone: true,
  auth: {
    type: 'oauth2',
    envVars: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET'],
    authorizeUrl: (redirect, state) => `${accounts()}/oauth/v2/auth?${new URLSearchParams({ scope: SCOPE, client_id: env('ZOHO_CLIENT_ID'), response_type: 'code', access_type: 'offline', prompt: 'consent', redirect_uri: redirect, state })}`,
    exchange: async (code, redirect) => toCreds(await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirect })),
    refresh: async (rt, extra) => toCreds(await tokenCall({ grant_type: 'refresh_token', refresh_token: rt }), rt, extra.apiDomain),
  },
  async listAppointments(ctx, from, to) {
    if (!ctx.timezone) throw new Error('Set your Zoho workspace time zone in Business settings first.');
    const api = `${ctx.extra.apiDomain ?? 'https://www.zohoapis.com'}/bookings/v1/json`;
    const out: CalEvent[] = [];
    for (let page = 1; page <= 20; page++) {
      const j: any = await requestJson(`${api}/fetchappointment`, {
        method: 'POST',
        headers: { Authorization: `Zoho-oauthtoken ${ctx.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ from_time: formatZoho(from, ctx.timezone), to_time: formatZoho(to, ctx.timezone), page: String(page), per_page: '100' }),
      }, 'Zoho Bookings');
      const rv = j.response?.returnvalue;
      const rows = listOf(rv, 'response', 'Zoho Bookings');
      for (const a of rows) {
        if (!a.start_time || /cancel|no[-_ ]?show/i.test(String(a.status ?? ''))) continue;
        const start = parseZoho(String(a.start_time), ctx.timezone);
        const minutes = Number(a.duration) > 0 ? Number(a.duration) : 60; // UNVERIFIED: duration unit/field
        out.push({ id: String(a.booking_id), start, end: new Date(start.getTime() + minutes * 60_000), summary: a.service_name, email: a.customer_email?.toLowerCase() });
      }
      if (!rv?.next_page_available) break;
    }
    return out;
  },
};
