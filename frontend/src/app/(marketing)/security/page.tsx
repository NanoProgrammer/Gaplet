// src/app/(marketing)/security/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";

// ────────────────────────────────────────────────────────────────────────────────
// SEO constants
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/security` as const;
const OG_IMAGE = `${SITE_URL}/og/security.png` as const; // asegúrate de tener esta imagen

export const metadata: Metadata = {
  title: { default: "Security & Compliance — Encryption, least privilege, backups", template: "%s | Gaplets" },
  description: "Encryption in transit & at rest, least‑privilege access, OAuth scopes, and encrypted backups with restore testing.",
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  keywords: [
    "security",
    "privacy",
    "encryption at rest",
    "encryption in transit",
    "least privilege",
    "backups",
    "oauth scopes",
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Security & Compliance — Encryption, least privilege, backups",
    description: "Your data is protected by default: TLS in transit, AES‑256 at rest, least‑privilege access, and encrypted backups.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Security" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Compliance — Encryption, least privilege, backups",
    description: "Modern security practices: encryption, access control, OAuth scopes, and backups.",
    images: [OG_IMAGE],
  },
};

const ITEMS = [
  { t: "Encryption", d: "TLS 1.2+ in transit and AES‑256 at rest. Secrets stored in a managed key service." },
  { t: "Least‑privilege access", d: "Role‑based permissions; production access is limited and auditable." },
  { t: "Backups", d: "Automated encrypted backups with periodic restore drills." },
  { t: "OAuth scopes", d: "We only request the minimum Square scopes required to detect openings and book replacements." },
  { t: "Data retention", d: "You control your data. We retain only what’s needed for operation and billing." },
  { t: "Logging & audit", d: "Key events are logged (openings, notifications, replacements) to aid reconciliation." },
  { t: "Reliability", d: "Queue‑based processing with retries and backoff; webhook failures surfaced for quick fixes." },
  { t: "Incident response", d: "Documented procedures and customer notification according to our policy." },
] as const;

export default function SecurityPage() {
  // JSON‑LD: WebPage + Breadcrumbs
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Security & Compliance",
    url: PAGE_URL,
    description: "Encryption in transit & at rest, least‑privilege access, OAuth scopes, and encrypted backups with restore testing.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Security", item: PAGE_URL },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Security"
        title="Your data, protected by default"
        desc="We follow modern security practices and keep raising the bar."
        href="/privacy"
        cta="Privacy policy"
        align="center"
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((x) => (
          <article key={x.t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">{x.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{x.d}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="contact-title">
          <h2 id="contact-title" className="text-base font-semibold text-slate-900">Questions or reports</h2>
          <p className="mt-1 text-sm text-slate-700">
            Found a security issue or have a question? Reach out and select the “Security” topic.
          </p>
          <div className="mt-3">
            <Link href="/contact" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Contact us</Link>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-base font-semibold text-slate-900">Privacy & FAQ</h2>
          <p className="mt-1 text-sm text-slate-700">See how we handle data and answer common questions.</p>
          <div className="mt-3 flex gap-3">
            <Link href="/privacy" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Privacy policy</Link>
            <Link href="/docs/faq#security" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Security FAQ</Link>
          </div>
        </section>
      </div>

      {/* SEO: JSON‑LD */}
      <Script id="security-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="security-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
    </main>
  );
}
