// src/app/(marketing)/features/automation/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";
import StepsSections from "@/components/3StepsSections";

export const metadata: Metadata = {
  title: "Automation | Gaplets",
  description:
    "Replace cancellations in three steps: detect → notify → auto-book.",
};

export default function AutomationPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Automation"
        title="Set it once. We do the busywork."
        desc="Cancel the slot in your tool — Gaplets detects it and fills it."
        href="/how-it-works"
        cta="See the full flow"
      />

      {/* Reutiliza tu sección animada de 3 pasos */}
      <div className="mt-10">
        <StepsSections />
      </div>

      {/*
        TODO: <RulesMini /> — Pequeño bloque con “If/Then rules”.
        • Visual: tarjeta con chips: IF service=X AND staff=Y THEN notify group=Z.
        • Función: enseñar que puedes personalizar targeting/tiempos/servicios.
      */}
    </main>
  );
}
