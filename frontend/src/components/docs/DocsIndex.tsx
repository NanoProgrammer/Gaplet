// components/docs/DocsIndex.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Plug,
  CreditCard,
  Zap,
  BellRing,
  BarChart3,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export type DocCard = {
  t: string;
  d: string;
  href: string;
  icon?: string; // lucide icon name string — mapped below
  aria?: string;
};

export function DocsIndex({
  primary,
  guides,
  quickStartHref,
}: {
  primary: readonly DocCard[];
  guides: readonly DocCard[];
  quickStartHref: string;
}) {
  return (
    <div className="mt-8">
      <LazyMotion features={domAnimation} strict>
        <Section id="primary" title="Start here" desc="Connect Square, review FAQ, and understand pricing.">
          <MotionGrid cols="sm:grid-cols-3">
            {primary.map((item) => (
              <CardItem key={item.t} item={item} />
            ))}
          </MotionGrid>
        </Section>

        <QuickStart href={quickStartHref} />

        <Section id="guides" title="Popular guides" desc="Recover revenue with clear, scannable steps.">
          <MotionGrid cols="sm:grid-cols-2">
            {guides.map((item) => (
              <CardItem key={item.t} item={item} />
            ))}
          </MotionGrid>
        </Section>

        {/* Footer CTA → SOLO rutas existentes */}
        <m.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
        >
          <h3 className="text-base font-semibold text-slate-900">Need more details?</h3>
          <p className="mt-1 text-sm text-slate-600">Browse the FAQ or pick a plan when you’re ready.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button asChild className="rounded-xl">
              <Link href="/docs/faq">Visit FAQ</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/price">View pricing</Link>
            </Button>
          </div>
        </m.div>
      </LazyMotion>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// UI — motion + cards
// ────────────────────────────────────────────────────────────────────────────────

const icons = {
  BookOpen,
  Plug,
  CreditCard,
  Zap,
  BellRing,
  BarChart3,
  ShieldCheck,
} as const;

type IconName = keyof typeof icons;

const EASE = [0.22, 1, 0.36, 1] as const; // smooth cubic-bezier
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.35, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16">
      <div className="mb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-slate-900">{title}</h2>
        {desc ? <p className="text-sm text-slate-600">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MotionGrid({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <m.ul
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={classNames("grid gap-6", cols)}
    >
      {children}
    </m.ul>
  );
}

function CardItem({ item }: { item: DocCard }) {
  const Icon = item.icon && (icons as any)[item.icon as IconName];
  const IconCmp = Icon ?? BookOpen;
  return (
    <m.li variants={fadeUp} className="list-none">
      <Link
        href={item.href}
        aria-label={item.aria ?? item.t}
        className={classNames(
          "group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:bg-slate-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
            <IconCmp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-[15px] font-medium text-slate-900">{item.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.d}</p>
            <span className="mt-2 inline-flex items-center text-sm font-medium text-sky-700 underline underline-offset-4">
              Open <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </m.li>
  );
}

function QuickStart({ href }: { href: string }) {
  return (
    <Section id="quickstart" title="Quick start" desc="Recover revenue in three steps.">
      <m.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white/60 px-2 py-1 text-[11px] font-medium text-emerald-700">
              <Zap className="h-3.5 w-3.5" /> Live in minutes
            </div>
            <h3 className="text-base font-semibold text-emerald-900">Connect Square → set rules → send a test</h3>
            <p className="mt-1 text-sm text-emerald-800/90">
              Gaplets detects cancellations in real time, pings eligible clients, and the first to accept books the slot. Originals stay intact unless you choose to edit.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={href} aria-label="Open Quick start: Square integration">Connect Square</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100">
              <Link href="/docs/faq">Read the FAQ</Link>
            </Button>
          </div>
        </div>
      </m.div>
    </Section>
  );
}
