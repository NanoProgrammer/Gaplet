import * as crypto from 'crypto';
import { wodify } from './wodify';
import { pabau } from './pabau';
import { shopmonkey } from './shopmonkey';
import { workiz } from './workiz';
import { pushpress, parsePushPressEvent } from './pushpress';
import { decryptSecret, isEncrypted } from '../../prisma-manager/crypto-box';
import { isConfigured } from './registry';

const realFetch = global.fetch;
let calls: { url: string; init?: any }[];
let handler: (u: string, i?: any) => any;
beforeEach(() => {
  calls = [];
  process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  global.fetch = jest.fn(async (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    const out = handler(String(url), init);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  }) as any;
});
afterEach(() => { global.fetch = realFetch; delete process.env.ENABLE_UNVERIFIED_PROVIDERS; });
const from = new Date('2026-11-04T00:00:00Z'), to = new Date('2026-11-08T00:00:00Z');
const qs = (u: string) => new URL(u).searchParams;

describe('wodify', () => {
  const booking = (id: number, over: any = {}) => ({ booking_id: id, client_id: 9, client: 'Ann', utc_appointment_start_datetime: '2026-11-05T15:00:00Z', utc_appointment_end_datetime: '2026-11-05T15:45:00Z', service: 'PT', booking_status: 'Confirmed', cancelled: null, ...over });
  it('validates the key and sends x-api-key', async () => {
    handler = () => ({ client_appointment_bookings: [], pagination: { page: 1, page_size: 1, has_more: false } });
    if (wodify.auth.type !== 'apikey') throw new Error();
    await expect(wodify.auth.validate({ apiKey: ' K ' })).resolves.toEqual({ accessToken: 'K' });
    expect(calls[0].init.headers['x-api-key']).toBe('K');
    expect(calls[0].url).toContain('/appointments/bookings/clients?');
    await expect(wodify.auth.validate({})).rejects.toThrow(/Enter/);
  });
  it('searches with the q syntax, skips cancelled, tolerates a missing Z and paginates', async () => {
    let n = 0;
    handler = () => (n++ === 0
      ? { client_appointment_bookings: [
          booking(1),
          booking(2, { cancelled: { cancelled_by: 'x', cancelled_on_datetime: '2026-11-03T09:00:00Z' } }),
          booking(3, { booking_status: 'Cancelled' }),
        ], pagination: { page: 1, page_size: 100, has_more: true } }
      : { client_appointment_bookings: [booking(4, { utc_appointment_start_datetime: '2026-11-06T10:00:00', utc_appointment_end_datetime: '2026-11-06T11:00:00' })], pagination: { has_more: false } });
    const ev = await wodify.listAppointments!({ accessToken: 'K', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['1', '4']);
    expect(ev[0].end.getTime() - ev[0].start.getTime()).toBe(45 * 60_000);
    expect(ev[1].start.toISOString()).toBe('2026-11-06T10:00:00.000Z');
    expect(calls[0].url).toContain('/appointments/bookings/clients/search?');
    expect(qs(calls[0].url).get('q')).toBe('utc_appointment_start_datetime|gte|2026-11-04T00:00:00Z;utc_appointment_start_datetime|lte|2026-11-08T00:00:00Z');
    expect(qs(calls[1].url).get('page')).toBe('2');
  });
  it('treats wodify_validation_result as an error even with HTTP 200', async () => {
    handler = () => ({ client_appointment_bookings: [], wodify_validation_result: { errors: ['unknown field'] } });
    await expect(wodify.listAppointments!({ accessToken: 'K', extra: {} }, from, to)).rejects.toThrow(/rejected the request.*unknown field/);
  });
});

describe('pabau', () => {
  const appt = (id: number, over: any = {}) => ({ details: { appointment_id: id, appointment_status: 'waiting' }, client: [{ id: 1, customer_name: 'Ann', Email: 'Ann@X.com' }], service: [{ service: 'Facial' }], dates: { start_date: '2026-11-05', start_time: '12:30:00', end_date: '2026-11-05', end_time: '13:15:00', duration: 45 }, ...over });
  it('puts the key in the path (URL-encoded), requires a time zone', async () => {
    handler = () => ({ status: true, total: 0, appointments: [] });
    if (pabau.auth.type !== 'apikey') throw new Error();
    await pabau.auth.validate({ apiKey: 'abc123' });
    expect(calls[0].url).toBe('https://api.oauth.pabau.com/abc123/appointments?per_page=1&page=1');
    await expect(pabau.auth.validate({ apiKey: 'a b' })).rejects.toThrow(/does not look/);
    await expect(pabau.listAppointments!({ accessToken: 'abc123', extra: {} }, from, to)).rejects.toThrow(/time zone/);
  });
  it('widens the day range, converts clinic-local times, skips cancelled, stops at total', async () => {
    handler = () => ({ status: true, total: 3, appointments: [
      appt(1), appt(2, { details: { appointment_id: 2, appointment_status: 'Cancelled' } }),
      appt(3, { dates: { start_date: '2026-11-20', start_time: '09:00:00', end_date: '2026-11-20', end_time: '10:00:00' } }), // outside window
    ] });
    const ev = await pabau.listAppointments!({ accessToken: 'abc123', extra: {}, timezone: 'Europe/London' }, from, to);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ id: '1', summary: 'Facial', email: 'ann@x.com' });
    expect(ev[0].start.toISOString()).toBe('2026-11-05T12:30:00.000Z'); // GMT in November
    expect(ev[0].end.getTime() - ev[0].start.getTime()).toBe(45 * 60_000);
    expect(qs(calls[0].url).get('start_date')).toBe('2026-11-03');
    expect(qs(calls[0].url).get('end_date')).toBe('2026-11-09');
    expect(calls).toHaveLength(1); // total=3 reached after first page
  });
  it('status=false is an error; summer time is honoured', async () => {
    handler = () => ({ status: false, appointments: [] });
    await expect(pabau.listAppointments!({ accessToken: 'k', extra: {}, timezone: 'UTC' }, from, to)).rejects.toThrow(/status=false/);
    handler = () => ({ status: true, total: 1, appointments: [appt(1, { dates: { start_date: '2026-07-05', start_time: '12:30:00', end_date: '2026-07-05', end_time: '13:00:00' } })] });
    const ev = await pabau.listAppointments!({ accessToken: 'k', extra: {}, timezone: 'Europe/London' }, new Date('2026-07-04T00:00:00Z'), new Date('2026-07-08T00:00:00Z'));
    expect(ev[0].start.toISOString()).toBe('2026-07-05T11:30:00.000Z'); // BST = UTC+1
  });
});

