import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, UnauthorizedException, HttpException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaManagerService } from '../prisma-manager/prisma-manager.service';
import { NotificationService } from '../webhooks/webhook.service';
import { CalEvent, FreedSlot, detectFreedSlots, toSnapshot, SnapshotEvent } from './calendar-diff';
import { parseClients } from './csv';
import { getGoogleAccessToken, listGoogleEvents } from './google';
import { parseIcs } from './ics';
import { callbackSecret } from './callback-secret';
import { assertPublicHttpsUrl, safeFetchText } from './net-guard';

export const GENERIC_PROVIDERS = ['google', 'ics', 'webhook'] as const;
export type GenericProvider = (typeof GENERIC_PROVIDERS)[number];
export const isGenericProvider = (p: string): p is GenericProvider => (GENERIC_PROVIDERS as readonly string[]).includes(p);

const LOOKAHEAD_MS = 4 * 24 * 60 * 60 * 1000;
/** If one poll frees more slots than this, assume a feed glitch / bulk edit and do not message anyone. */
export const MAX_FREED_PER_POLL = 10;

export type ConnectorConfig = {
  businessName?: string;
  timezone?: string;
  callbackUrl?: string;
  icsUrl?: string;
  snapshot?: SnapshotEvent[];
};

export type InboundCancellation = {
  externalId?: string;
  start: Date;
  durationMinutes: number;
  service?: string;
  customerEmail?: string;
};

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export function validTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

