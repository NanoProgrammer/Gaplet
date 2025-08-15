// src/components/Demo.tsx
"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import UI from "./UI"
import {
  Activity,
  Send,
  MessageCircle,
  CheckCircle2,
  Smartphone,
  CalendarCheck2,
  Mail,
  Bell,
  BarChart3,
  User2,
} from "lucide-react";

/*
  Live-like preview (~30s) with SMS/Email option, event logs, calendar, and client card.
  - No real data; fully front-end.
  - Anchored with scroll-mt-[70px] for in-page links (#Demo).
  - Stable arrays/keys to avoid Framer warnings.
*/

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
};
const chip: Variants = {
  off: { opacity: 0.4 },
  on: { opacity: 1, scale: 1.02, transition: { type: "tween", duration: 0.25, ease: "easeOut" } },
};

// ~30s total
const DURATIONS_MS = [
  2500, // 1 Detect
  4000, // 2 Notify
  3500, // 3 Typing / Hover
  1500, // 4 YES / Click CTA
  3000, // 5 Confirmation
  4000, // 6 Calendar pending
  3000, // 7 Booked + Replacement created
  3500, // 8 Others informed
  5000, // 9 Settle
] as const;

type Mode = "sms" | "email";

export default function Demo() {
  const [step, setStep] = React.useState(0); // 0..9
  const [runKey, setRunKey] = React.useState(0);
  const [mode, setMode] = React.useState<Mode>("sms");

  const totalMs = React.useMemo(() => DURATIONS_MS.reduce((a, b) => a + b, 0), []);
  const cumul = React.useMemo(() => {
    const out: number[] = [];
    DURATIONS_MS.reduce((acc, d, i) => {
      const t = acc + d;
      out[i] = t;
      return t;
    }, 0);
    return out;
  }, []);

  React.useEffect(() => {
    setStep(0);
    const tids: number[] = [];
    cumul.forEach((t, idx) => {
      const id = window.setTimeout(() => setStep(idx + 1), t);
      tids.push(id);
    });
    return () => tids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const replay = () => setRunKey((k) => k + 1);

  return (
    <>
    <div className="">
      <LazyMotion features={domAnimation} strict>
      <section id="Demo" className="scroll-mt-[70px] relative overflow-x-clip">
        <div className="mx-auto max-w-6xl rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/60 to-white p-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <m.h2
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="text-base font-semibold text-slate-900"
            >
              Live preview — from cancel to booked
            </m.h2>
            <div className="flex items-center gap-2">
              <ModeToggle mode={mode} setMode={setMode} />
              <button
                onClick={replay}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                aria-label="Replay preview"
              >
                Replay
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <m.div
              key={runKey}
              className="h-full bg-emerald-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: totalMs / 1000, ease: "linear" }}
            />
          </div>

          {/* Status chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <m.span variants={chip} animate={step >= 1 ? "on" : "off"} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-slate-800">
              <Activity className="h-3.5 w-3.5 text-violet-600" /> Detecting
            </m.span>
            <m.span variants={chip} animate={step >= 2 ? "on" : "off"} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-slate-800">
              <Send className="h-3.5 w-3.5 text-sky-600" /> Notifying
            </m.span>
            <m.span variants={chip} animate={step >= 7 ? "on" : "off"} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-slate-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Booked
            </m.span>
          </div>

          {/* 3-column layout: Thread | Calendar+Client | Logs */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Thread */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {mode === "sms" ? <SmsThread step={step} /> : <EmailThread step={step} />}
            </div>

            {/* Calendar + Client card */}
            <div className="grid gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <header className="mb-3 flex items-center gap-2 text-slate-700">
                  <CalendarCheck2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Today</span>
                </header>
                <div className="grid gap-2">
                  <Slot
                    time="3:00 – 4:00 PM"
                    title="Massage w/ Jamie"
                    status={step < 6 ? "open" : step < 7 ? "pending" : "booked"}
                  />
                </div>
              </div>

              <ClientCard step={step} mode={mode} />
            </div>

            {/* Event Logs */}
            <EventLog step={step} mode={mode} />
          </div>

          <p className="mt-4 text-center text-[12px] text-slate-500">Simulated flow (~30s). No personal data; for illustration only.</p>
        </div>
      </section>
    </LazyMotion>
    </div>

    <div className="mt-10">
      <UI />
    </div>
    </>
  );
}

/* ── Mode toggle ─────────────────────────────────────────────────────────── */
function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
      <button
        onClick={() => setMode("sms")}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${mode === "sms" ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`}
        aria-pressed={mode === "sms"}
        aria-label="Show SMS preview"
      >
        <Smartphone className="h-3.5 w-3.5" /> SMS
      </button>
      <button
        onClick={() => setMode("email")}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${mode === "email" ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`}
        aria-pressed={mode === "email"}
        aria-label="Show Email preview"
      >
        <Mail className="h-3.5 w-3.5" /> Email
      </button>
    </div>
  );
}

/* ── Threads ─────────────────────────────────────────────────────────────── */
function SmsThread({ step }: { step: number }) {
  return (
    <div>
      <header className="mb-3 flex items-center gap-2 text-slate-700">
        <Smartphone className="h-4 w-4" />
        <span className="text-sm font-medium">SMS</span>
      </header>
      <div className="space-y-2">
        <Bubble role="out" visible={step >= 2} color="sky">
          Last-minute opening today at <strong>3:00 PM</strong> — 60 min massage with Jamie.
          Reply <strong>YES</strong> to claim.
        </Bubble>
        <Typing visible={step >= 3 && step < 4} />
        <Bubble role="in" visible={step >= 4} color="emerald">YES</Bubble>
        <Bubble role="out" visible={step >= 5} color="emerald" icon={<CheckCircle2 className="h-4 w-4" />}>You’re in. See you at <strong>3:00 PM</strong>. We’ll notify others the slot is taken.</Bubble>
        <Bubble role="out" visible={step >= 8} color="slate" icon={<MessageCircle className="h-4 w-4" />}>Heads up: that opening was claimed. You’re still on our list for future spots.</Bubble>
      </div>
    </div>
  );
}

function EmailThread({ step }: { step: number }) {
  return (
    <div>
      <header className="mb-3 flex items-center gap-2 text-slate-700">
        <Mail className="h-4 w-4" />
        <span className="text-sm font-medium">Email</span>
      </header>
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="font-medium">From:</span> Gaplets &lt;no-reply@gaplets.com&gt;</span>
          <span className="inline-flex items-center gap-1"><span className="font-medium">Subject:</span> Opening today: 3:00 PM — 60 min massage</span>
        </div>
        <m.div variants={fadeUp} initial="hidden" animate={step >= 2 ? "show" : "hidden"} className="mt-3 text-sm text-slate-800">
          Hi Ava, an opening just popped up for <strong>3:00 PM</strong> (60 min massage with Jamie).
          Click below to claim it—first come, first served.
        </m.div>
        <m.button
          variants={fadeUp}
          initial="hidden"
          animate={step >= 3 ? "show" : "hidden"}
          className={`mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium shadow-sm ${step >= 4 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"}`}
        >
          {step >= 4 ? (
            <span className="inline-flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4" /> Claimed</span>
          ) : (
            <span className="inline-flex items-center justify-center gap-1"><Send className="h-4 w-4" /> Claim this spot</span>
          )}
        </m.button>
        <m.p variants={fadeUp} initial="hidden" animate={step >= 5 ? "show" : "hidden"} className="mt-3 text-[12px] text-slate-600">
          Confirmation sent. Others will be informed that this opening is no longer available.
        </m.p>
      </article>
    </div>
  );
}

/* ── Logs ────────────────────────────────────────────────────────────────── */
function EventLog({ step, mode }: { step: number; mode: Mode }) {
  const items = React.useMemo(
    () => [
      { id: "evt1", at: 1, icon: <Activity className="h-3.5 w-3.5 text-violet-600" />, text: "Cancellation detected (Square webhook)", meta: "2:35 PM • 60 min Massage w/ Jamie" },
      { id: "evt2", at: 2, icon: <Send className="h-3.5 w-3.5 text-sky-600" />, text: "Wave 1 notified", meta: "Channels: SMS + Email • 12 eligible" },
      { id: "evt3", at: 4, icon: <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />, text: mode === "sms" ? "Reply received: YES" : "CTA clicked from Email", meta: "Ava P. • 2:37 PM" },
      { id: "evt4", at: 5, icon: <Bell className="h-3.5 w-3.5 text-emerald-600" />, text: "Confirmation sent", meta: "Others queued for closure notice" },
      { id: "evt5", at: 6, icon: <CalendarCheck2 className="h-3.5 w-3.5 text-amber-600" />, text: "Calendar hold placed", meta: "Pending provider confirmation" },
      { id: "evt6", at: 7, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />, text: "Booked • Replacement created", meta: "ReplacementLog: RPL-2481" },
      { id: "evt7", at: 8, icon: <Send className="h-3.5 w-3.5 text-slate-600" />, text: "Others informed: opening closed", meta: "11 recipients" },
      { id: "evt8", at: 9, icon: <BarChart3 className="h-3.5 w-3.5 text-slate-700" />, text: "Metrics updated", meta: "+$85 recovered • avg fill 54 min" },
    ],
    [mode]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3 text-sm font-medium text-slate-700">Event log</header>
      <ol className="space-y-2">
        {items.map((it) => (
          <LogItem key={it.id} visible={step >= it.at} icon={it.icon} text={it.text} meta={it.meta} />
        ))}
      </ol>
    </div>
  );
}

function LogItem({ visible, icon, text, meta }: { visible: boolean; icon: React.ReactNode; text: string; meta?: string }) {
  return (
    <m.li variants={fadeUp} initial="hidden" animate={visible ? "show" : "hidden"} className="list-none">
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-900">{text}</p>
          {meta ? <p className="truncate text-[12px] text-slate-600">{meta}</p> : null}
        </div>
      </div>
    </m.li>
  );
}

/* ── Client card ─────────────────────────────────────────────────────────── */
function ClientCard({ step, mode }: { step: number; mode: Mode }) {
  const visible = step >= 7;
  return (
    <m.div variants={fadeUp} initial="hidden" animate={visible ? "show" : "hidden"} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-2 text-slate-700">
        <User2 className="h-4 w-4" />
        <span className="text-sm font-medium">Client (example)</span>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-800">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium">Ava Patel</dd>
        </div>
        <div>
          <dt className="text-slate-500">Source</dt>
          <dd className="font-medium">{mode === "sms" ? "SMS (YES)" : "Email (CTA)"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Phone</dt>
          <dd className="font-medium">+1••• ••34</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium">ava•••@example.com</dd>
        </div>
        <div>
          <dt className="text-slate-500">Service</dt>
          <dd className="font-medium">Massage — 60 min</dd>
        </div>
        <div>
          <dt className="text-slate-500">Staff</dt>
          <dd className="font-medium">Jamie</dd>
        </div>
        <div>
          <dt className="text-slate-500">When</dt>
          <dd className="font-medium">Today, 3:00–4:00 PM</dd>
        </div>
        <div>
          <dt className="text-slate-500">Replacement ID</dt>
          <dd className="font-medium">RPL-2481</dd>
        </div>
      </dl>
    </m.div>
  );
}

/* ── Shared subcomponents ───────────────────────────────────────────────── */
function Bubble({ role, visible, children, color, icon }: { role: "in" | "out"; visible: boolean; children: React.ReactNode; color: "sky" | "emerald" | "slate"; icon?: React.ReactNode; }) {
  const isIn = role === "in";
  const palette =
    color === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : color === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-900"
      : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <m.div
      variants={fadeUp}
      initial="hidden"
      animate={visible ? "show" : "hidden"}
      className={`max-w-[85%] rounded-2xl border px-3 py-2 text-[13px] shadow-sm ${palette} ${isIn ? "ml-auto" : ""}`}
      style={{ pointerEvents: "none" }}
    >
      <div className="flex items-start gap-2">
        {icon ? <span className="mt-0.5">{icon}</span> : null}
        <div className="[&_strong]:font-semibold">{children}</div>
      </div>
    </m.div>
  );
}

function Typing({ visible }: { visible: boolean }) {
  return (
    <m.div variants={fadeUp} initial="hidden" animate={visible ? "show" : "hidden"} className="ml-auto max-w-[60%] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" aria-hidden>
      <div className="flex items-center gap-1">
        <Dot />
        <Dot delay={0.12} />
        <Dot delay={0.24} />
      </div>
    </m.div>
  );
}
function Dot({ delay = 0 }: { delay?: number }) {
  return <m.span className="h-1.5 w-1.5 rounded-full bg-slate-400" initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay }} />;
}

function Slot({ time, title, status }: { time: string; title: string; status: "open" | "pending" | "booked" }) {
  const palette = status === "open" ? "border-violet-200 bg-violet-50" : status === "pending" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
  const label = status === "open" ? "Open" : status === "pending" ? "Pending…" : "Booked";
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }} className={`rounded-xl border p-4 shadow-sm ${palette}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-slate-900">{time}</div>
          <div className="text-[12px] text-slate-700">{title}</div>
        </div>
        <m.span key={label} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { duration: 0.25, ease: "easeOut" } }} className={`inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1 text-[11px] font-medium ${status === "open" ? "border-violet-200 text-violet-700" : status === "pending" ? "border-amber-200 text-amber-700" : "border-emerald-200 text-emerald-700"}`}>
          {status === "booked" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {label}
        </m.span>
      </div>
    </m.div>
  );
}
