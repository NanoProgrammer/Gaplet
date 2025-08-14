// src/app/(marketing)/integrations/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader, IntegrationsTeaser } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Integrations | Gaplets",
  description:
    "Connect Square today. Calendar & Sheets coming next.",
};

export default function IntegrationsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Integrations"
        title="Plug into the tools you already use"
        desc="Square is live. Google Calendar and Google Sheets are next."
        href="/integrations/square"
        cta="Square →"
      />

      <div className="mt-10">
        <IntegrationsTeaser />
      </div>

      <p className="mt-8 text-sm text-slate-600">
        Want another integration?{" "}
        <Link href="/contact" className="underline">Tell us</Link>.
      </p>

      {/*
        TODO: <LogosRow />
        • Visual: fila de logos (Square, Google Calendar, Google Sheets).
        • Función: reforzar confianza y roadmap.
      */}
    </main>
  );
}
