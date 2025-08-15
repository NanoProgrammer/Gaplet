"use client";

import * as React from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import { MessageSquare, Mail, ChevronRight } from "lucide-react";

export function NotificationsShowcase() {
  const EASE = [0.22, 1, 0.36, 1] as const;
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
  };
  const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

  const items = React.useMemo(
    () => [
      {
        key: "sms",
        icon: MessageSquare,
        title: "SMS",
        body: "Short and high-intent. One-tap confirm via secure link.",
        mock: {
          heading: "Last-minute opening · 3:30 PM",
          line1: "Hi Alex — a spot just opened for Massage (45m).",
          line2: "Reply YES or tap to book now:",
          cta: "Book the 3:30 PM slot",
        },
      },
      {
        key: "email",
        icon: Mail,
        title: "Email",
        body: "Branded template. Fallback when SMS isn’t available.",
        mock: {
          heading: "You’ve got a last-minute opening",
          line1: "A 3:30 PM slot is available today for Massage (45m).",
          line2: "First come, first served.",
          cta: "Reserve this opening",
        },
      },
    ],
    []
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <m.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-10 grid gap-6 sm:grid-cols-2"
      >
        {items.map((it) => (
          <m.li key={it.key} variants={fadeUp} className="list-none">
            <article className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
                  <it.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">{it.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{it.body}</p>
                </div>
              </header>

              {/* Mock bubble */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{it.mock.heading}</p>
                <p className="mt-1 text-sm text-slate-700">{it.mock.line1}</p>
                <p className="mt-1 text-xs text-slate-600">{it.mock.line2}</p>
                <Link
                  href="/integrations/square"
                  className="mt-3 inline-flex items-center rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  aria-label={`${it.title} demo CTA → Integrations · Square`}
                >
                  {it.mock.cta} <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          </m.li>
        ))}
      </m.ul>
    </LazyMotion>
  );
}