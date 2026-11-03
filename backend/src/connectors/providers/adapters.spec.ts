import { microsoft } from './microsoft';
import { calendly } from './calendly';
import { cliniko, shardOf } from './cliniko';
import { clio } from './clio';
import { calcom } from './calcom';
import { adapterCtx } from './runtime';

type Call = { url: string; init?: any };
let calls: Call[];
let routes: [RegExp, (url: string, init?: any) => any][];
const realFetch = global.fetch;

beforeEach(() => {
  calls = []; routes = [];
  process.env.MICROSOFT_CLIENT_ID = 'ms-id'; process.env.MICROSOFT_CLIENT_SECRET = 'ms-secret';
  process.env.CALENDLY_CLIENT_ID = 'cal-id'; process.env.CALENDLY_CLIENT_SECRET = 'cal-secret';
  process.env.CLIO_CLIENT_ID = 'clio-id'; process.env.CLIO_CLIENT_SECRET = 'clio-secret';
  global.fetch = jest.fn(async (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    const r = routes.find(([re]) => re.test(String(url)));
    if (!r) return new Response(JSON.stringify({ error: 'no route' }), { status: 404 });
    const out = r[1](String(url), init);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  }) as any;
});
afterEach(() => { global.fetch = realFetch; });
const on = (re: RegExp, fn: (u: string, i?: any) => any) => routes.push([re, fn]);
const params = (u: string) => new URL(u).searchParams;
const from = new Date('2026-11-04T00:00:00Z'), to = new Date('2026-11-08T00:00:00Z');

