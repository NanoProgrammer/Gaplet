import { jobber } from './jobber';
import { opendental } from './opendental';
import { zoho } from './zoho';
import { microsoft } from './microsoft';
import { calendly } from './calendly';
import { cliniko } from './cliniko';
import { clio } from './clio';
import { calcom } from './calcom';
import { isConfigured } from './registry';
import { formatZoho, localToUtc, parseLocal, parseZoho } from './time';

const realFetch = global.fetch;
let calls: { url: string; init?: any }[];
let handler: (u: string, i?: any) => any;
beforeEach(() => {
  calls = [];
  global.fetch = jest.fn(async (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    const out = handler(String(url), init);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  }) as any;
  process.env.JOBBER_CLIENT_ID = 'j-id'; process.env.JOBBER_CLIENT_SECRET = 'j-sec';
  process.env.ZOHO_CLIENT_ID = 'z-id'; process.env.ZOHO_CLIENT_SECRET = 'z-sec';
  process.env.OPEN_DENTAL_DEVELOPER_KEY = 'DEVKEY';
});
afterEach(() => { global.fetch = realFetch; delete process.env.ENABLE_UNVERIFIED_PROVIDERS; });
const from = new Date('2026-11-04T00:00:00Z'), to = new Date('2026-11-08T00:00:00Z');