describe('shopmonkey', () => {
  const sm = (id: string, over: any = {}) => ({ id, name: 'Oil change', startDate: '2026-11-05T15:00:00.000Z', endDate: '2026-11-05T16:00:00.000Z', allDay: false, customer: { emails: [{ email: 'Car@X.com' }] }, ...over });
  it('searches with POST + where.startDate range and Bearer auth', async () => {
    handler = () => ({ success: true, data: [sm('a'), sm('b', { cancellationNote: 'customer called' }), sm('c', { allDay: true })] });
    const ev = await shopmonkey.listAppointments!({ accessToken: 'TOK', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['a']);
    expect(ev[0].email).toBe('car@x.com');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers.Authorization).toBe('Bearer TOK');
    const body = JSON.parse(calls[0].init.body);
    expect(body.where.startDate).toEqual({ gte: from.toISOString(), lte: to.toISOString() });
    expect(body.orderBy).toEqual({ startDate: 'asc' });
  });
  it('success=false on HTTP 200 is an error; success must be present', async () => {
    handler = () => ({ success: false, message: 'Invalid where' });
    await expect(shopmonkey.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/failure: Invalid where/);
    handler = () => ({ data: [] });
    await expect(shopmonkey.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/failure/);
  });
  it('stable ids for recurring appointments; string emails; naive dates need a time zone', async () => {
    handler = () => ({ success: true, data: [
      sm('p', { recurring: true, recurringExceptionId: 'EXC1', customer: { emails: ['S@X.com'] } }),
      sm('q', { recurring: true, startDate: '2026-11-06T15:00:00.000Z' }),
    ] });
    const ev = await shopmonkey.listAppointments!({ accessToken: 'T', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['EXC1', 'q@2026-11-06T15:00:00.000Z']);
    expect(ev[0].email).toBe('s@x.com');
    handler = () => ({ success: true, data: [sm('n', { startDate: '2026-11-05 10:00:00', endDate: '2026-11-05 11:00:00' })] });
    await expect(shopmonkey.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/without a time zone/);
    const ok = await shopmonkey.listAppointments!({ accessToken: 'T', extra: {}, timezone: 'America/Chicago' }, from, to);
    expect(ok[0].start.toISOString()).toBe('2026-11-05T16:00:00.000Z'); // CST = UTC-6
  });
  it('validates with GET /appointment?limit=1', async () => {
    handler = () => ({ success: true, data: [], meta: { hasMore: false, total: 0 } });
    if (shopmonkey.auth.type !== 'apikey') throw new Error();
    await shopmonkey.auth.validate({ apiKey: 'K' });
    expect(calls[0].url).toBe('https://api.shopmonkey.cloud/v3/appointment?limit=1');
  });
});

describe('workiz', () => {
  const job = (id: string, over: any = {}) => ({ UUID: id, JobDateTime: '2026-11-05 09:00:00', JobEndDateTime: '2026-11-05 10:30:00', Status: 'Submitted', Timezone: 'US/Pacific', Email: 'Cust@X.com', JobType: 'Plumbing', ...over });
  it('puts the token in the path and asks for non-open jobs too', async () => {
    handler = () => ({ flag: true, data: [] });
    await workiz.listAppointments!({ accessToken: 'TOK', extra: {} }, from, to);
    expect(calls[0].url.startsWith('https://api.workiz.com/api/v1/TOK/job/all/?')).toBe(true);
    expect(qs(calls[0].url).get('only_open')).toBe('false');
    expect(qs(calls[0].url).get('records')).toBe('100');
  });
  it("reads times in the job's own zone, drops Canceled, KEEPS Done", async () => {
    handler = () => ({ flag: true, data: [job('a'), job('b', { Status: 'Canceled' }), job('c', { Status: 'Done' }), job('d', { Status: 'Cancelled' })] });
    const ev = await workiz.listAppointments!({ accessToken: 'T', extra: {} }, from, to);
    expect(ev.map((e) => e.id)).toEqual(['a', 'c']);
    expect(ev[0].start.toISOString()).toBe('2026-11-05T17:00:00.000Z'); // PST = UTC-8
    expect(ev[0].end.getTime() - ev[0].start.getTime()).toBe(90 * 60_000);
    expect(ev[0]).toMatchObject({ email: 'cust@x.com', summary: 'Plumbing' });
  });
  it('falls back to the time zone setting; errors when neither exists', async () => {
    handler = () => ({ flag: true, data: [job('a', { Timezone: undefined })] });
    await expect(workiz.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/without a time zone/);
    const ev = await workiz.listAppointments!({ accessToken: 'T', extra: {}, timezone: 'UTC' }, from, to);
    expect(ev[0].start.toISOString()).toBe('2026-11-05T09:00:00.000Z');
  });
  it('flag=false and a non-array data (Swagger: single Job) are errors, never an empty list', async () => {
    handler = () => ({ flag: false, msg: 'Invalid token' });
    await expect(workiz.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/failure: Invalid token/);
    handler = () => ({ flag: true, data: job('single') });
    await expect(workiz.listAppointments!({ accessToken: 'T', extra: {} }, from, to)).rejects.toThrow(/unexpected response/);
  });
  it('paginates by offset until a short page', async () => {
    let n = 0;
    handler = () => ({ flag: true, data: n++ === 0 ? Array.from({ length: 100 }, (_, i) => job(`j${i}`)) : [job('last')] });
    const ev = await workiz.listAppointments!({ accessToken: 'T', extra: {} }, from, to);
    expect(ev).toHaveLength(101);
    expect(qs(calls[1].url).get('offset')).toBe('100');
  });
});

describe('pushpress', () => {
  it('parses cancellation events: seconds and milliseconds, other events ignored', () => {
    const a = parsePushPressEvent({ type: 'appointment.canceled', data: { id: 'ap1', startTimestamp: 1793894400, type: { name: 'Intro' } } })!;
    expect(a).toMatchObject({ externalId: 'ap1', durationMinutes: 60, service: 'Intro' });
    expect(a.start.toISOString()).toBe('2026-11-05T16:00:00.000Z');
    expect(parsePushPressEvent({ event: 'appointment.cancelled', payload: { id: 'x', startTimestamp: 1793894400000 } })!.start.toISOString()).toBe('2026-11-05T16:00:00.000Z');
    expect(parsePushPressEvent({ type: 'appointment.scheduled', data: {} })).toBeNull();
    expect(parsePushPressEvent({})).toBeNull();
  });
  it('a cancellation with an unexpected shape THROWS (never silently ignored)', () => {
    expect(() => parsePushPressEvent({ type: 'appointment.canceled' })).toThrow(/without appointment data/);
    expect(() => parsePushPressEvent({ type: 'appointment.canceled', data: { id: 1 } })).toThrow(/startTimestamp/);
    expect(() => parsePushPressEvent({ type: 'appointment.canceled', data: { startTimestamp: 'soon' } })).toThrow(/startTimestamp/);
  });
  it('validates both credentials with an authenticated call, sending API-KEY and company-id', async () => {
    handler = () => [];
    if (pushpress.auth.type !== 'apikey') throw new Error();
    await expect(pushpress.auth.validate({ apiKey: 'K' })).rejects.toThrow(/both/);
    await expect(pushpress.auth.validate({ apiKey: 'K', companyId: 'C1' })).resolves.toEqual({ accessToken: 'K', extra: { companyId: 'C1' } });
    expect(calls[0].init.headers).toMatchObject({ 'API-KEY': 'K', 'company-id': 'C1' });
    expect(calls[0].url).toBe('https://api.pushpress.com/v3/webhooks');
  });
  it('registers the webhook for appointment.canceled and stores the signing secret ENCRYPTED', async () => {
    handler = () => new Response(JSON.stringify({ id: 'wh_1', url: 'x', eventTypes: ['appointment.canceled'], active: true, signingSecret: 'S3CRET' }), { status: 201 });
    const r = await pushpress.webhook!.register({ accessToken: 'K', extra: { companyId: 'C1' } }, 'https://api.gaplets.test/hooks/native/pushpress/gp_tok');
    expect(JSON.parse(calls[0].init.body)).toEqual({ url: 'https://api.gaplets.test/hooks/native/pushpress/gp_tok', eventTypes: ['appointment.canceled'] });
    expect(r.webhookId).toBe('wh_1');
    expect(isEncrypted(r.extra!.signingSecretEnc)).toBe(true);
    expect(decryptSecret(r.extra!.signingSecretEnc)).toBe('S3CRET');
    expect(JSON.stringify(r)).not.toContain('S3CRET');
    handler = () => ({ nothing: true });
    await expect(pushpress.webhook!.register({ accessToken: 'K', extra: { companyId: 'C1' } }, 'u')).rejects.toThrow(/webhook id/);
  });
  it('unregisters with DELETE and has no list endpoint (so it is never polled)', async () => {
    handler = () => ({});
    await pushpress.webhook!.unregister!({ accessToken: 'K', extra: { companyId: 'C1' } }, 'wh_1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toBe('https://api.pushpress.com/v3/webhooks/wh_1');
    expect(pushpress.listAppointments).toBeUndefined();
  });
});

describe('gating of the five', () => {
  it('are all unverified and off unless explicitly enabled', () => {
    for (const a of [wodify, pabau, shopmonkey, workiz, pushpress]) {
      expect(a.maturity).toBe('unverified');
      expect(isConfigured(a)).toBe(false);
    }
    process.env.ENABLE_UNVERIFIED_PROVIDERS = 'true';
    for (const a of [wodify, pabau, shopmonkey, workiz, pushpress]) expect(isConfigured(a)).toBe(true);
  });
});
