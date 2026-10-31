"use client";

import * as React from "react";
import { CalendarDays, Link2, Webhook, FileSpreadsheet, Loader2, Copy, Check, AlertTriangle, Trash2 } from "lucide-react";
import { apiJson } from "@/lib/fetchWithAuth";

type Status = {
  provider: string | null;
  clients: number;
  lastSyncAt?: string | null;
  lastError?: string | null;
  calendarId?: string | null;
  callbackSigningSecret?: string | null;
  settings?: { businessName: string | null; timezone: string | null; callbackUrl: string | null; icsUrl: string | null };
};

const LABEL: Record<string, string> = { square: "Square", acuity: "Acuity", google: "Google Calendar", ics: "Calendar link (ICS)", webhook: "Webhook / Zapier / Make" };
const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100";
const btn = "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50";
const ghost = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function ConnectorsPanel({ onConnectGoogle }: { onConnectGoogle: () => void }) {
  const browserTz = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [calendars, setCalendars] = React.useState<{ id: string; name: string; primary: boolean }[]>([]);
  const [webhook, setWebhook] = React.useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ icsUrl: "", businessName: "", timezone: browserTz, callbackUrl: "" });

  const load = React.useCallback(async () => {
    try {
      const s = await apiJson<Status>("/connectors/status");
      setStatus(s);
      setForm((f) => ({
        ...f,
        businessName: s.settings?.businessName ?? f.businessName,
        timezone: s.settings?.timezone ?? f.timezone,
        callbackUrl: s.settings?.callbackUrl ?? f.callbackUrl,
      }));
      if (s.provider === "google") setCalendars(await apiJson<{ id: string; name: string; primary: boolean }[]>("/connectors/google/calendars").catch(() => []));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key); setMsg(null);
    try { const t = await fn(); if (t) setMsg({ ok: true, text: t }); await load(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(null); }
  };

  const settingsBody = () => ({ businessName: form.businessName, timezone: form.timezone, callbackUrl: form.callbackUrl });
  const copy = async (k: string, v: string) => { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); };

  const onCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void run("csv", async () => {
      const csv = await file.text();
      const r = await apiJson<{ created: number; updated: number; skipped: number; errors: string[] }>("/connectors/clients/import", { method: "POST", body: JSON.stringify({ csv }) });
      return `Imported ${r.created} new, ${r.updated} updated, ${r.skipped} skipped.${r.errors.length ? " " + r.errors.join("; ") : ""}`;
    });
  };

  const active = status?.provider;
  const generic = active === "google" || active === "ics" || active === "webhook";

  return (
    <section aria-labelledby="connectors-title" className="space-y-5">
      <div>
        <h2 id="connectors-title" className="text-lg font-semibold text-gray-800">Connect any booking software</h2>
        <p className="text-sm text-gray-500">
          Works with any tool that publishes a calendar link or can send a webhook (directly, or through Zapier / Make). Only one booking source is active at a time; connecting another replaces it.
        </p>
      </div>

      {msg && (
        <div role="status" className={`rounded-lg border p-3 text-sm ${msg.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>{msg.text}</div>
      )}

      {!status ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <>
          {active && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div>
                <p className="font-semibold text-emerald-900">Active source: {LABEL[active] ?? active}</p>
                {(active === "google" || active === "ics") && (
                  <p className="text-emerald-800">{status.lastSyncAt ? `Last checked ${new Date(status.lastSyncAt).toLocaleString()}` : "Waiting for first check (every ~2 min)"}</p>
                )}
                {status.lastError && <p className="mt-1 flex items-start gap-1 text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{status.lastError}</p>}
              </div>
              <button className={ghost} disabled={busy === "disc"} onClick={() => run("disc", async () => { await apiJson("/connectors", { method: "DELETE" }); return "Disconnected."; })}>
                <Trash2 className="h-4 w-4" /> Disconnect
              </button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900"><CalendarDays className="h-5 w-5 text-sky-600" /> Google Calendar</h3>
              <p className="mt-1 text-sm text-slate-600">Detects deleted or moved events and books the replacement as a new event.</p>
              {active === "google" ? (
                <label className="mt-3 block text-sm">
                  <span className="text-slate-600">Calendar to watch</span>
                  <select className={`${field} mt-1`} value={status.calendarId ?? ""} onChange={(e) => run("cal", async () => { await apiJson("/connectors/google/calendar", { method: "POST", body: JSON.stringify({ calendarId: e.target.value }) }); return "Calendar updated."; })}>
                    <option value="" disabled>Select…</option>
                    {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}{c.primary ? " (primary)" : ""}</option>)}
                  </select>
                </label>
              ) : (
                <button className={`${btn} mt-3`} onClick={onConnectGoogle}>Connect Google</button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Link2 className="h-5 w-5 text-violet-600" /> Calendar link (ICS)</h3>
              <p className="mt-1 text-sm text-slate-600">Paste the public iCal/ICS link from Outlook, Apple, or your booking tool. Read-only: new bookings are sent to you by email/callback.</p>
              <input className={`${field} mt-3`} placeholder="https://… or webcal://…" value={form.icsUrl} onChange={(e) => setForm({ ...form, icsUrl: e.target.value })} />
              <button className={`${btn} mt-3`} disabled={!form.icsUrl || busy === "ics"} onClick={() => run("ics", async () => {
                const r = await apiJson<{ eventsFound: number }>("/connectors/ics", { method: "POST", body: JSON.stringify({ url: form.icsUrl, ...settingsBody() }) });
                setForm((f) => ({ ...f, icsUrl: "" }));
                return `Connected. Found ${r.eventsFound} upcoming events.`;
              })}>{busy === "ics" && <Loader2 className="h-4 w-4 animate-spin" />} Connect link</button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Webhook className="h-5 w-5 text-emerald-600" /> Webhook / Zapier / Make</h3>
              <p className="mt-1 text-sm text-slate-600">Send a POST from any system when an appointment is cancelled. Gaplets calls your callback URL when a client claims the slot, so you can write the booking back.</p>
              <button className={`${btn} mt-3`} disabled={busy === "wh"} onClick={() => run("wh", async () => {
                if (active === "webhook" && !window.confirm("This rotates your URL; the old one stops working. Continue?")) return;
                setWebhook(await apiJson<{ url: string; token: string }>("/connectors/webhook/setup", { method: "POST", body: JSON.stringify(settingsBody()) }));
              })}>{active === "webhook" ? "Rotate URL" : "Generate webhook URL"}</button>
              {webhook && (
                <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-amber-800">Copy it now — it will not be shown again.</p>
                  <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{webhook.url}</code>
                    <button className={ghost} onClick={() => copy("url", webhook.url)} aria-label="Copy URL">{copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
                  <pre className="overflow-x-auto rounded bg-white p-2 text-xs">{`curl -X POST '${webhook.url}' \\
  -H 'Content-Type: application/json' \\
  -d '{"event":"appointment.cancelled","start_at":"2026-11-03T15:00:00Z","duration_minutes":60,"service":"Haircut","customer_email":"client@example.com","external_id":"abc-123"}'`}</pre>
                </div>
              )}
              {status.callbackSigningSecret && (
                <p className="mt-3 text-xs text-slate-600">Callbacks are signed: header <code>X-Gaplet-Signature: sha256=HMAC_SHA256(body, secret)</code>. Secret: <code className="break-all">{status.callbackSigningSecret}</code></p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileSpreadsheet className="h-5 w-5 text-amber-600" /> Client list (CSV)</h3>
              <p className="mt-1 text-sm text-slate-600">Required for calendar/webhook sources. Columns: name (or first/last name), email, phone, service, last_visit, next_visit. {status.clients} clients stored.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`${btn} cursor-pointer`}>{busy === "csv" && <Loader2 className="h-4 w-4 animate-spin" />} Upload CSV
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onCsv} /></label>
                {status.clients > 0 && <button className={ghost} onClick={() => window.confirm("Delete all stored clients?") && run("clr", async () => { await apiJson("/connectors/clients", { method: "DELETE" }); return "Clients deleted."; })}>Clear</button>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Business settings</h3>
              <div className="mt-3 space-y-2">
                <input className={field} placeholder="Business name (shown to clients)" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                <input className={field} placeholder="Time zone, e.g. America/New_York" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                <input className={field} placeholder="Callback URL (optional, https)" value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} />
              </div>
              <button className={`${btn} mt-3`} disabled={!generic || busy === "set"} onClick={() => run("set", async () => { await apiJson("/connectors/settings", { method: "PATCH", body: JSON.stringify(settingsBody()) }); return "Settings saved."; })}>Save settings</button>
              {!generic && <p className="mt-2 text-xs text-slate-500">Connect a calendar or webhook first. These values are also applied when you connect a link.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
