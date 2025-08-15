"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";

export type WallItem = {
  id: string;
  name: string;
  role: string;
  org: string;
  sector: string;
  quote: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } } };

export default function TestimonialsWall({ items }: { items: readonly WallItem[] }) {
  // Keep stable array to avoid Framer warning
  const data = React.useMemo(() => items, [items]);

  return (
    <LazyMotion features={domAnimation} strict>
      <m.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {data.map((t) => (
          <m.li key={t.id} variants={fadeUp} className="list-none">
            <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-800">“{t.quote}”</p>
              <footer className="mt-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{t.name}</div>
                  <div className="truncate text-xs text-slate-600">{t.role} · {t.org}</div>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">{t.sector}</span>
              </footer>
            </article>
          </m.li>
        ))}
      </m.ul>
    </LazyMotion>
  );
}
