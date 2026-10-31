/**
 * Integration tests against a REAL Postgres (DATABASE_URL). External services (SendGrid, Twilio,
 * Google, ICS hosts, the user's callback URL) are faked at the network boundary.
 * Skipped when DATABASE_URL is not set.
 */
import * as crypto from 'crypto';

const sendMock = jest.fn().mockResolvedValue([{}]);
jest.mock('@sendgrid/mail', () => ({ setApiKey: jest.fn(), send: (...a: any[]) => sendMock(...a) }));
jest.mock('twilio', () => () => ({ messages: { create: jest.fn().mockResolvedValue({}) } }));
const feed = { text: '' };
jest.mock('./net-guard', () => ({
  ...jest.requireActual('./net-guard'),
  safeFetchText: jest.fn(async () => feed.text),
}));

import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
import { NotificationService } from '../webhooks/webhook.service';
import { ConnectorsService, MAX_FREED_PER_POLL } from './connectors.service';
import { callbackSecret } from './callback-secret';

const run = process.env.DATABASE_URL ? describe : describe.skip;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const H = 3600e3;
const T0 = Math.floor(Date.now() / 60000) * 60000; // fixed base so repeated calls describe the same instants
const ics = (events: { uid: string; startH: number }[]) => {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return (
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//t//EN\r\n' +
    events.map((e) => `BEGIN:VEVENT\r\nUID:${e.uid}\r\nDTSTART:${f(new Date(T0 + e.startH * H))}\r\nDTEND:${f(new Date(T0 + (e.startH + 1) * H))}\r\nSUMMARY:Cut\r\nEND:VEVENT\r\n`).join('') +
    'END:VCALENDAR\r\n'
  );
};

