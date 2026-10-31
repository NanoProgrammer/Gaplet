export type CalEvent = {
  id: string;
  start: Date;
  end: Date;
  summary?: string;
  email?: string;
};

export type FreedSlot = CalEvent & { reason: 'deleted' | 'moved' };

export type SnapshotEvent = { id: string; start: string; end: string; summary?: string; email?: string };

export const toSnapshot = (events: CalEvent[]): SnapshotEvent[] =>
  events.map((e) => ({ id: e.id, start: e.start.toISOString(), end: e.end.toISOString(), summary: e.summary, email: e.email }));

const fromSnapshot = (e: SnapshotEvent): CalEvent => ({
  id: e.id, start: new Date(e.start), end: new Date(e.end), summary: e.summary, email: e.email,
});

/**
 * Compares the previous poll with the current one and returns the future slots that
 * were freed: events that disappeared, or whose start time changed (old time is free).
 * Events whose start already passed are ignored (they ended naturally).
 */
export function detectFreedSlots(prev: SnapshotEvent[], current: CalEvent[], now = new Date()): FreedSlot[] {
  const cur = new Map(current.map((e) => [e.id, e]));
  const freed: FreedSlot[] = [];
  for (const p of prev.map(fromSnapshot)) {
    if (p.start.getTime() <= now.getTime()) continue;
    const c = cur.get(p.id);
    if (!c) freed.push({ ...p, reason: 'deleted' });
    else if (c.start.getTime() !== p.start.getTime()) freed.push({ ...p, reason: 'moved' });
  }
  return freed;
}
