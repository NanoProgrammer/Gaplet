"use client";

import * as React from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import { Plug, Settings2, Send } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };

const STEPS = [
  {
    k: "connect",
    icon: Plug,
    title: "Connect Square",
    desc: "Authorize Square so we can detect cancellations instantly.",
    cta: { href: "/integrations/square", label: "Connect Square" },
  },
  {
    k: "rules",
    icon: Settings2,
    title: "Set eligibility rules",
    desc: "Only notify clients who match your criteria (same service, inactive, no upcoming booking).",
    cta: { href: "/features#rules", label: "See rules" },
  },
  {
    k: "test",
    icon: Send,
    title: "Send a test",
    desc: "Trigger a sample opening to verify notifications and booking.",
    cta: { href: "#Demo", label: "Open Demo" }, // interno, ya tienes <Demo id="Demo" />
  },
] as const;

export default function QuickStart() {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-6 md:grid-cols-3"
      >
        {STEPS.map((s) => (
          <m.li key={s.k} variants={fadeUp} className="list-none">
            <article className="h-full rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
              <header className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-[15px] font-semibold text-slate-900">{s.title}</h3>
              </header>
              <p className="mt-2 text-sm text-slate-700">{s.desc}</p>
              <div className="mt-4">
                <Link
                  href={s.cta.href}
                  className="inline-flex items-center rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
                >
                  {s.cta.label}
                </Link>
              </div>
            </article>
          </m.li>
        ))}
      </m.ol>
    </LazyMotion>
  );
}
