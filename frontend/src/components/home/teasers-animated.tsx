"use client";

// ======================================================
// src/components/home/teasers-soul.tsx (v4)
// • One card style per section (consistent look)
// • Seamless infinite marquee (CSS keyframes, no jump)
// • Clean backgrounds, no radial blue on revenue
// • Stable keys + overflow-x-clip to avoid horiz. scroll
// • Sharper, conversion-first copy
// ======================================================

import Link from "next/link";
import { motion, animate } from "framer-motion";
import { useEffect, useState } from "react";

const PRICING_PATH = "/price"; // ← change if your route is different

// ==================
// Design primitives
// ==================

type Variant = "white" | "emerald" | "amber" | "sky" | "violet";

function cardVariant(v: Variant) {
  switch (v) {
    case "emerald":
      return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white";
    case "amber":
      return "border-amber-200 bg-gradient-to-br from-amber-50 to-white";
    case "sky":
      return "border-sky-200 bg-gradient-to-br from-sky-50 to-white";
    case "violet":
      return "border-violet-200 bg-gradient-to-br from-violet-50 to-white";
    default:
      return "border-slate-200 bg-white";
  }
}

function Card({ children, className = "", variant = "white" as Variant }: { children: React.ReactNode; className?: string; variant?: Variant }) {
  return (
    <div className={`relative rounded-2xl border shadow-[0_2px_10px_rgba(2,6,23,0.05)] ${cardVariant(variant)} ${className}`}>
      {children}
    </div>
  );
}


function Eyebrow({
  children,
  color = "emerald",
}: {
  children: React.ReactNode;
  color?: "emerald" | "sky" | "amber" | "violet";
}) {
  const map: Record<"emerald" | "sky" | "amber" | "violet", string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4 }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${map[color]}`}
    >
      {children}
    </motion.span>
  );
}


function GlowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
      <span className="absolute inset-0 -z-10 rounded-lg bg-emerald-200/0 blur-[6px] transition-[background] hover:bg-emerald-200/40" />
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

// ==========================
// Shared Section Header (V4)
// ==========================

export function SectionHeader({ eyebrow, title, desc, href, cta = "Learn more", align = "left", id }: { eyebrow?: string; title: string; desc?: string; href: string; cta?: string; align?: "left" | "center"; id?: string; }) {
  const isCenter = align === "center";
  return (
    <div id={id} className={(isCenter ? "text-center " : "") + "relative"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900"
      >
        {title}
      </motion.h2>

      {desc && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={(isCenter ? "mx-auto " : "") + "mt-3 max-w-2xl text-base text-slate-600"}
        >
          {desc}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className={(isCenter ? "justify-center flex " : "mt-4 ") + "mt-4"}
      >
        <GlowLink href={href}>{cta}</GlowLink>
      </motion.div>
    </div>
  );
}

// ============================================
// 1) Revenue loss — clean, single style (white)
// ============================================

export function RevenueLossTeaser() {
  const lost = 14; // example blocks “lost”
  const total = 30;

  // Animated $ counter
  const [amount, setAmount] = useState(0);
  useEffect(() => {
    const controls = animate(0, lost * 50, { duration: 1.2, ease: "easeOut", onUpdate: (v) => setAmount(Math.round(v)) });
    return () => controls.stop();
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-20 overflow-x-clip">{/* no blue background, super clean */}
      <div className="grid items-center gap-10 md:grid-cols-2">
        <SectionHeader
          eyebrow="The silent leak"
          title="Cancellations quietly drain your month"
          desc="Cancel the slot and our appointment waitlist app handles detection, notifications, and auto-booking — end-to-end."

          href="/use-cases"
          cta="See real use cases"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-[560px]"
        >
          <Card className="p-5" variant="white">
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <motion.div
                  key={`loss-${i}`}
                  className={`h-4 rounded ${i < lost ? "bg-rose-500" : "bg-slate-200"}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: i * 0.02 }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Example month</span>
              <span className="font-semibold text-slate-900">{lost} × $50 = ${amount}/mo</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// =====================================================
// 2) How it works — ONE card style across the section
// =====================================================

