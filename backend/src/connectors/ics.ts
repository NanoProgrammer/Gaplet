import * as ical from 'node-ical';
import { CalEvent } from './calendar-diff';

const stripMailto = (v: any): string | undefined => {
  const s = typeof v === 'string' ? v : v?.val;
  return typeof s === 'string' ? s.replace(/^mailto:/i, '').toLowerCase() : undefined;
};

/** Parses an ICS document into the non-cancelled, non-all-day events inside [from, to]. */
export function parseIcs(text: string, from: Date, to: Date): CalEvent[] {
  const data = ical.sync.parseICS(text);
  const out: CalEvent[] = [];
  for (const raw of Object.values(data)) {
    const ev: any = raw;
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;
    if (String(ev.status || '').toUpperCase() === 'CANCELLED') continue;
    if (ev.datetype === 'date') continue; // all-day: not an appointment
    const durationMs = ev.end ? Math.max(ev.end.getTime() - ev.start.getTime(), 0) : 60 * 60_000;
    const email = stripMailto(Array.isArray(ev.attendee) ? ev.attendee[0] : ev.attendee);
    const base = { summary: typeof ev.summary === 'string' ? ev.summary : ev.summary?.val, email };

    if (ev.rrule) {
      const exdates = new Set(Object.values(ev.exdate ?? {}).map((d: any) => new Date(d).getTime()));
      for (const s of ev.rrule.between(from, to, true) as Date[]) {
        if (exdates.has(s.getTime())) continue;
        const override = ev.recurrences?.[s.toISOString().slice(0, 10)];
        if (override && String(override.status || '').toUpperCase() === 'CANCELLED') continue;
        const start = override?.start ?? s;
        out.push({ id: `${ev.uid}@${s.toISOString()}`, start, end: new Date(start.getTime() + durationMs), ...base });
      }
    } else if (ev.start >= from && ev.start <= to) {
      out.push({ id: String(ev.uid), start: ev.start, end: ev.end ?? new Date(ev.start.getTime() + durationMs), ...base });
    }
  }
  return out;
}
