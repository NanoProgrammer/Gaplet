import { CalEvent } from '../calendar-diff';
import { bearer, env, form, listOf, requestJson } from './http';
import { Credentials, ProviderAdapter } from './types';

// Clio has regional hosts (e.g. https://eu.app.clio.com); default is the US host.
const base = () => env('CLIO_BASE_URL', 'https://app.clio.com').replace(/\/$/, '');

const toCreds = (j: any, prevRefresh?: string): Credentials => {
  if (!j.access_token) throw new Error('Clio did not return an access token');
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? prevRefresh ?? null, expiresAt: new Date(Date.now() + (j.expires_in ?? 604800) * 1000) };
};
const tokenCall = (params: Record<string, string>) =>
  requestJson(`${base()}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: env('CLIO_CLIENT_ID'), client_secret: env('CLIO_CLIENT_SECRET'), ...params }) }, 'Clio');

export const clio: ProviderAdapter = {
  key: 'clio',
  name: 'Clio',
  maturity: 'beta',
  bookingSupported: false,
  auth: {
    type: 'oauth2',
    envVars: ['CLIO_CLIENT_ID', 'CLIO_CLIENT_SECRET'],
    authorizeUrl: (redirect, state) => `${base()}/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: env('CLIO_CLIENT_ID'), redirect_uri: redirect, state })}`,
    exchange: async (code, redirect) => toCreds(await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirect })),
    refresh: async (rt) => toCreds(await tokenCall({ grant_type: 'refresh_token', refresh_token: rt }), rt),
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    let url: string | undefined = `${base()}/api/v4/calendar_entries.json?${new URLSearchParams({
      from: from.toISOString(), to: to.toISOString(), limit: '200', fields: 'id,summary,start_at,end_at,all_day,attendees{email}',
    })}`;
    for (let page = 0; url && page < 20; page++) {
      const j: any = await requestJson(url, { headers: bearer(ctx.accessToken) }, 'Clio');
      for (const e of listOf(j, 'data', 'Clio')) {
        if (e.all_day || !e.start_at || !e.end_at) continue;
        out.push({ id: String(e.id), start: new Date(e.start_at), end: new Date(e.end_at), summary: e.summary, email: e.attendees?.find((a: any) => a?.email)?.email?.toLowerCase() });
      }
      url = j.meta?.paging?.next;
    }
    return out;
  },
};
