// src/app/(marketing)/use-cases/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Use cases | Gaplets",
  description:
    "From clinics to barbers & spas — if cancellations hurt, Gaplets helps.",
};

export default function UseCasesPage() {
  const cards = [
    {
      t: "Clinics",
      d: "Dentists, physiotherapy, chiropractic — high-value slots refilled quickly.",
      href: "/use-cases#clinics", // puedes crear subpáginas más adelante
    },
    {
      t: "Barbers & Spas",
      d: "Keep chairs and rooms full even when things change last minute.",
      href: "/use-cases#barbers-spas",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Where Gaplets shines"
        title="Built for local services"
        desc="If your schedule matters and no-shows hurt — you can win those minutes back."
        href="/testimonials"
        cta="See testimonials"
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.t}
            href={c.href}
            className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-semibold">{c.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{c.d}</p>
            <span className="mt-3 inline-block text-emerald-700 font-medium">
              Learn more →
            </span>
          </Link>
        ))}
      </div>

      {/*
        TODO (opcional futuro):
        • Crear subrutas /use-cases/clinics y /use-cases/barbers-spas
        • Cada una con métricas/ejemplos específicos (valor por cita, % de reemplazo, etc.).
      */}
    </main>
  );
}
