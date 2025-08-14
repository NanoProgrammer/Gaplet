// src/app/(marketing)/security/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Security & Compliance | Gaplets",
  description:
    "Encryption in transit & at rest, least-privilege access, and regular backups.",
};

export default function SecurityPage() {
  const items = [
    { t: "Encryption", d: "TLS 1.2+ in transit and AES-256 at rest." },
    { t: "Access control", d: "Least-privilege roles and audited actions." },
    { t: "Backups", d: "Automated encrypted backups and restore testing." },
  ];
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Security"
        title="Your data, protected by default"
        desc="We follow modern security practices and keep improving the bar."
        href="/privacy"
        cta="Privacy policy"
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {items.map((x) => (
          <div key={x.t} className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold">{x.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{x.d}</p>
          </div>
        ))}
      </div>

      {/*
        TODO: <BadgesRow />
        • Visual: badges (TLS, AES-256, Backups, etc.) estilo minimal.
        • Función: transmitir confianza en un vistazo.
      */}
    </main>
  );
}
