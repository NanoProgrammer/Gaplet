import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import StepsSections from "@/components/3StepsSections";

// SEO
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/features/automation` as const;
const OG_IMAGE = `${SITE_URL}/og/automation.png` as const; // asegúrate de tener esta imagen

export const metadata: Metadata = {
  title: {
    default: "Automation — Detect, notify & auto‑book last‑minute openings",
    template: "%s | Gaplets",
  },
  description:
    "Replace cancellations in three steps: detect the opening, notify eligible clients via SMS/Email, and auto‑book the first response.",
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  keywords: [
    "fill last-minute cancellations",
    "waitlist automation",
    "auto booking",
    "Square Appointments webhooks",
    "SMS email notifications",
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Automation — Detect, notify & auto‑book last‑minute openings",
    description:
      "Detect cancellations, notify the right clients, auto‑book the first response, and keep originals intact.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Automation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Automation — Detect, notify & auto‑book last‑minute openings",
    description:
      "Replace cancellations in three steps with Gaplets automation.",
    images: [OG_IMAGE],
  },
};

export default function AutomationPage() {
  // JSON-LD: HowTo + Breadcrumbs
  const howtoLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Replace a last‑minute cancellation",
    description:
      "Detect the opening, notify eligible clients, and auto‑book the first response.",
    step: [
      {
        "@type": "HowToStep",
        name: "Detect the cancellation",
        text: "Gaplets listens to your provider webhooks. When an appointment is deleted, the opening is detected instantly.",
      },
      {
        "@type": "HowToStep",
        name: "Notify eligible clients",
        text: "Email/SMS goes out in waves to clients matching your rules (same service type, inactive, or no upcoming bookings).",
      },
      {
        "@type": "HowToStep",
        name: "Auto‑book the first response",
        text: "The first to accept gets the slot; original appointment remains unless you edit it.",
      },
    ],
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
      { "@type": "ListItem", position: 3, name: "Automation", item: PAGE_URL },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Automation"
        title="Set it once. We do the busywork."
        desc="Cancel the slot in your tool — Gaplets detects it and fills it."
        href="/sign in"
        cta="Get set up"
        align="center"
      />

      <div className="mt-10">
        <StepsSections />
      </div>

      {/* SEO: JSON-LD */}
      <Script id="automation-howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howtoLd) }} />
      <Script id="automation-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
    </main>
  );
}