import { CalEvent } from './calendar-diff';

type Integ = { id: string; accessToken: string; refreshToken: string | null; expiresAt: Date | null };

/** Returns a valid access token, refreshing (and persisting) it when it is about to expire. */
export async function getGoogleAccessToken(
  prisma: { connectedIntegration: { update: (args: any) => Promise<any> } },
  integ: Integ,
): Promise<string> {
  if (!integ.expiresAt || integ.expiresAt.getTime() - Date.now() > 60_000) return integ.accessToken;
  if (!integ.refreshToken) throw new Error('Google session expired. Please reconnect Google.');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: integ.refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json: any = await res.json();
  if (!json.access_token) throw new Error('Google session expired. Please reconnect Google.');
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  await prisma.connectedIntegration.update({
    where: { id: integ.id },
    data: { accessToken: json.access_token, expiresAt },
  });
  return json.access_token;
}

/** Lists timed, non-cancelled events in [from, to] with recurring events expanded. */
export async function listGoogleEvents(
  token: string,
  calendarId: string,
  from: Date,
  to: Date,
): Promise<CalEvent[]> {
  const out: CalEvent[] = [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${qs}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) },
    );
    const json: any = await res.json();
    if (!res.ok) throw new Error(`Google Calendar error ${res.status}: ${json?.error?.message ?? 'unknown'}`);
    for (const e of json.items ?? []) {
      if (e.status === 'cancelled' || !e.start?.dateTime || !e.end?.dateTime) continue;
      const guest = (e.attendees ?? []).find((a: any) => !a.self && !a.organizer && a.email);
      out.push({
        id: String(e.id),
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
        summary: e.summary,
        email: guest?.email?.toLowerCase(),
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

export async function insertGoogleEvent(
  token: string,
  calendarId: string,
  ev: { summary: string; start: Date; end: Date; attendeeEmail?: string; description?: string },
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description,
        start: { dateTime: ev.start.toISOString() },
        end: { dateTime: ev.end.toISOString() },
        attendees: ev.attendeeEmail ? [{ email: ev.attendeeEmail }] : undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const json: any = await res.json();
  if (!json.id) throw new Error(`Google Calendar insert failed: ${JSON.stringify(json)}`);
  return json.id;
}