@Injectable()
export class ConnectorsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Connectors');
  private timer?: NodeJS.Timeout;
  private polling = false;
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaManagerService,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit() {
    if (process.env.CONNECTORS_POLLING === 'off') return;
    const every = Math.max(30, Number(process.env.CONNECTORS_POLL_SECONDS) || 120) * 1000;
    this.timer = setInterval(() => void this.pollAll(), every);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  // ───────────────────────────── configuration ─────────────────────────────

  private cfg(integ: { config: any }): ConnectorConfig { return (integ.config ?? {}) as ConnectorConfig; }

  private async sanitizeSettings(s: { businessName?: string; timezone?: string; callbackUrl?: string }) {
    const out: Partial<ConnectorConfig> = {};
    if (s.businessName !== undefined) out.businessName = s.businessName.trim().slice(0, 80) || undefined;
    if (s.timezone !== undefined) {
      if (s.timezone && !validTimezone(s.timezone)) throw new BadRequestException('Invalid timezone (use an IANA name like America/New_York)');
      out.timezone = s.timezone || undefined;
    }
    if (s.callbackUrl !== undefined) {
      if (s.callbackUrl) {
        try { await assertPublicHttpsUrl(s.callbackUrl); } catch (e: any) { throw new BadRequestException(`callbackUrl: ${e.message}`); }
      }
      out.callbackUrl = s.callbackUrl || undefined;
    }
    return out;
  }

  private async save(userId: string, provider: GenericProvider, data: { config: ConnectorConfig; externalUserId?: string | null; accessToken?: string }) {
    const base = {
      provider,
      accessToken: data.accessToken ?? '',
      refreshToken: null,
      expiresAt: null,
      scope: null,
      externalUserId: data.externalUserId ?? null,
      externalOrgId: null,
      webhookId: null,
      lastError: null,
      lastSyncAt: null,
      disconnectedAt: null,
      config: data.config as any,
    };
    return this.prisma.connectedIntegration.upsert({ where: { userId }, update: base, create: { userId, ...base } });
  }

  async setupWebhook(userId: string, settings: { businessName?: string; timezone?: string; callbackUrl?: string }) {
    const token = `gp_${crypto.randomBytes(24).toString('hex')}`;
    const config = await this.sanitizeSettings(settings);
    await this.save(userId, 'webhook', { config, externalUserId: sha256(token) });
    return { url: this.inboundUrl(token), token, note: 'Store this URL now: it is shown only once. Running setup again rotates it.' };
  }

  private inboundUrl(token: string) {
    return `${(process.env.API_BASE_URL ?? '').replace(/\/$/, '')}/hooks/inbound/${token}`;
  }

  async setupIcs(userId: string, url: string, settings: { businessName?: string; timezone?: string; callbackUrl?: string }) {
    const icsUrl = (await assertPublicHttpsUrl(url).catch((e) => { throw new BadRequestException(e.message); })).toString();
    const now = new Date();
    let events: CalEvent[];
    try { events = await this.fetchIcsEvents(icsUrl, now); }
    catch (e: any) { throw new BadRequestException(`Could not read that calendar feed: ${e.message}`); }
    const config: ConnectorConfig = { ...(await this.sanitizeSettings(settings)), icsUrl, snapshot: toSnapshot(events) };
    await this.save(userId, 'ics', { config });
    await this.prisma.connectedIntegration.update({ where: { userId }, data: { lastSyncAt: now } });
    return { ok: true, eventsFound: events.length };
  }

  async updateSettings(userId: string, settings: { businessName?: string; timezone?: string; callbackUrl?: string }) {
    const integ = await this.requireGeneric(userId);
    const patch = await this.sanitizeSettings(settings);
    await this.prisma.connectedIntegration.update({ where: { id: integ.id }, data: { config: { ...this.cfg(integ), ...patch } as any } });
    return { ok: true };
  }

  private async requireGeneric(userId: string) {
    const integ = await this.prisma.connectedIntegration.findUnique({ where: { userId } });
    if (!integ || !isGenericProvider(integ.provider)) throw new NotFoundException('No calendar/webhook connector is set up');
    return integ;
  }

  async disconnect(userId: string) {
    const integ = await this.prisma.connectedIntegration.findUnique({ where: { userId } });
    if (!integ) return { ok: true };
    if (integ.provider === 'google' && integ.accessToken) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(integ.refreshToken ?? integ.accessToken)}`, { method: 'POST', signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    }
    await this.prisma.connectedIntegration.delete({ where: { userId } });
    return { ok: true };
  }

  async status(userId: string) {
    const integ = await this.prisma.connectedIntegration.findUnique({ where: { userId } });
    const clients = await this.prisma.client.count({ where: { userId } });
    if (!integ) return { provider: null, clients };
    const c = this.cfg(integ);
    return {
      provider: integ.provider,
      connectedAt: integ.connectedAt,
      lastSyncAt: integ.lastSyncAt,
      lastError: integ.lastError,
      calendarId: integ.calendarId,
      callbackSigningSecret: c.callbackUrl ? callbackSecret(integ.id) : null,
      settings: { businessName: c.businessName ?? null, timezone: c.timezone ?? null, callbackUrl: c.callbackUrl ?? null, icsUrl: c.icsUrl ? c.icsUrl.replace(/(\/\/[^/]+\/).*/, '$1…') : null },
      clients,
    };
  }

  // ─────────────────────────────── clients ────────────────────────────────

  async importClients(userId: string, csv: string) {
    let parsed: ReturnType<typeof parseClients>;
    try { parsed = parseClients(csv); } catch (e: any) { throw new BadRequestException(e.message); }
    let created = 0, updated = 0, failed = 0;
    const CHUNK = 25;
    for (let i = 0; i < parsed.clients.length; i += CHUNK) {
      await Promise.all(parsed.clients.slice(i, i + CHUNK).map(async (c) => {
        const data = { name: c.name, services: c.services, lastApptAt: c.lastApptAt ?? null, nextApptAt: c.nextApptAt ?? null };
        const existing = await this.prisma.client.findFirst({
          where: { userId, OR: [...(c.email ? [{ email: c.email }] : []), ...(c.phone ? [{ phone: c.phone }] : [])] },
        });
        try {
          if (existing) {
            await this.prisma.client.update({ where: { id: existing.id }, data: { ...data, email: c.email ?? existing.email, phone: c.phone ?? existing.phone } });
            updated++;
          } else {
            await this.prisma.client.create({ data: { userId, email: c.email ?? null, phone: c.phone ?? null, ...data } });
            created++;
          }
        } catch { failed++; }
      }));
    }
    return { created, updated, skipped: parsed.skipped + failed, errors: parsed.errors };
  }

  async listClients(userId: string, take = 50, skip = 0) {
    const [total, items] = await Promise.all([
      this.prisma.client.count({ where: { userId } }),
      this.prisma.client.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: Math.min(take, 200), skip, select: { id: true, name: true, email: true, phone: true, services: true, optedOut: true } }),
    ]);
    return { total, items };
  }

  clearClients(userId: string) { return this.prisma.client.deleteMany({ where: { userId } }).then((r) => ({ deleted: r.count })); }

  // ───────────────────────────── Google specifics ─────────────────────────────

  async listGoogleCalendars(userId: string) {
    const integ = await this.prisma.connectedIntegration.findUnique({ where: { userId } });
    if (integ?.provider !== 'google') throw new NotFoundException('Google is not connected');
    const token = await getGoogleAccessToken(this.prisma, integ);
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    const json: any = await res.json();
    if (!res.ok) throw new BadRequestException(json?.error?.message ?? 'Google error');
    return (json.items ?? []).map((c: any) => ({ id: c.id, name: c.summary, primary: !!c.primary, timeZone: c.timeZone }));
  }

  async selectGoogleCalendar(userId: string, calendarId: string) {
    const integ = await this.prisma.connectedIntegration.findUnique({ where: { userId } });
    if (integ?.provider !== 'google') throw new NotFoundException('Google is not connected');
    const cals = await this.listGoogleCalendars(userId);
    const picked = cals.find((c: any) => c.id === calendarId);
    if (!picked) throw new BadRequestException('Calendar not found or not writable');
    // Switching calendar resets the baseline so old events are not reported as cancellations.
    const config = { ...this.cfg(integ), snapshot: undefined, timezone: this.cfg(integ).timezone ?? picked.timeZone };
    await this.prisma.connectedIntegration.update({ where: { id: integ.id }, data: { calendarId, config: config as any, lastError: null } });
    return { ok: true };
  }

  // ───────────────────────────── inbound webhook ─────────────────────────────

  private rateLimit(key: string, max = 120, windowMs = 60_000) {
    const now = Date.now();
    const h = this.hits.get(key);
    if (!h || h.resetAt < now) { this.hits.set(key, { count: 1, resetAt: now + windowMs }); return; }
    if (++h.count > max) throw new HttpException('Too many requests', 429);
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (v.resetAt < now) this.hits.delete(k);
  }

  async handleInbound(token: string, body: any) {
    const integ = await this.prisma.connectedIntegration.findFirst({ where: { provider: 'webhook', externalUserId: sha256(token || '') } });
    if (!integ) throw new UnauthorizedException('Invalid token');
    this.rateLimit(integ.id);

    const event = String(body?.event ?? '').toLowerCase().replace('canceled', 'cancelled');
    if (!['appointment.cancelled', 'cancelled', 'appointment_cancelled'].includes(event)) {
      throw new BadRequestException('Unsupported event. Use "appointment.cancelled".');
    }
    const start = new Date(body?.start_at);
    if (!body?.start_at || isNaN(start.getTime())) throw new BadRequestException('start_at must be an ISO 8601 date-time');
    const duration = body?.duration_minutes === undefined ? 60 : Number(body.duration_minutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) throw new BadRequestException('duration_minutes must be 1-1440');
    const email = typeof body?.customer_email === 'string' && /^[^\s@]+@[^\s@]+$/.test(body.customer_email) ? body.customer_email.toLowerCase() : undefined;

    const result = await this.ingest(integ, {
      externalId: body?.external_id ? String(body.external_id).slice(0, 200) : undefined,
      start,
      durationMinutes: Math.round(duration),
      service: body?.service ? String(body.service).slice(0, 120) : undefined,
      customerEmail: email,
    });
    return { received: true, ...result };
  }

  // ─────────────────────────── ingestion → campaign ───────────────────────────

  async ingest(integ: any, c: InboundCancellation) {
    const provider = integ.provider as GenericProvider;
    const externalId = c.externalId ?? `${provider}:${c.start.toISOString()}`;
    const dupe = await this.prisma.openSlot.findFirst({ where: { userId: integ.userId, provider, providerBookingId: externalId, startAt: c.start } });
    if (dupe) return { duplicate: true };

    const gapletSlotId = crypto.randomUUID();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: integ.userId }, data: { totalCancellations: { increment: 1 }, lastCancellationAt: new Date() } }),
      this.prisma.openSlot.create({
        data: {
          gapletSlotId, provider, providerBookingId: externalId, userId: integ.userId, startAt: c.start,
          durationMinutes: c.durationMinutes, teamMemberId: 'unknown', serviceVariationId: c.service ?? 'unknown', locationId: 'unknown',
        },
      }),
    ]);
    await this.notifications.startCampaign(provider as any, integ, { generic: c }, gapletSlotId);
    return { duplicate: false, slotId: gapletSlotId };
  }

  // ───────────────────────────────── polling ─────────────────────────────────

  private async fetchIcsEvents(url: string, now: Date): Promise<CalEvent[]> {
    const text = await safeFetchText(url);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('The URL did not return an ICS calendar');
    return parseIcs(text, now, new Date(now.getTime() + LOOKAHEAD_MS));
  }

  async pollAll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const integs = await this.prisma.connectedIntegration.findMany({
        where: { provider: { in: ['google', 'ics'] }, user: { role: { not: 'USER' } } },
      });
      for (const integ of integs) await this.pollOne(integ).catch((e) => this.log.error(`poll ${integ.id}: ${e.message}`));
    } finally { this.polling = false; }
  }

  /** Fetches the current events, diffs against the stored snapshot and ingests freed slots. */
  async pollOne(integ: any, now = new Date()): Promise<{ baseline?: boolean; freed: number; suppressed?: boolean }> {
    const config = this.cfg(integ);
    try {
      let events: CalEvent[];
      if (integ.provider === 'ics') {
        if (!config.icsUrl) throw new Error('Missing ICS URL');
        events = await this.fetchIcsEvents(config.icsUrl, now);
      } else {
        const token = await getGoogleAccessToken(this.prisma, integ);
        events = await listGoogleEvents(token, integ.calendarId || 'primary', now, new Date(now.getTime() + LOOKAHEAD_MS));
      }

      let freed: FreedSlot[] = [];
      let suppressed = false;
      const baseline = !config.snapshot;
      if (!baseline) {
        freed = detectFreedSlots(config.snapshot!, events, now);
        if (freed.length > MAX_FREED_PER_POLL) {
          suppressed = true;
          await this.prisma.connectedIntegration.update({ where: { id: integ.id }, data: { lastError: `${freed.length} appointments disappeared at once; ignored as a possible feed error. Nobody was messaged.` } });
          freed = [];
        }
      }
      // Persist snapshot BEFORE ingesting so a crash cannot cause duplicate campaigns on the next poll.
      await this.prisma.connectedIntegration.update({
        where: { id: integ.id },
        data: { config: { ...config, snapshot: toSnapshot(events) } as any, lastSyncAt: now, ...(suppressed ? {} : { lastError: null }) },
      });
      for (const f of freed) {
        const minutes = Math.max(1, Math.round((f.end.getTime() - f.start.getTime()) / 60000));
        await this.ingest(integ, { externalId: f.id, start: f.start, durationMinutes: minutes, service: f.summary, customerEmail: f.email });
      }
      return { baseline, freed: freed.length, suppressed };
    } catch (e: any) {
      await this.prisma.connectedIntegration.update({ where: { id: integ.id }, data: { lastError: String(e.message).slice(0, 300) } }).catch(() => undefined);
      throw e;
    }
  }
}
