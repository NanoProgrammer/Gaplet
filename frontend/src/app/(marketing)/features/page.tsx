// src/app/(marketing)/features/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Features | Gaplets",
  description:
    "Automation to replace last-minute cancellations: detect, notify, and auto-book.",
};

export default function FeaturesPage() {
  const cards = [
    {
      title: "Automation",
      desc:
        "Detect cancellations and auto-fill them while you keep working.",
      href: "/features/automation",
    },
    {
      title: "Notifications",
      desc:
        "Reach eligible clients via SMS/Email at the same time. No spam.",
      href: "/features/notifications",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Product"
        title="All the building blocks to recover revenue"
        desc="From detection to auto-booking — simple, fast, and reliable."
        href="/how-it-works"
        cta="See how it works"
        align="center"
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{c.desc}</p>
            <span className="mt-3 inline-block text-emerald-700 font-medium">
              Learn more →
            </span>
          </Link>
        ))}
      </div>

      {/*
        TODO: <FeatureGrid /> — Componente de cards con icono + título + 2 bullets.
        • Visual: grid 2–3 col, icono en círculo suave, hover con sombra.
        • Función: listar 6–8 micro-beneficios (targeting, reglas, canales, etc.).
      */}
    </main>
  );
}
