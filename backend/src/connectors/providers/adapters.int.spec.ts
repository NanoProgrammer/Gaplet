/** Real Postgres; vendor HTTP, SendGrid and Twilio are simulated at the network boundary. */
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

const sendMock = jest.fn().mockResolvedValue([{}]);
jest.mock('@sendgrid/mail', () => ({ setApiKey: jest.fn(), send: (...a: any[]) => sendMock(...a) }));
jest.mock('twilio', () => () => ({ messages: { create: jest.fn().mockResolvedValue({}) } }));

import { PrismaManagerService } from '../../prisma-manager/prisma-manager.service';
import { isEncrypted } from '../../prisma-manager/crypto-box';
import { NotificationService } from '../../webhooks/webhook.service';
import { ConnectorsService } from '../connectors.service';

const run = process.env.DATABASE_URL ? describe : describe.skip;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const H = 3600e3;
const T0 = Math.floor(Date.now() / 60000) * 60000;
const iso = (h: number) => new Date(T0 + h * H).toISOString();

run('native providers (real database)', () => {
  const prisma = new PrismaManagerService();
  const raw = new PrismaClient();
  let notifications: NotificationService;
  let svc: ConnectorsService;
  let userId: string;
  const realFetch = global.fetch;
  const calls: { url: string; init?: any }[] = [];
  let routes: [RegExp, (u: string, i?: any) => any][] = [];
  const on = (re: RegExp, fn: (u: string, i?: any) => any) => routes.unshift([re, fn]);

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32); process.env.TWILIO_AUTH_TOKEN = 'x';
    process.env.SENDGRID_API_KEY = 'SG.x'; process.env.SENDGRID_DOMAIN = 'gaplets.test';
    process.env.API_BASE_URL = 'https://api.gaplets.test'; process.env.FRONTEND_ORIGIN = 'https://app.gaplets.test';
    process.env.MICROSOFT_CLIENT_ID = 'ms-id'; process.env.MICROSOFT_CLIENT_SECRET = 'ms-secret';
    notifications = new NotificationService(prisma);
    svc = new ConnectorsService(prisma, notifications, new JwtService({}));
  });
  afterAll(async () => { await prisma.$disconnect(); await raw.$disconnect(); });

  beforeEach(async () => {
    sendMock.mockClear(); calls.length = 0; routes = [];
    global.fetch = jest.fn(async (url: any, init?: any) => {
      calls.push({ url: String(url), init });
      const r = routes.find(([re]) => re.test(String(url)));
      return r ? new Response(JSON.stringify(r[1](String(url), init)), { status: 200 }) : new Response('{}', { status: 404 });
    }) as any;
    await raw.replacementLog.deleteMany(); await raw.openSlot.deleteMany(); await raw.client.deleteMany();
    await raw.userPreference.deleteMany(); await raw.connectedIntegration.deleteMany(); await raw.user.deleteMany();
    userId = (await raw.user.create({ data: { email: 'owner@salon.test', name: 'Clinic X', role: 'STARTER', preferences: { create: { matchAppointmentType: false } } } })).id;
  });
  afterEach(() => {
    global.fetch = realFetch;
    for (const c of (notifications as any).activeCampaigns.values()) c.scheduledTimeouts.forEach(clearTimeout);
  });

  it('lists providers and flags OAuth ones that are not configured', () => {
    const list = svc.listProviders();
    expect(list.map((p) => p.key).sort()).toEqual(['calcom', 'calendly', 'cliniko', 'clio', 'jobber', 'microsoft', 'opendental', 'zoho']);
    // unverified providers stay off even if credentials exist, until explicitly enabled
    expect(list.find((p) => p.key === 'jobber')).toMatchObject({ maturity: 'unverified', available: false });
    expect(() => svc.startOAuth(userId, 'jobber')).toThrow(/not configured/);
    expect(list.find((p) => p.key === 'microsoft')).toMatchObject({ available: true, auth: 'oauth2', maturity: 'beta' });
    expect(list.find((p) => p.key === 'calendly')!.available).toBe(false); // no CALENDLY_* in this test
    expect(list.find((p) => p.key === 'cliniko')).toMatchObject({ available: true, auth: 'apikey' });
    expect(() => svc.startOAuth(userId, 'calendly')).toThrow(/not configured/);
  });

  it('Cliniko: validates the key, stores it ENCRYPTED, syncs clients, detects a cancellation and refills it', async () => {
    on(/cliniko\.com\/v1\/user/, () => ({ id: 1 }));
    await expect(svc.connectApiKey(userId, 'cliniko', { apiKey: 'garbage' })).rejects.toThrow(/does not look like/);
    await svc.connectApiKey(userId, 'cliniko', { apiKey: 'secretkey-au2' });
    const stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(stored.provider).toBe('cliniko');
    expect(isEncrypted(stored.accessToken)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('secretkey');
    expect((stored.config as any).extra.shard).toBe('au2');

    let appts = [
      { id: 1, starts_at: iso(5), ends_at: iso(6), appointment_type: { name: 'Physio' }, patient: { links: { self: 'https://x/patients/10' } } },
      { id: 2, starts_at: iso(7), ends_at: iso(8), appointment_type: { name: 'Physio' }, patient: { links: { self: 'https://x/patients/11' } } },
    ];
    on(/individual_appointments\?/, () => ({ individual_appointments: appts }));
    on(/patients\/10/, () => ({ email: 'cancel@c.test' }));
    on(/patients\/11/, () => ({ email: 'other@c.test' }));
    on(/patients\?/, () => ({ patients: [
      { first_name: 'Ana', last_name: 'Ruiz', email: 'ana@c.test' },
      { first_name: 'Cancel', last_name: 'Er', email: 'cancel@c.test' },
    ], links: {} }));

    const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(await svc.pollOne(await get())).toMatchObject({ baseline: true, freed: 0 });
    expect(await raw.client.count({ where: { userId } })).toBe(2); // synced from Cliniko
    const syncCalls = calls.filter((c) => /patients\?/.test(c.url)).length;

    appts = [appts[1]]; // appointment 1 cancelled
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    expect(calls.filter((c) => /patients\?/.test(c.url)).length).toBe(syncCalls); // client sync throttled (6h)
    const slot = await raw.openSlot.findFirstOrThrow({ where: { userId } });
    expect(slot).toMatchObject({ provider: 'cliniko', providerBookingId: '1' });

    await sleep(80);
    const to = sendMock.mock.calls.flatMap((c) => c[0]).map((m: any) => m.to);
    expect(to).toContain('ana@c.test');
    expect(to).not.toContain('cancel@c.test'); // the person who cancelled is not invited

    // Cliniko cannot book (not mapped): the owner is told instead of the client being refused
    await notifications.handleEmailReply('Ana <ana@c.test>', `${slot.gapletSlotId}@gaplets.com`, 'I will take it');
    expect(await raw.replacementLog.count({ where: { userId } })).toBe(1);
    expect((await raw.replacementLog.findFirstOrThrow({ where: { userId } })).providerBookingId).toMatch(/^manual-/);
    expect(sendMock.mock.calls.flatMap((c) => c[0]).some((m: any) => m.to === 'owner@salon.test' && /booking system/.test(m.text))).toBe(true);
  });

  it('Microsoft: signed OAuth state, token stored encrypted, then a real booking is created in Outlook', async () => {
    const { redirectUrl } = svc.startOAuth(userId, 'microsoft');
    const u = new URL(redirectUrl);
    expect(u.searchParams.get('redirect_uri')).toBe('https://api.gaplets.test/connectors/oauth/microsoft/callback');
    const state = u.searchParams.get('state')!;

    await expect(svc.finishOAuth('microsoft', 'CODE', 'forged-state')).rejects.toThrow(/Invalid or expired/);
    const otherProviderState = new JwtService({}).sign({ sub: userId, purpose: 'oauth-state', provider: 'clio' }, { secret: 'test-secret' });
    await expect(svc.finishOAuth('microsoft', 'CODE', otherProviderState)).rejects.toThrow(/Invalid or expired/);

    on(/oauth2\/v2\.0\/token/, () => ({ access_token: 'MS-AT', refresh_token: 'MS-RT', expires_in: 3600 }));
    await svc.finishOAuth('microsoft', 'CODE', state);
    const stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(stored).toMatchObject({ provider: 'microsoft' });
    expect(isEncrypted(stored.accessToken) && isEncrypted(stored.refreshToken!)).toBe(true);

    await svc.importClients(userId, 'name,email\nAna,ana@c.test\n');
    let events = [
      { id: 'ev1', subject: 'Massage', start: { dateTime: iso(5).replace('Z', '') }, end: { dateTime: iso(6).replace('Z', '') }, attendees: [{ emailAddress: { address: 'gone@c.test' } }] },
    ];
    on(/calendarView/, () => ({ value: events }));
    on(/\/me\/events$/, () => ({ id: 'outlook-created-1' }));
    const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    await svc.updateSettings(userId, { timezone: 'UTC', businessName: 'Clinic X' });
    await svc.pollOne(await get());
    events = []; // cancelled
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    const slot = await raw.openSlot.findFirstOrThrow({ where: { userId } });

    await sleep(80);
    await notifications.handleEmailReply('Ana <ana@c.test>', `${slot.gapletSlotId}@gaplets.com`, 'I will take it');
    const create = calls.find((c) => /\/me\/events$/.test(c.url))!;
    expect(create).toBeDefined();
    expect(create.init.headers.Authorization).toBe('Bearer MS-AT'); // decrypted for the call
    expect(JSON.parse(create.init.body).attendees[0].emailAddress.address).toBe('ana@c.test');
    expect((await raw.replacementLog.findFirstOrThrow({ where: { userId } })).providerBookingId).toBe('outlook-created-1');
    expect((await raw.openSlot.findUniqueOrThrow({ where: { id: slot.id } })).isTaken).toBe(true);
  });

  it('a malformed vendor response never creates false cancellations or messages anyone', async () => {
    await prisma.connectedIntegration.create({ data: { userId, provider: 'microsoft', accessToken: 'AT', refreshToken: 'RT', expiresAt: new Date(Date.now() + 3600e3), config: {} } });
    await svc.importClients(userId, 'name,email\nAna,ana@c.test\n');
    const ev = (id: string, h: number) => ({ id, subject: 'x', start: { dateTime: iso(h).replace('Z', '') }, end: { dateTime: iso(h + 1).replace('Z', '') }, attendees: [] });
    on(/calendarView/, () => ({ value: [ev('a', 5), ev('b', 6), ev('c', 7)] }));
    const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    await svc.pollOne(await get()); // baseline of 3 appointments
    on(/calendarView/, () => ({ message: 'Service is being upgraded' })); // HTTP 200, wrong shape
    await expect(svc.pollOne(await get())).rejects.toThrow(/unexpected response/);
    expect(await raw.openSlot.count({ where: { userId } })).toBe(0);
    expect((await get()).lastError).toMatch(/unexpected response/);
    await sleep(60);
    expect(sendMock).not.toHaveBeenCalled();
    // and the snapshot survives, so the next good poll still sees the 3 appointments
    on(/calendarView/, () => ({ value: [ev('a', 5), ev('b', 6), ev('c', 7)] }));
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 0 });
  });

  it('refreshes an expired Microsoft token during polling and persists it encrypted', async () => {
    await prisma.connectedIntegration.create({ data: { userId, provider: 'microsoft', accessToken: 'OLD', refreshToken: 'RT', expiresAt: new Date(Date.now() - 1000), config: {} } });
    on(/oauth2\/v2\.0\/token/, () => ({ access_token: 'FRESH', refresh_token: 'RT2', expires_in: 3600 }));
    on(/calendarView/, () => ({ value: [] }));
    await svc.pollOne(await prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } }));
    expect(calls.find((c) => /calendarView/.test(c.url))!.init.headers.Authorization).toBe('Bearer FRESH');
    const stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(isEncrypted(stored.accessToken)).toBe(true);
    expect((await prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } })).accessToken).toBe('FRESH');
  });
});
