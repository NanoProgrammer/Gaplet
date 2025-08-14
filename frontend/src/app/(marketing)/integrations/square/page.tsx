// src/app/(marketing)/integrations/square/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Square Integration | Gaplets",
  description:
    "Use your Square customers & appointments to auto-fill last-minute gaps.",
};

export default function SquareIntegrationPage() {
  const bullets = [
    "Detect cancellations from your Square calendar.",
    "Target eligible customers using your Square profiles.",
    "Send SMS/Email simultaneously and auto-book the first reply.",
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Square"
        title="No new system to learn — just connect Square"
        desc="Gaplets lives alongside your Square workflow and fills cancellations automatically."
        href="/signup"
        cta="Connect Square"
      />

      <ul className="mt-8 space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-slate-700">
            <span className="text-emerald-600">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Link href="/signup" className="inline-block rounded-lg bg-emerald-600 px-5 py-2 text-white font-semibold">
          Start free
        </Link>
      </div>

      {/*
        TODO: <SquareSetupSteps />
        • Visual: 3 pasos cortos con capturas (Connect → Choose services → Go live).
        • Función: dar claridad de onboarding y tiempo de implementación.
      */}
    </main>
  );
}
