import * as crypto from 'crypto';

/** Per-integration key used to sign outbound callbacks; derived, so nothing extra is stored. */
export function callbackSecret(integrationId: string): string {
  const root = process.env.JWT_ACCESS_SECRET || process.env.CALLBACK_SECRET_ROOT;
  if (!root) throw new Error('JWT_ACCESS_SECRET is required to sign callbacks');
  return crypto.createHmac('sha256', root).update(`gaplet-callback:${integrationId}`).digest('hex');
}
