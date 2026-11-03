/** Real Postgres; vendor HTTP, SendGrid and Twilio simulated at the network boundary. */
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
const at = (h: number) => new Date(T0 + h * H);
const iso = (h: number) => at(h).toISOString();
const wall = (h: number) => iso(h).slice(0, 19).replace('T', ' '); // UTC wall clock "YYYY-MM-DD HH:mm:ss"
/** A booking keeps its hour whatever its position in the list (otherwise removing one would 'move' the rest). */
const off = (id: string) => 4 + Number(id.slice(3));
const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

run('wodify, pabau, shopmonkey, workiz and pushpress (real database)', () => {
  const prisma = new PrismaManagerService();
  const raw = new PrismaClient();
  let notifications: NotificationService;
  let svc: ConnectorsService;
  let userId: string;
  const realFetch = global.fetch;
  const calls: { url: string; init?: any }[] = [];
  let routes: [RegExp, (u: string, i?: any) => any][] = [];
  const on = (re: RegExp, fn: (u: string, i?: any) => any) => routes.unshift([re, fn]);
  const get = () => prisma.connectedIntegration.findUniqueOrThrow({ where: { userId } });

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    process.env.ENABLE_UNVERIFIED_PROVIDERS = 'true';
    process.env.TWILIO_ACCOUNT_SID = 'AC' + 'a'.repeat(32); process.env.TWILIO_AUTH_TOKEN = 'x';
    process.env.SENDGRID_API_KEY = 'SG.x'; process.env.SENDGRID_DOMAIN = 'gaplets.test';
    process.env.API_BASE_URL = 'https://api.gaplets.test';
    notifications = new NotificationService(prisma);
    svc = new ConnectorsService(prisma, notifications, new JwtService({}));
  });
  afterAll(async () => { delete process.env.ENABLE_UNVERIFIED_PROVIDERS; await prisma.$disconnect(); await raw.$disconnect(); });

  beforeEach(async () => {
    sendMock.mockClear(); calls.length = 0; routes = [];
    global.fetch = jest.fn(async (url: any, init?: any) => {
      calls.push({ url: String(url), init });
      const r = routes.find(([re]) => re.test(String(url)));
      const out = r ? r[1](String(url), init) : null;
      return out instanceof Response ? out : out ? new Response(JSON.stringify(out), { status: 200 }) : new Response('{}', { status: 404 });
    }) as any;
    await raw.replacementLog.deleteMany(); await raw.openSlot.deleteMany(); await raw.client.deleteMany();
    await raw.userPreference.deleteMany(); await raw.connectedIntegration.deleteMany(); await raw.user.deleteMany();
    userId = (await raw.user.create({ data: { email: 'owner@gym.test', name: 'Gym X', role: 'STARTER', preferences: { create: { matchAppointmentType: false } } } })).id;
    await svc.importClients(userId, 'name,email\nAna,ana@c.test\n');
  });
  afterEach(() => {
    global.fetch = realFetch;
    for (const c of (notifications as any).activeCampaigns.values()) c.scheduledTimeouts.forEach(clearTimeout);
  });

  // ───────────────────────────── the four polled vendors ─────────────────────────────
  type Case = { key: string; values: Record<string, string>; ok: RegExp; list: RegExp; page: (ids: string[]) => any; badBody: any; storedSecret: string };
  const cases: Case[] = [
    { key: 'wodify', values: { apiKey: 'WK' }, storedSecret: 'WK', ok: /appointments\/bookings\/clients\?page=1/, list: /clients\/search/,
      page: (ids) => ({ client_appointment_bookings: ids.map((id) => ({ booking_id: id, utc_appointment_start_datetime: iso(off(id)), utc_appointment_end_datetime: iso(off(id) + 1), service: 'PT', booking_status: 'Confirmed' })), pagination: { has_more: false } }),
      badBody: { message: 'maintenance' } },
    { key: 'pabau', values: { apiKey: 'PK' }, storedSecret: 'PK', ok: /per_page=1&page=1/, list: /\/appointments\?start_date/,
      page: (ids) => ({ status: true, total: ids.length, appointments: ids.map((id) => ({ details: { appointment_id: id, appointment_status: 'waiting' }, client: [{ Email: 'gone@c.test' }], service: [{ service: 'Facial' }], dates: { start_date: wall(off(id)).slice(0, 10), start_time: wall(off(id)).slice(11), end_date: wall(off(id) + 1).slice(0, 10), end_time: wall(off(id) + 1).slice(11) } })) }),
      badBody: { status: true } },
    { key: 'shopmonkey', values: { apiKey: 'SMK' }, storedSecret: 'SMK', ok: /appointment\?limit=1/, list: /appointment\/search/,
      page: (ids) => ({ success: true, data: ids.map((id) => ({ id, name: 'Oil', startDate: iso(off(id)), endDate: iso(off(id) + 1), allDay: false, customer: { emails: [{ email: 'gone@c.test' }] } })) }),
      badBody: { success: false, message: 'Invalid where' } },
    { key: 'workiz', values: { apiToken: 'WZK' }, storedSecret: 'WZK', ok: /records=1&only_open=true/, list: /job\/all\/\?start_date/,
      page: (ids) => ({ flag: true, data: ids.map((id) => ({ UUID: id, JobDateTime: wall(off(id)), JobEndDateTime: wall(off(id) + 1), Status: 'Submitted', Timezone: 'UTC', Email: 'gone@c.test', JobType: 'Fix' })) }),
      badBody: { flag: true, data: { UUID: 'single' } } },
  ];

  it.each(cases)('$key: connect (key stored ENCRYPTED), baseline, detects the cancelled one, invites others, bad bodies never create slots', async (c) => {
    on(c.ok, () => c.page([]));
    await svc.connectApiKey(userId, c.key, c.values);
    const stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(stored.provider).toBe(c.key);
    expect(isEncrypted(stored.accessToken)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(c.storedSecret);
    await svc.updateSettings(userId, { timezone: 'UTC', businessName: 'Gym X' });

    on(c.list, () => c.page(['id-1', 'id-2', 'id-3']));
    expect(await svc.pollOne(await get())).toMatchObject({ baseline: true, freed: 0 });

    on(c.list, () => c.badBody); // 200 with a wrong shape / failure flag
    await expect(svc.pollOne(await get())).rejects.toThrow();
    expect(await raw.openSlot.count({ where: { userId } })).toBe(0);
    expect((await get()).lastError).toBeTruthy();

    on(c.list, () => c.page(['id-1', 'id-3'])); // id-2 cancelled
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    expect(await raw.openSlot.findFirstOrThrow({ where: { userId } })).toMatchObject({ provider: c.key, providerBookingId: 'id-2' });
    await sleep(80);
    expect(sendMock.mock.calls.flatMap((x) => x[0]).map((m: any) => m.to)).toContain('ana@c.test');
  });

  it('workiz: a job marked Done in the future is NOT a cancellation; Canceled is', async () => {
    on(/records=1&only_open=true/, () => ({ flag: true, data: [] }));
    await svc.connectApiKey(userId, 'workiz', { apiToken: 'WZK' });
    await svc.updateSettings(userId, { timezone: 'UTC' });
    const job = (id: string, h: number, Status: string) => ({ UUID: id, JobDateTime: wall(h), JobEndDateTime: wall(h + 1), Status, Timezone: 'UTC' });
    on(/job\/all\/\?start_date/, () => ({ flag: true, data: [job('a', 5, 'Submitted'), job('b', 6, 'Submitted')] }));
    await svc.pollOne(await get());
    on(/job\/all\/\?start_date/, () => ({ flag: true, data: [job('a', 5, 'Done'), job('b', 6, 'Canceled')] }));
    expect(await svc.pollOne(await get())).toMatchObject({ freed: 1 });
    expect((await raw.openSlot.findFirstOrThrow({ where: { userId } })).providerBookingId).toBe('b');
  });

  it('refuses to connect when unverified providers are not enabled', async () => {
    process.env.ENABLE_UNVERIFIED_PROVIDERS = 'false';
    await expect(svc.connectApiKey(userId, 'wodify', { apiKey: 'K' })).rejects.toThrow(/not enabled/);
    process.env.ENABLE_UNVERIFIED_PROVIDERS = 'true';
  });

  // ─────────────────────────────────── pushpress (webhook) ───────────────────────────────────
  it('pushpress: registers a webhook with a secret URL token, never stores the token, ignores/rejects bad events, drops the webhook on reconnect and disconnect', async () => {
    let n = 0;
    on(/api\.pushpress\.com\/v3\/webhooks$/, (_u, i) => i?.method === 'POST'
      ? new Response(JSON.stringify({ id: `wh_${++n}`, active: true, signingSecret: `SEC${n}` }), { status: 201 })
      : []);
    on(/webhooks\/wh_\d$/, () => ({}));

    await expect(svc.connectApiKey(userId, 'pushpress', { apiKey: 'K' })).rejects.toThrow(/both/);
    await svc.connectApiKey(userId, 'pushpress', { apiKey: 'PPK', companyId: 'C1' });
    const reg = calls.find((c) => c.init?.method === 'POST')!;
    const hookUrl: string = JSON.parse(reg.init.body).url;
    expect(hookUrl).toMatch(/^https:\/\/api\.gaplets\.test\/hooks\/native\/pushpress\/gp_[0-9a-f]{48}$/);
    const token1 = hookUrl.split('/').pop()!;
    expect(JSON.parse(reg.init.body).eventTypes).toEqual(['appointment.canceled']);

    let stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(stored).toMatchObject({ provider: 'pushpress', webhookId: 'wh_1', externalUserId: sha(token1) });
    expect(JSON.stringify(stored)).not.toContain(token1);
    expect(isEncrypted((stored.config as any).extra.signingSecretEnc)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('SEC1');
    expect((stored.config as any).extra.companyId).toBe('C1');

    // authentication and routing
    const cancel = { type: 'appointment.canceled', data: { id: 'appt-9', startTimestamp: Math.floor(at(6).getTime() / 1000), type: { name: 'Intro' } } };
    await expect(svc.handleNativeWebhook('pushpress', 'gp_wrong', cancel)).rejects.toThrow(/Invalid token/);
    await expect(svc.handleNativeWebhook('wodify', token1, cancel)).rejects.toThrow(); // not a webhook provider
    await expect(svc.handleNativeWebhook('nope', token1, cancel)).rejects.toThrow();

    // ignored event: no slot
    expect(await svc.handleNativeWebhook('pushpress', token1, { type: 'appointment.scheduled', data: { id: 'x' } })).toMatchObject({ ignored: true });
    expect(await raw.openSlot.count({ where: { userId } })).toBe(0);

    // malformed cancellation: 400, no slot, visible error
    await expect(svc.handleNativeWebhook('pushpress', token1, { type: 'appointment.canceled', data: { id: 'z' } })).rejects.toThrow(/Unexpected payload/);
    expect(await raw.openSlot.count({ where: { userId } })).toBe(0);
    expect((await get()).lastError).toMatch(/startTimestamp/);

    // valid cancellation → slot + invitations; duplicates ignored
    expect(await svc.handleNativeWebhook('pushpress', token1, cancel)).toMatchObject({ received: true, duplicate: false });
    expect(await svc.handleNativeWebhook('pushpress', token1, cancel)).toMatchObject({ duplicate: true });
    expect(await raw.openSlot.findFirstOrThrow({ where: { userId } })).toMatchObject({ provider: 'pushpress', providerBookingId: 'appt-9', durationMinutes: 60, serviceVariationId: 'Intro' });
    await sleep(80);
    expect(sendMock.mock.calls.flatMap((x) => x[0]).map((m: any) => m.to)).toContain('ana@c.test');

    // the poller never tries to poll a webhook-only vendor
    const errSpy = jest.spyOn((svc as any).log, 'error');
    await svc.pollAll();
    expect(errSpy).not.toHaveBeenCalled();
    await expect(svc.pollOne(await get())).rejects.toThrow(/nothing to poll/);

    // reconnecting rotates the token and removes the old subscription
    await svc.connectApiKey(userId, 'pushpress', { apiKey: 'PPK', companyId: 'C1' });
    expect(calls.some((c) => c.init?.method === 'DELETE' && /webhooks\/wh_1$/.test(c.url))).toBe(true);
    await expect(svc.handleNativeWebhook('pushpress', token1, cancel)).rejects.toThrow(/Invalid token/);
    stored = await raw.connectedIntegration.findUniqueOrThrow({ where: { userId } });
    expect(stored.webhookId).toBe('wh_2');

    // disconnect removes the subscription at PushPress too
    await svc.disconnect(userId);
    expect(calls.some((c) => c.init?.method === 'DELETE' && /webhooks\/wh_2$/.test(c.url))).toBe(true);
    expect(await raw.connectedIntegration.count({ where: { userId } })).toBe(0);
  });

  it('pushpress: a failing registration is reported and nothing is saved; a non-https API_BASE_URL is refused', async () => {
    on(/api\.pushpress\.com\/v3\/webhooks$/, (_u, i) => i?.method === 'POST' ? new Response(JSON.stringify({ message: 'url not reachable' }), { status: 422 }) : []);
    await expect(svc.connectApiKey(userId, 'pushpress', { apiKey: 'K', companyId: 'C' })).rejects.toThrow(/Could not register the PushPress webhook.*422/);
    expect(await raw.connectedIntegration.count({ where: { userId } })).toBe(0);
    const base = process.env.API_BASE_URL;
    process.env.API_BASE_URL = 'http://localhost:4000';
    await expect(svc.connectApiKey(userId, 'pushpress', { apiKey: 'K', companyId: 'C' })).rejects.toThrow(/public https/);
    process.env.API_BASE_URL = base;
  });
});