run('connectors (real database)', () => {
  const prisma = new PrismaManagerService();
  let notifications: NotificationService;
  let svc: ConnectorsService;
  let realFetch: typeof fetch;
  const fetchCalls: { url: string; init?: any }[] = [];
  let userId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32);
    process.env.TWILIO_AUTH_TOKEN = 'x';
    process.env.SENDGRID_API_KEY = 'SG.x';
    process.env.SENDGRID_DOMAIN = 'gaplets.test';
    process.env.API_BASE_URL = 'https://api.gaplets.test';
    await prisma.$connect();
    notifications = new NotificationService(prisma);
    svc = new ConnectorsService(prisma, notifications);
  });
  afterAll(async () => { await prisma.$disconnect(); });

  beforeEach(async () => {
    sendMock.mockClear();
    fetchCalls.length = 0;
    realFetch = global.fetch;
    global.fetch = jest.fn(async (url: any, init?: any) => {
      fetchCalls.push({ url: String(url), init });
      return new Response(JSON.stringify({}), { status: 200 });
    }) as any;
    await prisma.replacementLog.deleteMany();
    await prisma.openSlot.deleteMany();
    await prisma.client.deleteMany();
    await prisma.connectedIntegration.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.user.deleteMany();
    const u = await prisma.user.create({ data: { email: 'owner@salon.test', name: 'Salon X', role: 'STARTER', preferences: { create: { matchAppointmentType: true } } } });
    userId = u.id;
  });
  afterEach(() => {
    global.fetch = realFetch;
    for (const c of (notifications as any).activeCampaigns.values()) c.scheduledTimeouts.forEach(clearTimeout);
  });

  it('inbound webhook: cancellation → email wave → "I will take it" → booking + signed callback + owner email', async () => {
    await svc.importClients(userId, 'name,email,service\nAna,ana@c.test,Cut\nBea,bea@c.test,Cut\nCarl,carl@c.test,Color\nCancel,cancel@c.test,Cut\n');
    const { url, token } = await svc.setupWebhook(userId, { businessName: 'Salon X', timezone: 'America/New_York', callbackUrl: 'https://8.8.8.8/hook' });
    expect(url).toContain(`/hooks/inbound/${token}`);

    const startAt = new Date(Date.now() + 5 * H).toISOString();
    const res = await svc.handleInbound(token, { event: 'appointment.cancelled', start_at: startAt, duration_minutes: 45, service: 'Cut', customer_email: 'cancel@c.test', external_id: 'ext-1' });
    expect(res).toMatchObject({ received: true, duplicate: false });
    expect(await svc.handleInbound(token, { event: 'appointment.cancelled', start_at: startAt, external_id: 'ext-1' })).toMatchObject({ duplicate: true });

    const slot = await prisma.openSlot.findFirstOrThrow({ where: { userId } });
    expect(slot).toMatchObject({ provider: 'webhook', durationMinutes: 45, serviceVariationId: 'Cut' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).totalCancellations).toBe(1);

    await sleep(80); // first wave fires with 0 delay
    const sent: any[] = sendMock.mock.calls.flatMap((c) => c[0]);
    const recipients = sent.map((m) => m.to).sort();
    expect(recipients).toEqual(['ana@c.test', 'bea@c.test']); // not Carl (Color), not the person who cancelled

    await notifications.handleEmailReply('Ana <ana@c.test>', `${slot.gapletSlotId}@gaplets.com`, 'I will take it');

    const log = await prisma.replacementLog.findFirstOrThrow({ where: { userId } });
    expect(log).toMatchObject({ clientEmail: 'ana@c.test', provider: 'webhook' });
    expect((await prisma.openSlot.findUniqueOrThrow({ where: { id: slot.id } })).isTaken).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).totalReplacements).toBe(1);

    const cb = fetchCalls.find((c) => c.url === 'https://8.8.8.8/hook')!;
    expect(cb).toBeDefined();
    const integ = await prisma.connectedIntegration.findFirstOrThrow({ where: { userId } });
    const expected = crypto.createHmac('sha256', callbackSecret(integ.id)).update(cb.init.body).digest('hex');
    expect(cb.init.headers['X-Gaplet-Signature']).toBe(`sha256=${expected}`);
    expect(JSON.parse(cb.init.body)).toMatchObject({ event: 'slot.claimed', slot_id: slot.gapletSlotId, client: { email: 'ana@c.test' } });

    const mails: any[] = sendMock.mock.calls.flatMap((c) => c[0]);
    expect(mails.some((m) => m.to === 'owner@salon.test' && /claimed/.test(m.text))).toBe(true);

    // a second responder gets the "already taken" path and nothing is double-booked
    await notifications.handleEmailReply('Bea <bea@c.test>', `${slot.gapletSlotId}@gaplets.com`, 'I will take it');
    expect(await prisma.replacementLog.count({ where: { userId } })).toBe(1);

    notifications.getCampaign(slot.gapletSlotId)?.scheduledTimeouts.forEach(clearTimeout);
  });

  it('inbound webhook rejects bad tokens, bad payloads and rate-limits abuse', async () => {
    const { token } = await svc.setupWebhook(userId, {});
    await expect(svc.handleInbound('gp_wrong', { event: 'cancelled' })).rejects.toThrow(/Invalid token/);
    await expect(svc.handleInbound(token, { event: 'appointment.booked', start_at: new Date().toISOString() })).rejects.toThrow(/Unsupported/);
    await expect(svc.handleInbound(token, { event: 'cancelled', start_at: 'nope' })).rejects.toThrow(/start_at/);
    await expect(svc.handleInbound(token, { event: 'cancelled', start_at: new Date(Date.now() + 9 * H).toISOString(), duration_minutes: 99999 })).rejects.toThrow(/duration/);
    // rotating the token invalidates the previous one
    const { token: t2 } = await svc.setupWebhook(userId, {});
    await expect(svc.handleInbound(token, { event: 'cancelled' })).rejects.toThrow(/Invalid token/);
    expect(t2).not.toBe(token);
    let limited = false;
    for (let i = 0; i < 130 && !limited; i++) {
      try { await svc.handleInbound(t2, { event: 'x' }); } catch (e: any) { limited = e.getStatus?.() === 429; }
    }
    expect(limited).toBe(true);
  });

  it('rejects private callback URLs (SSRF)', async () => {
    await expect(svc.setupWebhook(userId, { callbackUrl: 'https://169.254.169.254/x' })).rejects.toThrow(/callbackUrl/);
    await expect(svc.setupWebhook(userId, { timezone: 'Mars/Base' })).rejects.toThrow(/timezone/);
  });

  it('ICS: baseline, detects a disappeared appointment once, suppresses bulk changes, surfaces feed errors', async () => {
    feed.text = ics([{ uid: 'a', startH: 5 }, { uid: 'b', startH: 6 }, { uid: 'c', startH: 30 }]);
    expect(await svc.setupIcs(userId, 'webcal://8.8.8.8/cal.ics', { timezone: 'UTC' })).toMatchObject({ eventsFound: 3 });
    const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });

    expect(await svc.pollOne(await get())).toMatchObject({ freed: 0 });
    feed.text = ics([{ uid: 'a', startH: 5 }, { uid: 'c', startH: 30 }]); // b disappeared
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    expect(await prisma.openSlot.count({ where: { userId, providerBookingId: 'b' } })).toBe(1);
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 0 }); // no duplicate on next poll

    // bulk disappearance is treated as a feed glitch
    const many = Array.from({ length: MAX_FREED_PER_POLL + 3 }, (_, i) => ({ uid: `m${i}`, startH: 8 + i }));
    feed.text = ics([{ uid: 'a', startH: 5 }, { uid: 'c', startH: 30 }, ...many]);
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 0 }); // additions never message anyone
    feed.text = ics([]);
    const r = await svc.pollOne(await get());
    expect(r).toMatchObject({ freed: 0, suppressed: true });
    expect((await get()).lastError).toMatch(/disappeared at once/);
    expect(await prisma.openSlot.count({ where: { userId } })).toBe(1);

    feed.text = '<html>502 Bad Gateway</html>';
    await expect(svc.pollOne(await get())).rejects.toThrow(/did not return an ICS/);
    expect((await get()).lastError).toMatch(/did not return an ICS/);
  });

  it('Google Calendar: refreshes token, diffs events, books by inserting a calendar event', async () => {
    await prisma.connectedIntegration.create({
      data: { userId, provider: 'google', accessToken: 'old', refreshToken: 'rt', expiresAt: new Date(Date.now() - 1000), calendarId: 'primary', config: { timezone: 'UTC' } },
    });
    await svc.importClients(userId, 'name,email\nAna,ana@c.test\n');
    const ev = (id: string, h: number, email?: string) => ({ id, status: 'confirmed', summary: 'Cut', start: { dateTime: new Date(T0 + h * H).toISOString() }, end: { dateTime: new Date(T0 + (h + 1) * H).toISOString() }, attendees: email ? [{ email, self: false }] : [] });
    let items = [ev('e1', 5, 'cancel@c.test'), ev('e2', 6)];
    global.fetch = jest.fn(async (url: any, init?: any) => {
      const u = String(url);
      fetchCalls.push({ url: u, init });
      if (u.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'new', expires_in: 3600 }));
      if (u.includes('/events?sendUpdates')) return new Response(JSON.stringify({ id: 'created-1' }));
      if (u.includes('/events?')) return new Response(JSON.stringify({ items }));
      return new Response('{}');
    }) as any;
    process.env.GOOGLE_CLIENT_ID = 'id'; process.env.GOOGLE_CLIENT_SECRET = 'sec';

    const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(await svc.pollOne(await get())).toMatchObject({ baseline: true, freed: 0 });
    expect((await get()).accessToken).toBe('new'); // refreshed and persisted
    items = [ev('e2', 6)]; // e1 deleted
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    const slot = await prisma.openSlot.findFirstOrThrow({ where: { userId } });
    expect(slot.provider).toBe('google');

    await sleep(80);
    expect(sendMock.mock.calls.flatMap((c) => c[0]).map((m: any) => m.to)).toContain('ana@c.test');
    await notifications.handleEmailReply('Ana <ana@c.test>', `${slot.gapletSlotId}@gaplets.com`, 'I will take it');
    const insert = fetchCalls.find((c) => c.url.includes('/events?sendUpdates'))!;
    expect(insert).toBeDefined();
    expect(JSON.parse(insert.init.body).attendees).toEqual([{ email: 'ana@c.test' }]);
    expect((await prisma.replacementLog.findFirstOrThrow({ where: { userId } })).providerBookingId).toBe('created-1');
    notifications.getCampaign(slot.gapletSlotId)?.scheduledTimeouts.forEach(clearTimeout);
  });
});
