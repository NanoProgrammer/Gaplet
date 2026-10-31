export type ParsedClient = {
  name: string;
  email?: string;
  phone?: string;
  services: string[];
  lastApptAt?: Date;
  nextApptAt?: Date;
};

export const MAX_CLIENT_ROWS = 20_000;

/** Minimal RFC 4180 parser (quotes, escaped quotes, CRLF, comma/semicolon/tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '');
const FIELDS: Record<string, string[]> = {
  name: ['name', 'fullname', 'clientname', 'customername', 'client', 'customer'],
  first: ['firstname', 'first', 'givenname'],
  last: ['lastname', 'last', 'surname', 'familyname'],
  email: ['email', 'emailaddress', 'mail'],
  phone: ['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'tel'],
  services: ['service', 'services', 'servicetype', 'appointmenttype', 'treatment'],
  last_visit: ['lastvisit', 'lastappointment', 'lastappt', 'lastvisitdate'],
  next_visit: ['nextvisit', 'nextappointment', 'nextappt', 'nextvisitdate'],
};

export function normalizePhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  if (raw.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
  if (digits.length === 10) return `+1${digits}`; // assumes US/CA when no country code
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined; // ambiguous: do not guess
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDate(v?: string): Date | undefined {
  if (!v?.trim()) return undefined;
  const d = new Date(v.trim());
  return isNaN(d.getTime()) ? undefined : d;
}

export function parseClients(text: string): { clients: ParsedClient[]; skipped: number; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one client');
  if (rows.length - 1 > MAX_CLIENT_ROWS) throw new Error(`Too many rows (max ${MAX_CLIENT_ROWS})`);
  const header = rows[0].map(norm);
  const idx: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(FIELDS)) {
    const i = header.findIndex((h) => aliases.includes(h));
    if (i >= 0) idx[field] = i;
  }
  if (idx.email === undefined && idx.phone === undefined) {
    throw new Error('CSV must have an "email" or "phone" column');
  }
  const get = (r: string[], f: string) => (idx[f] === undefined ? undefined : r[idx[f]]?.trim() || undefined);

  const seen = new Set<string>();
  const clients: ParsedClient[] = [];
  const errors: string[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r, n) => {
    const emailRaw = get(r, 'email')?.toLowerCase();
    const email = emailRaw && EMAIL_RE.test(emailRaw) ? emailRaw : undefined;
    const phone = normalizePhone(get(r, 'phone'));
    if (!email && !phone) {
      skipped++;
      if (errors.length < 10) errors.push(`Row ${n + 2}: no valid email or phone`);
      return;
    }
    const key = email ?? phone!;
    if (seen.has(key)) { skipped++; return; }
    seen.add(key);
    const name = get(r, 'name') ?? [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ');
    clients.push({
      name: name || 'Client',
      email,
      phone,
      services: (get(r, 'services') ?? '').split(/[|;]/).map((s) => s.trim()).filter(Boolean),
      lastApptAt: toDate(get(r, 'last_visit')),
      nextApptAt: toDate(get(r, 'next_visit')),
    });
  });
  return { clients, skipped, errors };
}
