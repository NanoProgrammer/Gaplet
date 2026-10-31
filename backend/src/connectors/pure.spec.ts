import { parseClients, normalizePhone, parseCsv } from './csv';
import { detectFreedSlots, toSnapshot } from './calendar-diff';
import { parseIcs } from './ics';
import { isPrivateIp, assertPublicHttpsUrl } from './net-guard';

describe('csv', () => {
  it('parses quotes, commas inside fields, semicolon delimiter and BOM', () => {
    const rows = parseCsv('﻿name;email\n"Doe, Jane";jane@x.com\n');
    expect(rows).toEqual([['name', 'email'], ['Doe, Jane', 'jane@x.com']]);
  });
  it('maps common header names, dedupes and reports bad rows', () => {
    const { clients, skipped, errors } = parseClients(
      'First Name,Last Name,Email Address,Mobile,Service,Last Visit\n' +
      'Ana,Ruiz,ANA@x.com,(555) 123-4567,Cut|Color,2026-01-02\n' +
      'Ana,Ruiz,ana@x.com,,,\n' +
      'Bad,Row,not-an-email,12,,\n',
    );
    expect(clients).toHaveLength(1);
    expect(clients[0]).toMatchObject({ name: 'Ana Ruiz', email: 'ana@x.com', phone: '+15551234567', services: ['Cut', 'Color'] });
    expect(clients[0].lastApptAt?.getUTCFullYear()).toBe(2026);
    expect(skipped).toBe(2);
    expect(errors[0]).toMatch(/Row 4/);
  });
  it('rejects a CSV without email or phone column', () => {
    expect(() => parseClients('name,city\nA,B\n')).toThrow(/email.*phone/);
  });
  it('does not guess ambiguous phone numbers', () => {
    expect(normalizePhone('12345')).toBeUndefined();
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
  });
});

describe('calendar diff', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  const ev = (id: string, h: number) => ({ id, start: new Date(now.getTime() + h * 3600e3), end: new Date(now.getTime() + (h + 1) * 3600e3) });
  it('reports deleted and moved events, ignores past and unchanged', () => {
    const prev = toSnapshot([ev('a', 5), ev('b', 6), ev('c', 7), ev('past', -2)]);
    const cur = [ev('a', 5), { ...ev('c', 9) }];
    const freed = detectFreedSlots(prev, cur, now);
    expect(freed.map((f) => [f.id, f.reason])).toEqual([['b', 'deleted'], ['c', 'moved']]);
  });
});

describe('ics', () => {
  const from = new Date('2026-11-01T00:00:00Z');
  const to = new Date('2026-11-05T00:00:00Z');
  const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//t//EN\r\n${body}END:VCALENDAR\r\n`;
  it('skips cancelled and all-day events, keeps timed ones with attendee email', () => {
    const text = wrap(
      'BEGIN:VEVENT\r\nUID:1\r\nDTSTART:20261102T150000Z\r\nDTEND:20261102T160000Z\r\nSUMMARY:Haircut\r\nATTENDEE:mailto:Bob@X.com\r\nEND:VEVENT\r\n' +
      'BEGIN:VEVENT\r\nUID:2\r\nDTSTART:20261102T170000Z\r\nDTEND:20261102T180000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\n' +
      'BEGIN:VEVENT\r\nUID:3\r\nDTSTART;VALUE=DATE:20261103\r\nEND:VEVENT\r\n',
    );
    const out = parseIcs(text, from, to);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: '1', summary: 'Haircut', email: 'bob@x.com' });
  });
  it('expands recurring events inside the window and honours EXDATE', () => {
    const text = wrap(
      'BEGIN:VEVENT\r\nUID:r\r\nDTSTART:20261101T100000Z\r\nDTEND:20261101T110000Z\r\nRRULE:FREQ=DAILY;COUNT=10\r\nEXDATE:20261103T100000Z\r\nSUMMARY:Daily\r\nEND:VEVENT\r\n',
    );
    const days = parseIcs(text, from, to).map((e) => e.start.toISOString().slice(8, 10));
    expect(days).toEqual(['01', '02', '04']); // 03 is EXDATE; 05 10:00Z is after the window end
  });
});

describe('net-guard', () => {
  it('flags private/loopback/metadata addresses', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1', '100.64.0.1']) expect(isPrivateIp(ip)).toBe(true);
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPrivateIp(ip)).toBe(false);
  });
  it('rejects non-https, credentials and private literals', async () => {
    await expect(assertPublicHttpsUrl('http://example.com/a.ics')).rejects.toThrow(/https/);
    await expect(assertPublicHttpsUrl('https://user:pw@example.com/')).rejects.toThrow(/credentials/);
    await expect(assertPublicHttpsUrl('https://127.0.0.1/x')).rejects.toThrow(/private/);
    await expect(assertPublicHttpsUrl('https://169.254.169.254/latest')).rejects.toThrow(/private/);
    await expect(assertPublicHttpsUrl('not a url')).rejects.toThrow(/Invalid/);
  });
  it('accepts webcal:// as https', async () => {
    await expect(assertPublicHttpsUrl('webcal://8.8.8.8/cal.ics')).resolves.toBeInstanceOf(URL);
  });
});
