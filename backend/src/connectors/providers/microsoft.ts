import { CalEvent } from '../calendar-diff';
import { bearer, env, form, requestJson } from './http';
import { Credentials, ProviderAdapter } from './types';

const tenant = () => env('MICROSOFT_TENANT', 'common');
const authBase = () => `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
const SCOPE = 'offline_access Calendars.ReadWrite User.Read';
const GRAPH = 'https://graph.microsoft.com/v1.0';

const toCreds = (j: any, prevRefresh?: string): Credentials => {
  if (!j.access_token) throw new Error('Microsoft did not return an access token');
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? prevRefresh ?? null, expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000) };
};
const tokenCall = (params: Record<string, string>) =>
  requestJson(`${authBase()}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: env('MICROSOFT_CLIENT_ID'), client_secret: env('MICROSOFT_CLIENT_SECRET'), scope: SCOPE, ...params }) }, 'Microsoft');

// Graph returns UTC dateTime strings without a zone suffix when asked for UTC.
const utc = (dt: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(dt) ? dt : `${dt}Z`);

export const microsoft: ProviderAdapter = {
  key: 'microsoft',
  name: 'Microsoft Outlook Calendar',
  maturity: 'beta',
  bookingSupported: true,
  auth: {
    type: 'oauth2',
    envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    authorizeUrl: (redirect, state) =>
      `${authBase()}/authorize?${new URLSearchParams({ client_id: env('MICROSOFT_CLIENT_ID'), response_type: 'code', redirect_uri: redirect, response_mode: 'query', scope: SCOPE, state, prompt: 'select_account' })}`,
    exchange: async (code, redirect) => toCreds(await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirect })),
    refresh: async (rt) => toCreds(await tokenCall({ grant_type: 'refresh_token', refresh_token: rt }), rt),
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    let url: string | undefined = `${GRAPH}/me/calendarView?${new URLSearchParams({
      startDateTime: from.toISOString(), endDateTime: to.toISOString(), $top: '100',
      $select: 'id,subject,start,end,isCancelled,isAllDay,attendees',
    })}`;
    for (let page = 0; url && page < 20; page++) {
      const j: any = await requestJson(url, { headers: { ...bearer(ctx.accessToken), Prefer: 'outlook.timezone="UTC"' } }, 'Microsoft Graph');
      for (const e of j.value ?? []) {
        if (e.isCancelled || e.isAllDay || !e.start?.dateTime || !e.end?.dateTime) continue;
        const guest = (e.attendees ?? []).find((a: any) => a?.emailAddress?.address);
        out.push({ id: String(e.id), start: utc(e.start.dateTime), end: utc(e.end.dateTime), summary: e.subject, email: guest?.emailAddress?.address?.toLowerCase() });
      }
      url = j['@odata.nextLink'];
    }
    return out;
  },
  async book(ctx, slot, client) {
    const j: any = await requestJson(`${GRAPH}/me/events`, {
      method: 'POST',
      headers: { ...bearer(ctx.accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `${client.name || 'Client'} (booked via Gaplet)`,
        start: { dateTime: slot.start.toISOString().replace('Z', ''), timeZone: 'UTC' },
        end: { dateTime: slot.end.toISOString().replace('Z', ''), timeZone: 'UTC' },
        attendees: client.email ? [{ emailAddress: { address: client.email, name: client.name }, type: 'required' }] : [],
      }),
    }, 'Microsoft Graph');
    if (!j.id) throw new Error('Microsoft Graph did not return an event id');
    return String(j.id);
  },
};
