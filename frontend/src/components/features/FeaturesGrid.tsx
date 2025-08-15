"use client";

import * as React from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import {
  Zap,
  BellRing,
  Settings2,
  Plug,
  BarChart3,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

type Item = { title: string; desc: string; href: string; icon?: string };

const icons = { Zap, BellRing, Settings2, Plug, BarChart3, ShieldCheck } as const;

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function FeaturesGrid({ items }: { items: readonly Item[] }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-6 sm:grid-cols-2"
      >
        {items.map((it) => (
          <Card key={it.title} item={it} />
        ))}
      </m.ul>
    </LazyMotion>
  );
}

function Card({ item }: { item: Item }) {
  const Icon = (icons as any)[item.icon as keyof typeof icons] ?? Zap;
  const isAnchor = item.href.startsWith("#");
  const Label = (
    <span className="mt-3 inline-flex items-center text-emerald-700 font-medium">
      Learn more <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
    </span>
  );

  return (
    <m.li variants={fadeUp} className="list-none">
      <Link
        href={item.href as any}
        className={classNames(
          "block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        )}
        aria-label={`${item.title} — Learn more`}
        scroll={isAnchor}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
            {Label}
          </div>
        </div>
      </Link>
    </m.li>
  );
}
