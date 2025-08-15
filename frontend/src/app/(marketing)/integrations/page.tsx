// src/app/(marketing)/integrations/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { SectionHeader, IntegrationsTeaser } from "@/components/home/teasers-animated";

// ────────────────────────────────────────────────────────────────────────────────
// SEO constants
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/integrations` as const;
const OG_IMAGE = `${SITE_URL}/og/integrations.png` as const; // asegúrate de tener esta imagen

export const metadata: Metadata = {
  title: { default: "Integrations — Connect Square today. Calendar & Sheets next.", template: "%s | Gaplets" },
  description: "Plug Gaplets into tools you already use. Square is live; Google Calendar and Google Sheets are coming next.",
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
    "square appointments integration",
    "google calendar integration",
    "google sheets integration",
    "fill last-minute cancellations",
    "waitlist automation",
  ],
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Integrations — Connect Square today. Calendar & Sheets next.",
    description: "Square is live. Google Calendar and Google Sheets are next.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Integrations" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrations — Connect Square today. Calendar & Sheets next.",
    description: "Plug Gaplets into tools you already use.",
    images: [OG_IMAGE],
  },
};

export default function IntegrationsPage() {
  // JSON‑LD: WebPage + Breadcrumbs + ItemList
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Gaplets Integrations",
    url: PAGE_URL,
    description: "Integrations with Square (live) and upcoming Google Calendar & Google Sheets.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Integrations", item: PAGE_URL },
    ],
  } as const;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      { "@type": "ListItem", position: 1, item: { "@type": "SoftwareApplication", name: "Square Appointments", url: `${SITE_URL}/integrations/square` } },
      { "@type": "ListItem", position: 2, item: { "@type": "SoftwareApplication", name: "Google Calendar", url: `${SITE_URL}/integrations` } },
      { "@type": "ListItem", position: 3, item: { "@type": "SoftwareApplication", name: "Google Sheets", url: `${SITE_URL}/integrations` } },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Integrations"
        title="Plug into the tools you already use"
        desc="Square is live. Google Calendar and Google Sheets are next."
        href="/integrations/square"
        cta="Connect Square"
        align="center"
      />

      {/* Existing animated teaser */}
      <div className="mt-10">
        <IntegrationsTeaser />
      </div>

      {/* SSR grid — sky for live, white for "coming soon" */}
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm" aria-labelledby="int-square-title">
          <h2 id="int-square-title" className="text-base font-semibold text-slate-900">Square (live)</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Real‑time cancellation detection via webhooks.</li>
            <li>Use Square customers for precise targeting.</li>
            <li>Auto‑book on first confirmation.</li>
          </ul>
          <div className="mt-4">
            <Link href="/signup?next=/integrations/square" className="inline-flex items-center rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100">Connect now</Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="int-gcal-title">
          <h2 id="int-gcal-title" className="text-base font-semibold text-slate-900">Google Calendar (coming soon)</h2>
          <p className="mt-2 text-sm text-slate-700">Detect deletions and invite clients to move up without leaving your calendar.</p>
          <div className="mt-4">
            <Link href="/contact" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Join waitlist</Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="int-sheets-title">
          <h2 id="int-sheets-title" className="text-base font-semibold text-slate-900">Google Sheets (coming soon)</h2>
          <p className="mt-2 text-sm text-slate-700">Bring your own list and let Gaplets handle waves and booking.</p>
          <div className="mt-4">
            <Link href="/contact" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Join waitlist</Link>
          </div>
        </article>
      </div>

      <p className="mt-8 text-sm text-slate-600">
        Want another integration? <Link href="/contact" className="underline">Tell us</Link>.
      </p>

      {/* SEO: JSON‑LD */}
      <Script id="integrations-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="integrations-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Script id="integrations-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </main>
  );
}
