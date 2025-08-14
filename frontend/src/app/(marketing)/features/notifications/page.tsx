// src/app/(marketing)/features/notifications/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Notifications | Gaplets",
  description:
    "Multi-channel outreach: SMS + Email, sent simultaneously to eligible clients.",
};

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Notifications"
        title="Right people, right away"
        desc="We notify only clients who can actually make it — first to confirm gets the spot."
        href="/features"
        cta="Back to features"
      />

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">SMS</h3>
          <p className="mt-1 text-sm text-slate-600">
            Short, fast, and high-intent. Reply “YES” to book instantly.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Email</h3>
          <p className="mt-1 text-sm text-slate-600">
            Branded templates and fallback when SMS isn’t available.
          </p>
        </div>
      </section>

      {/*
        TODO: <ChannelsShowcase />
        • Visual: 2 mockups (SMS y Email) con los textos reales que usas.
        • Función: mostrar copy y CTA del mensaje y el “first-come, first-served”.
      */}
    </main>
  );
}
