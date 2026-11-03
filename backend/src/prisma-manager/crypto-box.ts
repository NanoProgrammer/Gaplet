import * as crypto from 'crypto';

const PREFIX = 'enc:v1:';
let warned = false;

function key(): Buffer | null {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    if (!warned && process.env.NODE_ENV === 'production') {
      warned = true;
      console.warn('⚠️ INTEGRATION_ENCRYPTION_KEY is not set: integration tokens are stored UNENCRYPTED.');
    }
    return null;
  }
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  return k;
}

export const isEncrypted = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIX);

/** AES-256-GCM. Without a key it is a no-op, so deployments keep working until the key is configured. */
export function encryptSecret(plain: string): string {
  const k = key();
  if (!k || !plain || isEncrypted(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

/** Accepts legacy plaintext values unchanged. */
export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) return value;
  const k = key();
  if (!k) throw new Error('Stored tokens are encrypted but INTEGRATION_ENCRYPTION_KEY is not set');
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', k, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}
