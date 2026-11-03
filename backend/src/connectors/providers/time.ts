const parts = (utcMs: number, tz: string) => {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(utcMs))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second);
};

/** Converts a wall-clock time in `tz` (no offset in the string) to the real UTC instant. DST-safe. */
export function localToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = wall;
  for (let i = 0; i < 3; i++) guess = wall - (parts(guess, tz) - guess);
  return new Date(guess);
}

/** "2026-11-03 14:30:00" → Date, interpreting the string in `tz`. */
export function parseLocal(str: string, tz: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if (!m) throw new Error(`Unrecognised date "${str}"`);
  return localToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0), tz);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Date → "dd-MMM-yyyy HH:mm:ss" as written in `tz` (Zoho's format). */
export function formatZoho(date: Date, tz: string): string {
  const p = new Date(parts(date.getTime(), tz));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(p.getUTCDate())}-${MONTHS[p.getUTCMonth()]}-${p.getUTCFullYear()} ${pad(p.getUTCHours())}:${pad(p.getUTCMinutes())}:${pad(p.getUTCSeconds())}`;
}
/** "dd-MMM-yyyy HH:mm:ss" in `tz` → Date. */
export function parseZoho(str: string, tz: string): Date {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  const mo = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) : -1;
  if (!m || mo < 0) throw new Error(`Unrecognised date "${str}"`);
  return localToUtc(+m[3], mo + 1, +m[1], +m[4], +m[5], +(m[6] ?? 0), tz);
}
