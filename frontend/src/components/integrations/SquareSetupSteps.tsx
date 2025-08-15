"use client";

import * as React from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import { Plug, ListChecks, BellRing } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

const STEPS = [
  {
    k: "connect",
    icon: Plug,
    title: "Connect Square",
    desc: "OAuth in a minute. We start listening to cancellations instantly.",
    cta: { href: "/signup?next=/integrations/square", label: "Connect now" },
  },
  {
    k: "services",
    icon: ListChecks,
    title: "Choose services & rules",
    desc: "Limit by service type, provider, time window, and audience caps.",
    cta: { href: "/features#rules", label: "Review rules" },
  },
  {
    k: "notify",
    icon: BellRing,
    title: "Enable notifications",
    desc: "SMS/Email waves to eligible customers. Stop on first booking.",
    cta: { href: "/features/notifications", label: "Configure notifications" },
  },
] as const;

export default function SquareSetupSteps() {
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
            <article className="h-full rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <header className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-[15px] font-semibold text-slate-900">{s.title}</h3>
              </header>
              <p className="mt-2 text-sm text-slate-700">{s.desc}</p>
              <div className="mt-4">
                <Link href={s.cta.href} className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100">
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
