// src/app/(marketing)/features/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import { FeaturesGrid } from "@/components/features/FeaturesGrid";

// ────────────────────────────────────────────────────────────────────────────────
// SEO: page-specific metadata
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/features` as const;
const OG_IMAGE = `${SITE_URL}/og/features.png` as const;

export const metadata: Metadata = {
  title: {
    default: "Appointment Waitlist Features — Automation, Notifications, Rules, Analytics",
    template: "%s | Gaplets",
  },
  description:
    "Automate last‑minute cancellation recovery with an appointment waitlist: detect openings, notify eligible clients via SMS/Email, auto‑book, and track recovered revenue.",
  alternates: { canonical: "https://gaplets.com/features" },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  keywords: [
    "appointment waitlist",
    "waitlist automation",
    "fill last-minute cancellations",
    "Square Appointments integration",
    "SMS email notifications",
    "eligibility rules",
    "auto booking",
    "recovered revenue analytics",
  ],
  openGraph: {
    type: "website",
    url: "https://gaplets.com/features",
    siteName: "Gaplets",
    title: "Appointment Waitlist Features — Automation, Notifications, Rules, Analytics",
    description:
      "Detect cancellations, notify the right clients, auto‑book, and measure results.",
    images: [{ url: "https://gaplets.com/og/features.png", width: 1200, height: 630, alt: "Gaplets Features" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Appointment Waitlist Features — Automation, Notifications, Rules, Analytics",
    description:
      "Automate cancellation recovery: detect, notify, auto‑book, and track ROI.",
    images: ["https://gaplets.com/og/features.png"],
  },
};

const PRICING_PATH = "/price" as const;

// ✅ Only existing routes
const CARDS = [
  { title: "Automation", desc: "Detect cancellations and auto-fill while you keep working.", href: "/features/automation", icon: "Zap" },
  { title: "Notifications", desc: "Reach eligible clients via SMS/Email at the same time.", href: "/features/notifications", icon: "BellRing" },
  { title: "Square integration", desc: "OAuth + webhooks for instant detection.", href: "/integrations/square", icon: "Plug" },
  { title: "Privacy & security", desc: "Least-privilege scopes. Data encrypted in transit and at rest.", href: "/security", icon: "ShieldCheck" },
] as const;

export default function FeaturesPage() {
  // JSON-LD: WebPage + BreadcrumbList + ItemList (reflecting fixed links)
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Gaplets Features",
    url: PAGE_URL,
    description:
      "Automate last‑minute cancellation recovery: detect openings, notify eligible clients via SMS/Email, auto‑book, and track recovered revenue.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: PAGE_URL },
    ],
  } as const;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: CARDS.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Thing",
        name: c.title,
        url: c.href.startsWith("/")
          ? `${SITE_URL}${c.href}`
          : `${PAGE_URL}${c.href}`,
      },
    })),
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
  eyebrow="Product"
  title="Appointment Waitlist — All the building blocks"
  desc="From detection to auto‑booking — simple, fast, and reliable."
  href={PRICING_PATH}
  cta="View pricing"
  align="center"
/>

      {/* Motion grid (client) */}
      <FeaturesGrid items={CARDS} />

      {/* Detail sections (SSR) */}
      <div className="mt-16 grid gap-6">
        <section id="automation" aria-labelledby="automation-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="automation-title" className="text-base font-semibold text-slate-900">Automation</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Real-time cancellation detection via provider webhooks.</li>
            <li>Automatic replacement: first to accept gets the slot; originals stay intact.</li>
            <li>Optional grace window and retry waves if no one accepts.</li>
          </ul>
        </section>

        <section id="notifications" aria-labelledby="notifications-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="notifications-title" className="text-base font-semibold text-slate-900">Notifications</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>SMS and/or Email sent simultaneously to eligible clients.</li>
            <li>Waves stop immediately when a client books the opening.</li>
            <li>Smart throttling to avoid spam and preserve deliverability.</li>
          </ul>
        </section>

        <section id="rules" aria-labelledby="rules-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="rules-title" className="text-base font-semibold text-slate-900">Eligibility rules</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Same service type only (toggleable) or broader audiences.</li>
            <li>Inactive clients (hasn’t booked in X days) or no upcoming bookings.</li>
            <li>Clients with a future booking who want to move up.</li>
            <li>Filters by provider, time window, location/day, and caps per wave.</li>
          </ul>
        </section>

        <section id="metrics" aria-labelledby="metrics-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="metrics-title" className="text-base font-semibold text-slate-900">Metrics & logs</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Recovered revenue vs. lost gaps.</li>
            <li>Response rate and average time to fill.</li>
            <li>OpenSlot and ReplacementLog for reconciliation and audits.</li>
          </ul>
        </section>

        <section id="security" aria-labelledby="security-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="security-title" className="text-base font-semibold text-slate-900">Privacy & security</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>OAuth scopes kept to least privilege.</li>
            <li>Data encrypted in transit and at rest.</li>
            <li>Clear data retention and access logs.</li>
          </ul>
        </section>
      </div>

      {/* Footer CTA (existing routes only) */}
      <div className="mt-16 rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">
          Ready to recover lost revenue? {""}
          <Link href={PRICING_PATH} className="font-medium underline underline-offset-4">Pick a plan</Link>{" "}
          or {""}
          <Link href="/integrations/square" className="font-medium underline underline-offset-4">Connect Square</Link>.
        </p>
      </div>

      {/* SEO: JSON-LD */}
      <Script id="features-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="features-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Script id="features-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </main>
  );
}
