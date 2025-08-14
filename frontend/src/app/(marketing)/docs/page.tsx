// src/app/(marketing)/docs/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  title: "Help Center | Gaplets",
  description: "Setup guides, FAQs, and troubleshooting.",
};

export default function DocsHubPage() {
  const links = [
    { t: "FAQ", d: "Common questions about setup and billing.", href: "/docs/faq" },
    { t: "Square", d: "How to connect and go live.", href: "/integrations/square" },
    { t: "Pricing & billing", d: "Plans, trials, and invoices.", href: "/price" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Docs"
        title="Help Center"
        desc="Short guides to get you live in minutes."
        href="/contact"
        cta="Still need help?"
        align="center"
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {links.map((x) => (
          <Link
            key={x.t}
            href={x.href}
            className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-semibold">{x.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{x.d}</p>
          </Link>
        ))}
      </div>

      {/*
        TODO: <SearchBar />
        • Visual: input con icono y “Search docs…”.
        • Función: filtrar artículos cuando añadas más documentación o MDX.
      */}
    </main>
  );
}