describe('microsoft', () => {
  it('builds the authorize URL and exchanges / refreshes tokens', async () => {
    const u = new URL(microsoft.auth.type === 'oauth2' ? microsoft.auth.authorizeUrl('https://api/cb', 'STATE') : '');
    expect(u.host).toBe('login.microsoftonline.com');
    expect(u.searchParams.get('client_id')).toBe('ms-id');
    expect(u.searchParams.get('scope')).toContain('Calendars.ReadWrite');
    expect(u.searchParams.get('state')).toBe('STATE');
    on(/oauth2\/v2\.0\/token/, (_u, i) => ({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, _body: String(i.body) }));
    if (microsoft.auth.type !== 'oauth2') throw new Error();
    const c = await microsoft.auth.exchange('CODE', 'https://api/cb');
    expect(c).toMatchObject({ accessToken: 'AT', refreshToken: 'RT' });
    expect(String(calls[0].init.body)).toContain('grant_type=authorization_code');
    const r = await microsoft.auth.refresh!('RT', {});
    expect(r.refreshToken).toBe('RT');
    expect(String(calls[1].init.body)).toContain('grant_type=refresh_token');
  });
  it('lists events: UTC parsing, skips cancelled/all-day, follows nextLink', async () => {
    on(/calendarView\?/, (u) => params(u).get('$skip')
      ? { value: [{ id: 'e3', subject: 'C', start: { dateTime: '2026-11-05T10:00:00.0000000' }, end: { dateTime: '2026-11-05T11:00:00.0000000' }, attendees: [] }] }
      : { value: [
          { id: 'e1', subject: 'Cut', start: { dateTime: '2026-11-04T15:00:00.0000000' }, end: { dateTime: '2026-11-04T16:00:00.0000000' }, attendees: [{ emailAddress: { address: 'Bob@X.com' } }] },
          { id: 'x', isCancelled: true, start: { dateTime: '2026-11-04T17:00:00' }, end: { dateTime: '2026-11-04T18:00:00' } },
          { id: 'ad', isAllDay: true, start: { dateTime: '2026-11-04T00:00:00' }, end: { dateTime: '2026-11-05T00:00:00' } },
        ], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendarView?$skip=100' });
    const ev = await microsoft.listAppointments({ accessToken: 'AT', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(ev[0]).toMatchObject({ summary: 'Cut', email: 'bob@x.com' });
    expect(ev[0].start.toISOString()).toBe('2026-11-04T15:00:00.000Z');
    expect(calls[0].init.headers.Prefer).toBe('outlook.timezone="UTC"');
    expect(calls[0].init.headers.Authorization).toBe('Bearer AT');
    expect(params(calls[0].url).get('startDateTime')).toBe(from.toISOString());
  });
  it('books by creating an event with the attendee', async () => {
    on(/\/me\/events$/, () => ({ id: 'new-1' }));
    const id = await microsoft.book!({ accessToken: 'AT', extra: {} }, { start: new Date('2026-11-05T10:00:00Z'), end: new Date('2026-11-05T11:00:00Z') }, { name: 'Ana', email: 'ana@x.com' });
    expect(id).toBe('new-1');
    const body = JSON.parse(calls[0].init.body);
    expect(body.start).toEqual({ dateTime: '2026-11-05T10:00:00.000', timeZone: 'UTC' });
    expect(body.attendees[0].emailAddress.address).toBe('ana@x.com');
  });
  it('surfaces vendor errors without leaking the token', async () => {
    on(/calendarView/, () => new Response(JSON.stringify({ error: { message: 'Token expired' } }), { status: 401 }));
    await expect(microsoft.listAppointments({ accessToken: 'SECRET-TOKEN', extra: {} }, from, to)).rejects.toThrow(/401: Token expired/);
    await expect(microsoft.listAppointments({ accessToken: 'SECRET-TOKEN', extra: {} }, from, to)).rejects.not.toThrow(/SECRET-TOKEN/);
  });
});

describe('calendly', () => {
  it('stores the user URI after exchange', async () => {
    on(/auth\.calendly\.com\/oauth\/token/, () => ({ access_token: 'AT', refresh_token: 'RT', expires_in: 7200 }));
    on(/users\/me/, () => ({ resource: { uri: 'https://api.calendly.com/users/U1' } }));
    if (calendly.auth.type !== 'oauth2') throw new Error();
    expect((await calendly.auth.exchange('C', 'r')).extra).toEqual({ userUri: 'https://api.calendly.com/users/U1' });
  });
  it('lists active events, fetches invitee only for unseen events, paginates', async () => {
    on(/scheduled_events\?/, (u) => params(u).get('page_token')
      ? { collection: [{ uri: 'https://api.calendly.com/scheduled_events/E2', name: 'B', start_time: '2026-11-05T10:00:00Z', end_time: '2026-11-05T10:30:00Z' }], pagination: {} }
      : { collection: [{ uri: 'https://api.calendly.com/scheduled_events/E1', name: 'A', start_time: '2026-11-04T10:00:00Z', end_time: '2026-11-04T10:30:00Z' }], pagination: { next_page: 'https://api.calendly.com/scheduled_events?page_token=2' } });
    on(/E2\/invitees/, () => ({ collection: [{ email: 'Guest@X.com' }] }));
    const ev = await calendly.listAppointments({ accessToken: 'AT', extra: { userUri: 'https://api.calendly.com/users/U1' }, previous: [{ id: 'E1', start: '', end: '', email: 'known@x.com' }] }, from, to);
    expect(ev.map((e) => [e.id, e.email])).toEqual([['E1', 'known@x.com'], ['E2', 'guest@x.com']]);
    expect(calls.filter((c) => c.url.includes('/invitees'))).toHaveLength(1); // E1 was cached
    expect(params(calls[0].url).get('status')).toBe('active');
    expect(params(calls[0].url).get('user')).toBe('https://api.calendly.com/users/U1');
  });
  it('asks to reconnect when the user URI is missing and never books', async () => {
    await expect(calendly.listAppointments({ accessToken: 'AT', extra: {} }, from, to)).rejects.toThrow(/reconnect/i);
    expect(calendly.bookingSupported).toBe(false);
  });
});

describe('cliniko', () => {
  it('derives the shard and validates the key', async () => {
    expect(shardOf('abc123-au2')).toBe('au2');
    on(/api\.au2\.cliniko\.com\/v1\/user/, () => ({ id: 1 }));
    if (cliniko.auth.type !== 'apikey') throw new Error();
    expect(await cliniko.auth.validate({ apiKey: 'abc123-au2' })).toEqual({ accessToken: 'abc123-au2', extra: { shard: 'au2' } });
    expect(calls[0].init.headers.Authorization).toBe(`Basic ${Buffer.from('abc123-au2:').toString('base64')}`);
    expect(calls[0].init.headers['User-Agent']).toMatch(/Gaplets/);
    await expect(cliniko.auth.validate({ apiKey: 'nonsense' })).rejects.toThrow(/does not look like/);
  });
  it('lists non-cancelled appointments and resolves the patient email once', async () => {
    on(/individual_appointments\?/, () => ({ individual_appointments: [
      { id: 1, starts_at: '2026-11-04T10:00:00Z', ends_at: '2026-11-04T10:30:00Z', patient: { links: { self: 'https://api.au2.cliniko.com/v1/patients/77' } }, appointment_type: { name: 'Physio' } },
      { id: 2, starts_at: '2026-11-04T11:00:00Z', ends_at: '2026-11-04T11:30:00Z', cancelled_at: '2026-11-03T00:00:00Z' },
    ] }));
    on(/patients\/77/, () => ({ email: 'Pat@X.com' }));
    const ev = await cliniko.listAppointments({ accessToken: 'k-au2', extra: { shard: 'au2' } }, from, to);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ id: '1', summary: 'Physio', email: 'pat@x.com' });
    const q = new URL(calls[0].url).searchParams.getAll('q[]');
    expect(q).toEqual([`starts_at:>=${from.toISOString()}`, `starts_at:<=${to.toISOString()}`]);
  });
  it('maps patients to clients, dropping those without contact info', async () => {
    on(/patients\?/, () => ({ patients: [
      { first_name: 'Ann', last_name: 'Lee', email: 'ann@x.com', patient_phone_numbers: [{ number: '(555) 123-4567' }] },
      { first_name: 'No', last_name: 'Contact' },
    ], links: {} }));
    const cl = await cliniko.listClients!({ accessToken: 'k-au2', extra: { shard: 'au2' } });
    expect(cl).toEqual([{ name: 'Ann Lee', email: 'ann@x.com', phone: '+15551234567', services: [] }]);
  });
});

describe('clio', () => {
  it('lists timed calendar entries and follows paging', async () => {
    on(/calendar_entries\.json\?/, (u) => u.includes('page_token')
      ? { data: [{ id: 3, summary: 'Hearing', start_at: '2026-11-06T09:00:00Z', end_at: '2026-11-06T10:00:00Z' }] }
      : { data: [
          { id: 1, summary: 'Call', start_at: '2026-11-04T09:00:00Z', end_at: '2026-11-04T09:30:00Z', attendees: [{ email: 'C@X.com' }] },
          { id: 2, all_day: true, start_at: '2026-11-04T00:00:00Z', end_at: '2026-11-05T00:00:00Z' },
        ], meta: { paging: { next: 'https://app.clio.com/api/v4/calendar_entries.json?page_token=n' } } });
    const ev = await clio.listAppointments({ accessToken: 'AT', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['1', '3']);
    expect(ev[0].email).toBe('c@x.com');
    expect(calls[0].url).toContain('app.clio.com/api/v4/calendar_entries.json');
  });
  it('honours a regional base URL', () => {
    process.env.CLIO_BASE_URL = 'https://eu.app.clio.com/';
    if (clio.auth.type !== 'oauth2') throw new Error();
    expect(clio.auth.authorizeUrl('r', 's')).toContain('https://eu.app.clio.com/oauth/authorize');
    delete process.env.CLIO_BASE_URL;
  });
});

describe('calcom', () => {
  it('validates the key and lists only accepted bookings', async () => {
    on(/api\.cal\.com\/v2\/bookings/, () => ({ data: [
      { uid: 'b1', start: '2026-11-04T10:00:00Z', end: '2026-11-04T10:30:00Z', title: 'Intro', status: 'accepted', attendees: [{ email: 'A@X.com' }] },
      { uid: 'b2', start: '2026-11-04T12:00:00Z', end: '2026-11-04T12:30:00Z', status: 'cancelled' },
    ] }));
    if (calcom.auth.type !== 'apikey') throw new Error();
    await expect(calcom.auth.validate({ apiKey: ' cal_live_x ' })).resolves.toEqual({ accessToken: 'cal_live_x' });
    const ev = await calcom.listAppointments({ accessToken: 'cal_live_x', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['b1']);
    expect(calls.at(-1)!.init.headers['cal-api-version']).toBeDefined();
    await expect(calcom.auth.validate({ apiKey: '' })).rejects.toThrow(/Enter/);
  });
});

describe('adapterCtx token refresh', () => {
  it('refreshes an expiring OAuth token and persists it', async () => {
    on(/oauth2\/v2\.0\/token/, () => ({ access_token: 'NEW', refresh_token: 'RT2', expires_in: 3600 }));
    const update = jest.fn().mockResolvedValue({});
    const ctx = await adapterCtx({ connectedIntegration: { update } } as any, { id: 'i1', accessToken: 'OLD', refreshToken: 'RT', expiresAt: new Date(Date.now() - 1000), config: { extra: { a: 'b' } } }, microsoft);
    expect(ctx).toMatchObject({ accessToken: 'NEW', extra: { a: 'b' } });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'i1' }, data: expect.objectContaining({ accessToken: 'NEW', refreshToken: 'RT2' }) }));
  });
  it('does not refresh a fresh token, and asks to reconnect without a refresh token', async () => {
    const update = jest.fn();
    const fresh = await adapterCtx({ connectedIntegration: { update } } as any, { id: 'i', accessToken: 'KEEP', refreshToken: 'RT', expiresAt: new Date(Date.now() + 3600e3), config: null }, microsoft);
    expect(fresh.accessToken).toBe('KEEP'); expect(update).not.toHaveBeenCalled();
    await expect(adapterCtx({ connectedIntegration: { update } } as any, { id: 'i', accessToken: 'x', refreshToken: null, expiresAt: new Date(Date.now() - 1), config: null }, microsoft)).rejects.toThrow(/reconnect/i);
  });
  it('never refreshes API-key providers', async () => {
    const ctx = await adapterCtx({ connectedIntegration: { update: jest.fn() } } as any, { id: 'i', accessToken: 'KEY', refreshToken: null, expiresAt: null, config: { extra: { shard: 'au2' } } }, cliniko);
    expect(ctx).toMatchObject({ accessToken: 'KEY', extra: { shard: 'au2' } });
  });
});
