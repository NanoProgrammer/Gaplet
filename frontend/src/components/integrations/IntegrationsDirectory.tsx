"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Check, Mail, Sparkles } from "lucide-react";
import {
  INDUSTRIES,
  INTEGRATIONS,
  STATUS_META,
  type IndustryKey,
  type Integration,
  type IntegrationStatus,
} from "@/data/integrations";

const SUPPORT = "support@gaplets.com";

const requestHref = (name: string) =>
  `mailto:${SUPPORT}?subject=${encodeURIComponent(`Integration request: ${name}`)}&body=${encodeURIComponent(
    `Hi Gaplets team,\n\nI would like to use Gaplets with ${name}.\n\nBusiness type:\nCurrent booking tool:\n`,
  )}`;

function Logo({ item }: { item: Integration }) {
  if (item.img) {
    return <Image src={item.img} alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />;
  }
  return (
    <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
      {item.name.charAt(0)}
    </span>
  );
}

function Card({ item, ctaMode }: { item: Integration; ctaMode: "marketing" | "dashboard" }) {
  const s = STATUS_META[item.status];
  const live = item.status === "live";
  return (
    <li
      className={`flex h-full flex-col rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        live ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo item={item} />
          <h3 className="text-[15px] font-semibold leading-tight text-slate-900">{item.name}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.cls}`}>{s.label}</span>
      </div>
      <p className="mt-3 flex-1 text-sm text-slate-600">{item.desc}</p>
      <p className="mt-3 text-xs text-slate-500">{INDUSTRIES[item.industry].label}</p>
      <div className="mt-4">
        {live ? (
          <Link
            href={ctaMode === "dashboard" ? "/dashboard/integrations" : item.href ?? "/signup"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" aria-hidden /> {ctaMode === "dashboard" ? "Manage" : "Connect now"}
          </Link>
        ) : (
          <a
            href={requestHref(item.name)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail className="h-4 w-4" aria-hidden /> {item.status === "soon" ? "Notify me" : "Request it"}
          </a>
        )}
      </div>
    </li>
  );
}

export default function IntegrationsDirectory({ mode = "marketing" }: { mode?: "marketing" | "dashboard" }) {
  const [q, setQ] = React.useState("");
  const [industry, setIndustry] = React.useState<IndustryKey | "all">("all");
  const [status, setStatus] = React.useState<IntegrationStatus | "all">("all");

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: INTEGRATIONS.length };
    for (const i of INTEGRATIONS) c[i.industry] = (c[i.industry] ?? 0) + 1;
    return c;
  }, []);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return INTEGRATIONS.filter(
      (i) =>
        (industry === "all" || i.industry === industry) &&
        (status === "all" || i.status === status) &&
        (!term || `${i.name} ${i.desc} ${INDUSTRIES[i.industry].label}`.toLowerCase().includes(term)),
    ).sort((a, b) => {
      const rank = { live: 0, soon: 1, planned: 2 } as const;
      return rank[a.status] - rank[b.status] || a.name.localeCompare(b.name);
    });
  }, [q, industry, status]);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search integrations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your booking software (Fresha, Jane, Mindbody…)"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <div className="flex gap-2" role="group" aria-label="Filter by status">
          {(["all", "live", "soon", "planned"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={chip(status === s)}>
              {s === "all" ? "All status" : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by industry">
        <button type="button" onClick={() => setIndustry("all")} aria-pressed={industry === "all"} className={chip(industry === "all")}>
          All industries ({counts.all})
        </button>
        {(Object.keys(INDUSTRIES) as IndustryKey[]).map((k) => (
          <button key={k} type="button" onClick={() => setIndustry(k)} aria-pressed={industry === k} className={chip(industry === k)}>
            {INDUSTRIES[k].label} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-slate-500" aria-live="polite">
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length > 0 ? (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.key} item={i} ctaMode={mode} />
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-slate-800">We don’t list that tool yet.</p>
          <a href={requestHref(q.trim() || "a new tool")} className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Request {q.trim() ? `“${q.trim()}”` : "an integration"}
          </a>
        </div>
      )}

      <p className="mt-8 text-xs text-slate-500">
        “Live” works today. “Coming soon” is in development. “Planned” is on the roadmap and prioritised by how many customers ask for it. Product names are trademarks of their
        respective owners; listing does not imply endorsement or partnership.
      </p>
    </div>
  );
}
