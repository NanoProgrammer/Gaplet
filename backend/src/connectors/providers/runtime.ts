import { SnapshotEvent } from '../calendar-diff';
import { Ctx, ProviderAdapter } from './types';

type Row = { id: string; accessToken: string; refreshToken: string | null; expiresAt: Date | null; config: any };
type Db = { connectedIntegration: { update: (args: any) => Promise<any> } };

/** Builds the call context, refreshing (and persisting) the OAuth token when it is about to expire. */
export async function adapterCtx(db: Db, integ: Row, adapter: ProviderAdapter, previous?: SnapshotEvent[]): Promise<Ctx> {
  const extra: Record<string, string> = integ.config?.extra ?? {};
  let accessToken = integ.accessToken;
  if (adapter.auth.type === 'oauth2' && integ.expiresAt && integ.expiresAt.getTime() - Date.now() < 60_000) {
    if (!integ.refreshToken || !adapter.auth.refresh) throw new Error(`${adapter.name} session expired. Please reconnect.`);
    const c = await adapter.auth.refresh(integ.refreshToken, extra);
    accessToken = c.accessToken;
    await db.connectedIntegration.update({
      where: { id: integ.id },
      data: { accessToken: c.accessToken, refreshToken: c.refreshToken ?? integ.refreshToken, expiresAt: c.expiresAt ?? null },
    });
  }
  return { accessToken, extra, previous, timezone: integ.config?.timezone };
}