describe('time helpers', () => {
  it('converts local wall time to UTC across DST', () => {
    expect(localToUtc(2026, 7, 1, 9, 0, 0, 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z'); // EDT -4
    expect(localToUtc(2026, 12, 1, 9, 0, 0, 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z'); // EST -5
    expect(parseLocal('2026-11-03 14:30:00', 'America/New_York').toISOString()).toBe('2026-11-03T19:30:00.000Z');
    expect(parseLocal('2026-11-03T14:30:00', 'UTC').toISOString()).toBe('2026-11-03T14:30:00.000Z');
    expect(localToUtc(2026, 3, 8, 12, 0, 0, 'America/New_York').toISOString()).toBe('2026-03-08T16:00:00.000Z'); // day DST starts
  });
  it('round-trips the Zoho format', () => {
    const d = new Date('2026-11-03T19:30:00Z');
    expect(formatZoho(d, 'America/New_York')).toBe('03-Nov-2026 14:30:00');
    expect(parseZoho('03-Nov-2026 14:30:00', 'America/New_York').toISOString()).toBe(d.toISOString());
    expect(() => parseZoho('garbage', 'UTC')).toThrow(/Unrecognised/);
  });
});

describe('safety: an unexpected 200 body is an error, never "no appointments"', () => {
  const ctx = { accessToken: 't', extra: { userUri: 'u', shard: 'au2', apiDomain: 'https://www.zohoapis.com' }, timezone: 'UTC' };
  it.each([
    ['microsoft', () => microsoft.listAppointments(ctx, from, to)],
    ['calendly', () => calendly.listAppointments(ctx, from, to)],
    ['cliniko', () => cliniko.listAppointments(ctx, from, to)],
    ['clio', () => clio.listAppointments(ctx, from, to)],
    ['calcom', () => calcom.listAppointments(ctx, from, to)],
    ['jobber', () => jobber.listAppointments(ctx, from, to)],
    ['opendental', () => opendental.listAppointments(ctx, from, to)],
    ['zoho', () => zoho.listAppointments(ctx, from, to)],
  ])('%s throws instead of returning []', async (_n, call) => {
    handler = () => ({ message: 'maintenance' }); // 200 with the wrong shape
    await expect(call()).rejects.toThrow(/unexpected response|GraphQL|Not syncing/);
  });
});

describe('gating', () => {
  it('unverified providers are off unless explicitly enabled and credentialed', () => {
    expect(isConfigured(jobber)).toBe(false);
    process.env.ENABLE_UNVERIFIED_PROVIDERS = 'true';
    expect(isConfigured(jobber)).toBe(true);
    delete process.env.JOBBER_CLIENT_ID;
    expect(isConfigured(jobber)).toBe(false);
    expect(isConfigured(opendental)).toBe(true); // needs OPEN_DENTAL_DEVELOPER_KEY, which is set
    delete process.env.OPEN_DENTAL_DEVELOPER_KEY;
    expect(isConfigured(opendental)).toBe(false);
  });
});

describe('jobber', () => {
  it('sends the GraphQL query with version header, paginates and skips non-active visits', async () => {
    let n = 0;
    handler = () => (n++ === 0
      ? { data: { visits: { nodes: [
          { id: 'v1', title: 'Clean', startAt: '2026-11-04T10:00:00Z', endAt: '2026-11-04T11:00:00Z', visitStatus: 'ACTIVE', client: { emails: [{ address: 'C@X.com' }] } },
          { id: 'v2', title: 'x', startAt: '2026-11-04T12:00:00Z', endAt: '2026-11-04T13:00:00Z', visitStatus: 'ARCHIVED' },
        ], pageInfo: { hasNextPage: true, endCursor: 'CUR' } } } }
      : { data: { visits: { nodes: [{ id: 'v3', startAt: '2026-11-05T10:00:00Z', endAt: '2026-11-05T11:00:00Z', visitStatus: 'UPCOMING' }], pageInfo: { hasNextPage: false } } } });
    const ev = await jobber.listAppointments({ accessToken: 'AT', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['v1', 'v3']);
    expect(ev[0].email).toBe('c@x.com');
    expect(calls[0].url).toBe('https://api.getjobber.com/api/graphql');
    expect(calls[0].init.headers['X-JOBBER-GRAPHQL-VERSION']).toBeDefined();
    expect(JSON.parse(calls[1].init.body).variables.after).toBe('CUR');
  });
  it('surfaces GraphQL errors', async () => {
    handler = () => ({ errors: [{ message: 'Field "visits" does not exist' }] });
    await expect(jobber.listAppointments({ accessToken: 'AT', extra: {} }, from, to)).rejects.toThrow(/does not exist/);
  });
});

describe('opendental', () => {
  it('requires a timezone, converts local times, derives duration from Pattern, only Scheduled, resolves email once', async () => {
    await expect(opendental.listAppointments({ accessToken: 'CK', extra: {} }, from, to)).rejects.toThrow(/time zone/);
    handler = (u) => u.includes('/patients/') ? { Email: 'Pat@X.com' } : [
      { AptNum: 1, PatNum: 5, AptStatus: 'Scheduled', AptDateTime: '2026-11-05 09:00:00', Pattern: 'XXXXXX//', ProcDescript: 'Cleaning' },
      { AptNum: 2, PatNum: 6, AptStatus: 'Broken', AptDateTime: '2026-11-05 10:00:00', Pattern: 'XX' },
    ];
    const ev = await opendental.listAppointments({ accessToken: 'CK', extra: {}, timezone: 'America/New_York' }, from, to);
    expect(ev).toHaveLength(1);
    expect(ev[0].start.toISOString()).toBe('2026-11-05T14:00:00.000Z');
    expect(ev[0].end.getTime() - ev[0].start.getTime()).toBe(8 * 5 * 60_000);
    expect(ev[0].email).toBe('pat@x.com');
    expect(calls[0].init.headers.Authorization).toBe('ODFHIR DEVKEY/CK');
  });
  it('validates the customer key', async () => {
    handler = () => [];
    if (opendental.auth.type !== 'apikey') throw new Error();
    await expect(opendental.auth.validate({ customerKey: ' CK ' })).resolves.toEqual({ accessToken: 'CK' });
    await expect(opendental.auth.validate({})).rejects.toThrow(/Enter/);
  });
});

describe('zoho', () => {
  it('exchanges the code keeping api_domain, and lists non-cancelled bookings in the workspace zone', async () => {
    handler = (u) => u.includes('/oauth/v2/token') ? { access_token: 'AT', refresh_token: 'RT', api_domain: 'https://www.zohoapis.eu', expires_in: 3600 }
      : { response: { returnvalue: { response: [
          { booking_id: 'B1', start_time: '05-Nov-2026 09:00:00', duration: 45, service_name: 'Massage', customer_email: 'A@X.com', status: 'UPCOMING' },
          { booking_id: 'B2', start_time: '05-Nov-2026 11:00:00', status: 'CANCEL' },
        ], next_page_available: false } } };
    if (zoho.auth.type !== 'oauth2') throw new Error();
    const c = await zoho.auth.exchange('CODE', 'https://api/cb');
    expect(c.extra).toEqual({ apiDomain: 'https://www.zohoapis.eu' });
    const ev = await zoho.listAppointments({ accessToken: 'AT', extra: c.extra!, timezone: 'Europe/Madrid' }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['B1']);
    expect(ev[0].start.toISOString()).toBe('2026-11-05T08:00:00.000Z'); // CET = UTC+1
    expect(ev[0].end.getTime() - ev[0].start.getTime()).toBe(45 * 60_000);
    const call = calls.find((x) => x.url.includes('fetchappointment'))!;
    expect(call.url.startsWith('https://www.zohoapis.eu/bookings/v1/json')).toBe(true);
    expect(call.init.headers.Authorization).toBe('Zoho-oauthtoken AT');
    await expect(zoho.listAppointments({ accessToken: 'AT', extra: {} }, from, to)).rejects.toThrow(/time zone/);
  });
  it('honours a regional accounts host', () => {
    process.env.ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.eu/';
    if (zoho.auth.type !== 'oauth2') throw new Error();
    expect(zoho.auth.authorizeUrl('r', 's')).toContain('https://accounts.zoho.eu/oauth/v2/auth');
    delete process.env.ZOHO_ACCOUNTS_URL;
  });
});
