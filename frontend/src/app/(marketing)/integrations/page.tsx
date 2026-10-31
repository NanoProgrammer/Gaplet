// src/app/(marketing)/integrations/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import IntegrationsDirectory from "@/components/integrations/IntegrationsDirectory";
import { INTEGRATIONS, INDUSTRIES } from "@/data/integrations";

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
    "square appointments waitlist",
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
    itemListElement: INTEGRATIONS.filter((i) => i.status !== "planned").map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: { "@type": "SoftwareApplication", name: i.name, url: i.href ? `${SITE_URL}${i.href}` : PAGE_URL },
    })),
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Integrations"
        title="Plug into the tools you already use"
        desc={`Browse ${INTEGRATIONS.length}+ booking tools across ${Object.keys(INDUSTRIES).length - 1} industries. Square is live; the rest are rolling out based on demand.`}
        href="/integrations/square"
        cta="Connect Square"
        align="center"
      />

      <div className="mt-10">
        <IntegrationsDirectory />
      </div>

      <p className="mt-8 text-sm text-slate-600">
        Can’t find your booking software? <a href="mailto:support@gaplets.com?subject=Integration%20request" className="underline">Tell us</a> — requests decide what we build next.
      </p>

      {/* SEO: JSON‑LD */}
      <Script id="integrations-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="integrations-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Script id="integrations-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </main>
  );
}
