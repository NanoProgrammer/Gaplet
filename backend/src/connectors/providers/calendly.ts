import { CalEvent } from '../calendar-diff';
import { bearer, env, form, listOf, requestJson } from './http';
import { Credentials, ProviderAdapter } from './types';

const API = 'https://api.calendly.com';
const AUTH = 'https://auth.calendly.com/oauth';

const toCreds = (j: any, prevRefresh?: string): Credentials => {
  if (!j.access_token) throw new Error('Calendly did not return an access token');
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? prevRefresh ?? null, expiresAt: new Date(Date.now() + (j.expires_in ?? 7200) * 1000) };
};
const tokenCall = (params: Record<string, string>) =>
  requestJson(`${AUTH}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: env('CALENDLY_CLIENT_ID'), client_secret: env('CALENDLY_CLIENT_SECRET'), ...params }) }, 'Calendly');

const lastSegment = (uri: string) => uri.split('/').pop() as string;

export const calendly: ProviderAdapter = {
  key: 'calendly',
  name: 'Calendly',
  maturity: 'beta',
  // Calendly's scheduling endpoint was not confirmed in the research, so we never write bookings.
  bookingSupported: false,
  auth: {
    type: 'oauth2',
    envVars: ['CALENDLY_CLIENT_ID', 'CALENDLY_CLIENT_SECRET'],
    authorizeUrl: (redirect, state) => `${AUTH}/authorize?${new URLSearchParams({ client_id: env('CALENDLY_CLIENT_ID'), response_type: 'code', redirect_uri: redirect, state })}`,
    exchange: async (code, redirect) => {
      const creds = toCreds(await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirect }));
      const me: any = await requestJson(`${API}/users/me`, { headers: bearer(creds.accessToken) }, 'Calendly');
      creds.extra = { userUri: me.resource?.uri ?? '' };
      return creds;
    },
    refresh: async (rt) => toCreds(await tokenCall({ grant_type: 'refresh_token', refresh_token: rt }), rt),
  },
  async listAppointments(ctx, from, to) {
    const userUri = ctx.extra.userUri;
    if (!userUri) throw new Error('Calendly user is unknown. Please reconnect.');
    const known = new Map((ctx.previous ?? []).map((p) => [p.id, p.email]));
    const out: CalEvent[] = [];
    let url: string | undefined = `${API}/scheduled_events?${new URLSearchParams({ user: userUri, status: 'active', min_start_time: from.toISOString(), max_start_time: to.toISOString(), count: '100' })}`;
    for (let page = 0; url && page < 20; page++) {
      const j: any = await requestJson(url, { headers: bearer(ctx.accessToken) }, 'Calendly');
      for (const e of listOf(j, 'collection', 'Calendly')) {
        const id = lastSegment(e.uri);
        let email = known.get(id);
        if (email === undefined) {
          // Only events we have not seen before need the extra call (keeps polling cheap).
          const inv: any = await requestJson(`${API}/scheduled_events/${id}/invitees?count=1`, { headers: bearer(ctx.accessToken) }, 'Calendly').catch(() => ({}));
          email = inv.collection?.[0]?.email?.toLowerCase();
        }
        out.push({ id, start: new Date(e.start_time), end: new Date(e.end_time), summary: e.name, email });
      }
      url = j.pagination?.next_page;
    }
    return out;
  },
};
