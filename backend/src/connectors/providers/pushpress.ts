import { encryptSecret } from '../../prisma-manager/crypto-box';
import { env, requestJson } from './http';
import { ParsedCancellation, ProviderAdapter } from './types';

/*
 * UNVERIFIED (PushPress SDK read by the owner; never run against a real gym). PushPress has NO "list appointments"
 * endpoint, so cancellations arrive by WEBHOOK. Checklist:
 *  1. Webhook PAYLOAD shape. We accept {type|event|eventType, data|payload|appointment} and need
 *     appointment `startTimestamp`. Anything else on a cancellation event is an error, not an empty list.
 *  2. SIGNATURE: `signingSecret` is returned at creation, but the algorithm/header are unknown, so signatures are NOT
 *     verified. The secret URL token (192 bits) is the only authentication. The secret is stored encrypted for later.
 *  3. Appointment has no end/duration: we assume 60 minutes.
 *  4. startTimestamp unit (seconds vs milliseconds): values above 1e12 are read as milliseconds.
 *  5. Whether the create response nests the object under `data`.
 *  6. appointment.rescheduled also frees a slot but its payload (old time?) is unknown, so it is NOT subscribed.
 *  7. No customer e-mail in the appointment: the person who cancelled cannot be excluded from the invitations.
 */
const base = () => env('PUSHPRESS_BASE_URL', 'https://api.pushpress.com/v3').replace(/\/$/, '');
const H = (key: string, companyId: string) => ({ 'API-KEY': key, 'company-id': companyId, 'Content-Type': 'application/json', Accept: 'application/json' });
const DEFAULT_MINUTES = 60;

const norm = (t: unknown) => String(t ?? '').toLowerCase().replace('canceled', 'cancelled');

export function parsePushPressEvent(body: any): ParsedCancellation | null {
  const type = norm(body?.type ?? body?.event ?? body?.eventType);
  if (type !== 'appointment.cancelled') return null; // other events are ignored
  const a = body?.data ?? body?.payload ?? body?.appointment;
  if (!a || typeof a !== 'object') throw new Error('cancellation event without appointment data');
  let ts = Number(a.startTimestamp);
  if (!Number.isFinite(ts) || ts <= 0) throw new Error('cancellation event without a valid startTimestamp');
  if (ts < 1e12) ts *= 1000; // seconds → ms
  const start = new Date(ts);
  if (isNaN(start.getTime())) throw new Error('invalid startTimestamp');
  return { externalId: a.id != null ? String(a.id) : undefined, start, durationMinutes: DEFAULT_MINUTES, service: a.type?.name || undefined };
}

export const pushpress: ProviderAdapter = {
  key: 'pushpress',
  name: 'PushPress',
  maturity: 'unverified',
  bookingSupported: false,
  auth: {
    type: 'apikey',
    fields: [
      { name: 'apiKey', label: 'PushPress API key', secret: true },
      { name: 'companyId', label: 'Company ID (your gym)', placeholder: 'company-id' },
    ],
    async validate(values) {
      const key = (values.apiKey ?? '').trim(), companyId = (values.companyId ?? '').trim();
      if (!key || !companyId) throw new Error('Enter both your PushPress API key and company ID.');
      // Any authenticated, harmless call proves the credentials; the list shape is not asserted here.
      await requestJson(`${base()}/webhooks`, { headers: H(key, companyId) }, 'PushPress');
      return { accessToken: key, extra: { companyId } };
    },
  },
  webhook: {
    async register(creds, hookUrl) {
      const j: any = await requestJson(`${base()}/webhooks`, {
        method: 'POST',
        headers: H(creds.accessToken, creds.extra.companyId),
        body: JSON.stringify({ url: hookUrl, eventTypes: ['appointment.canceled'] }),
      }, 'PushPress');
      const id = j?.id ?? j?.data?.id;
      if (!id) throw new Error('PushPress did not return a webhook id');
      const secret = j?.signingSecret ?? j?.data?.signingSecret;
      return { webhookId: String(id), extra: secret ? { signingSecretEnc: encryptSecret(String(secret)) } : {} };
    },
    async unregister(creds, webhookId) {
      await requestJson(`${base()}/webhooks/${encodeURIComponent(webhookId)}`, { method: 'DELETE', headers: H(creds.accessToken, creds.extra.companyId) }, 'PushPress');
    },
    parse: parsePushPressEvent,
  },
};
