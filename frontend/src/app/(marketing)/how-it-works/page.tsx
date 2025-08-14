// src/app/(marketing)/how-it-works/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";
import StepsSections from "@/components/3StepsSections";
import Demo from "@/components/Demo";

export const metadata: Metadata = {
  title: "How it works | Gaplets",
  description:
    "Cancel → detect → notify → auto-book. The simplest way to recover revenue.",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Flow"
        title="From cancellation to confirmed booking"
        desc="Under the hood: detection, targeting, and an instant race to confirm."
        href="/features"
        cta="Explore features"
      />

      <div className="mt-10">
        <StepsSections />
      </div>

      <div className="mt-16">
        <Demo />
      </div>

      {/*
        TODO: <LatencyStrip />
        • Visual: 3 chips con tiempos típicos (detection <10s, notify <30s, fill <1–2h).
        • Función: dar expectativas de velocidad real.
      */}
    </main>
  );
}