export function HowItWorksTeaser() {
  const steps = [
    { t: "Cancel → Detect", d: "Delete the slot in your booking tool (Square Appointments, etc.). We detect it instantly." },
    { t: "Notify the right clients", d: "We ping eligible clients by SMS/Email at once. No spam — just fit." },
    { t: "Auto‑book the first reply", d: "Fair race. First to confirm gets the spot. Your calendar updates automatically." },
  ];
  const sectionVariant: Variant = "violet"; // ← one style for ALL cards here

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 overflow-x-clip">
      <div className="grid items-start gap-12 md:grid-cols-2">
        <SectionHeader
          eyebrow="Flow"
          title="Replace cancellations in three quick steps"
          desc="No dashboards to babysit. Cancel the slot — we take it from there."
          href="/how-it-works"
          cta="See the full flow"
          id="HowItWorks"
        />

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-slate-200/20" />
          <ul className="space-y-6">
            {steps.map((s, i) => (
              <motion.li
                key={`step-${i}`}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="relative ml-8"
              >
                <div className="absolute -left-8 top-2 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" />
                <Card className="p-5" variant={sectionVariant}>
                  <div className="text-xs font-medium text-slate-700">Step {i + 1}</div>
                  <div className="text-lg font-semibold text-slate-900">{s.t}</div>
                  <p className="mt-1 text-sm text-slate-600">{s.d}</p>
                </Card>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 3) Integrations — ONE card style (white)
// ==========================================

export function IntegrationsTeaser() {
  const items = [
    { t: "Square Appointments", badge: "Live", dim: false },
    { t: "Google Calendar", badge: "Coming soon", dim: true },
    { t: "Google Sheets", badge: "Coming soon", dim: true },
  ];
  const sectionVariant: Variant = "white"; // ← consistent here

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 overflow-x-clip">
      <div className="grid items-start gap-12 md:grid-cols-2">
        <SectionHeader
          eyebrow="Integrations"
          title="Connect your tools in minutes"
          desc="Connect Gaplets’ appointment waitlist to Square Appointments (live). Google Calendar & Sheets coming soon."

          href="/integrations"
          cta="Explore integrations"
          id="SetUp"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map((x, i) => (
            <motion.div key={`int-${i}`} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Card className={`p-5 ${x.dim ? "opacity-90" : ""}`} variant={sectionVariant}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-lg font-semibold text-slate-900">{x.t}</div>
                  <span className={`rounded-full px-3 py-1 text-xs ring-1 ${x.dim ? "bg-slate-50 text-slate-600 ring-slate-200" : "bg-emerald-100/80 text-emerald-800 ring-emerald-200"}`}>{x.badge}</span>
                </div>
                <p className="text-sm text-slate-600">{x.dim ? "Planned support with OAuth + webhooks." : "Connect, map your services, and you’re ready."}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==============================================================
// 4) Benefits — ONE style (sky) + seamless CSS marquee (no jump)
// ==============================================================

export function BenefitsMarquee() {
  const items = [
    { t: "Fully automated", d: "No manual back‑and‑forth." },
    { t: "Smart targeting", d: "Notify only eligible clients." },
    { t: "First‑come booking", d: "Auto‑book the first reply." },
    { t: "Custom rules", d: "Service, staff, timing, limits." },
    { t: "Multi‑channel", d: "SMS + Email." },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-0 py-16 overflow-x-clip">
      <SectionHeader eyebrow="Benefits" title="Built to claw back lost revenue" desc="Includes appointment waitlist automation. Start free for 7 days. Cancel anytime."
 href="/features" cta="Explore features" align="center" />

      <div className="relative mt-8 overflow-x-clip">
        {/* Track duplicated once to enable perfect wrap */}
        <div className="marquee flex w-[200%] gap-4 px-6 will-change-transform">
          {[...items, ...items].map((x, i) => (
            <div key={`benefit-${i}`} className="min-w-[260px] shrink-0">
              <Card className="p-5" variant="sky">{/* one style for this whole section */}
                <div className="text-base font-semibold text-slate-900">{x.t}</div>
                <div className="mt-1 text-sm text-slate-600">{x.d}</div>
              </Card>
            </div>
          ))}
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* Scoped keyframes for seamless marquee */}
      <style jsx>{`
        @keyframes marqueeX { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee { animation: marqueeX 28s linear infinite; }
      `}</style>
    </section>
  );
}

// ==================================================
// 5) Pricing — ONE style (emerald) + glowing CTA card
// ==================================================

export function PricingTeaserGlow() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 overflow-x-clip">
      <Card className="p-6" variant="emerald">{/* pricing uses its OWN style */}
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <SectionHeader eyebrow="Pricing" title="Simple pricing made for busy teams" desc="Start free for 7 days. Cancel anytime." href={PRICING_PATH} cta="See full plans" id="Pricing" />

          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.45 }} className="relative mx-auto w-full max-w-sm rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="text-2xl font-bold leading-none text-slate-900">$49/mo</div>
            <div className="text-sm text-slate-600">Starter — Email notifications, 20 auto‑fills/mo</div>
            <div className="mt-3 text-xs text-slate-500">Need SMS, higher limits, or priority support? Check Pro & Premium →</div>
            <div className="mt-5">
              <Link className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(0,0,0,0)] transition hover:shadow-[0_0_36px_rgba(16,185,129,0.45)] focus:outline-none focus:ring-2 focus:ring-emerald-400" href={PRICING_PATH}>
                Compare plans
              </Link>
            </div>
          </motion.div>
        </div>
      </Card>
    </section>
  );
}

// ======================================
// 6) FAQ — ONE style (clean white cards)
// ======================================

export function FAQTeaserStrip() {
  const faqs: [string, string][] = [
    ["Do I need to change my booking system?", "No. We work with Square today. Calendar/Sheets coming soon."],
    ["Do my clients need an app?", "No. They get SMS/Email and book via a link."],
    ["How fast are replacements?", "Usually within 1–2 hours when multi‑notify is enabled."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 overflow-x-clip">
      <SectionHeader eyebrow="Help" title="Frequently asked questions" href="/docs/faq" id="FAQ" />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {faqs.map(([q, a], i) => (
          <motion.article key={`faq-${i}`} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.4, delay: i * 0.06 }} className="relative">
            <Card className="p-5" variant="white">
              <h3 className="font-medium text-slate-900">{q}</h3>
              <p className="mt-1 text-sm text-slate-600">{a}</p>
              <Link href="/docs/faq" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4">Read more</Link>
            </Card>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
