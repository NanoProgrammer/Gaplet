"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import { Stethoscope, Scissors, HeartPulse, Brush, Sparkles, PenTool, PawPrint, Dumbbell, Car } from "lucide-react";
import Link from "next/link";

export type UseCaseCard = {
  k: string;
  t: string;
  d: string;
  href: string;
  icon?: "Stethoscope" | "Scissors" | "HeartPulse" | "Brush" | "Sparkles" | "PenTool" | "PawPrint" | "Dumbbell" | "Car";
};

const icons = { Stethoscope, Scissors, HeartPulse, Brush, Sparkles, PenTool, PawPrint, Dumbbell, Car } as const;

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };

export default function UseCasesGrid({ items }: { items: readonly UseCaseCard[] }) {
  const data = React.useMemo(() => items, [items]);
  return (
    <LazyMotion features={domAnimation} strict>
      <m.ul variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => {
          const Icon = c.icon ? icons[c.icon] : Stethoscope;
          return (
            <m.li key={c.k} variants={fadeUp} className="list-none">
              <Link
                href={c.href}
                className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                aria-label={`Learn more about ${c.t}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">{c.t}</h3>
                    <p className="mt-1 text-sm text-slate-700">{c.d}</p>
                    <span className="mt-2 inline-flex items-center text-sm font-medium text-emerald-700 underline underline-offset-4">Learn more →</span>
                  </div>
                </div>
              </Link>
            </m.li>
          );
        })}
      </m.ul>
    </LazyMotion>
  );
}
