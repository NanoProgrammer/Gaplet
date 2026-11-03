import { CalEvent } from '../calendar-diff';
import { bearer, env, form, listOf, requestJson } from './http';
import { Credentials, ProviderAdapter } from './types';

/*
 * UNVERIFIED (written without access to Jobber's documentation or an account). Checklist:
 *  1. OAuth authorize/token URLs below.
 *  2. X-JOBBER-GRAPHQL-VERSION: set JOBBER_GRAPHQL_VERSION to a version Jobber currently accepts.
 *  3. The `visits` query, its filter name/shape (`filter.startAt.after/before`) and the field names.
 *  4. Which visitStatus values mean "cancelled" (we skip anything not active).
 */
const BASE = 'https://api.getjobber.com/api';
const version = () => env('JOBBER_GRAPHQL_VERSION', '2025-01-20');

const toCreds = (j: any, prevRefresh?: string): Credentials => {
  if (!j.access_token) throw new Error('Jobber did not return an access token');
  // UNVERIFIED: expiry. Jobber access tokens are short lived; assume 1h when not told.
  return { accessToken: j.access_token, refreshToken: j.refresh_token ?? prevRefresh ?? null, expiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000) };
};
const tokenCall = (params: Record<string, string>) =>
  requestJson(`${BASE}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: env('JOBBER_CLIENT_ID'), client_secret: env('JOBBER_CLIENT_SECRET'), ...params }) }, 'Jobber');

const QUERY = `query Visits($first: Int!, $after: String, $after_: ISO8601DateTime!, $before: ISO8601DateTime!) {
  visits(first: $first, after: $after, filter: { startAt: { after: $after_, before: $before } }) {
    nodes { id title startAt endAt visitStatus client { firstName lastName emails { address } } }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const jobber: ProviderAdapter = {
  key: 'jobber',
  name: 'Jobber',
  maturity: 'unverified',
  bookingSupported: false,
  auth: {
    type: 'oauth2',
    envVars: ['JOBBER_CLIENT_ID', 'JOBBER_CLIENT_SECRET'],
    authorizeUrl: (redirect, state) => `${BASE}/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: env('JOBBER_CLIENT_ID'), redirect_uri: redirect, state })}`,
    exchange: async (code, redirect) => toCreds(await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirect })),
    refresh: async (rt) => toCreds(await tokenCall({ grant_type: 'refresh_token', refresh_token: rt }), rt),
  },
  async listAppointments(ctx, from, to) {
    const out: CalEvent[] = [];
    let after: string | null = null;
    for (let page = 0; page < 20; page++) {
      const j: any = await requestJson(`${BASE}/graphql`, {
        method: 'POST',
        headers: { ...bearer(ctx.accessToken), 'Content-Type': 'application/json', 'X-JOBBER-GRAPHQL-VERSION': version() },
        body: JSON.stringify({ query: QUERY, variables: { first: 50, after, after_: from.toISOString(), before: to.toISOString() } }),
      }, 'Jobber');
      if (j.errors?.length) throw new Error(`Jobber GraphQL error: ${String(j.errors[0]?.message ?? 'unknown').slice(0, 200)}`);
      const conn = j.data?.visits;
      for (const v of listOf(conn, 'nodes', 'Jobber')) {
        if (!v.startAt || !v.endAt) continue;
        if (v.visitStatus && !/^(ACTIVE|UPCOMING|LATE|TODAY|SCHEDULED)$/i.test(String(v.visitStatus))) continue; // UNVERIFIED enum values
        out.push({ id: String(v.id), start: new Date(v.startAt), end: new Date(v.endAt), summary: v.title, email: v.client?.emails?.[0]?.address?.toLowerCase() });
      }
      if (!conn.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
    return out;
  },
};
