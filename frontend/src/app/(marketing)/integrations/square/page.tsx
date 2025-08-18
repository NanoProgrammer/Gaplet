import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";
import SquareSetupSteps from "@/components/integrations/SquareSetupSteps";

// SEO constants
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/integrations/square` as const;
const OG_IMAGE = `${SITE_URL}/og/integrations-square.png` as const; // asegúrate de tener esta imagen

export const metadata: Metadata = {
  title: { default: "Square Integration — Waitlist & cancellation recovery for Square Appointments",
     template: "%s | Gaplets"
   },
  description: "Use your Square customers & appointments to auto‑fill last‑minute gaps. Connect, set rules, and go live in minutes.",
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
    "Square Appointments integration",
    "Square Appointments waitlist",
    "fill last-minute cancellations",
    "waitlist automation",
    "sms email notifications",
    "auto booking"
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Square Integration — One‑click connect, instant detection",
    description: "Detect cancellations from your Square calendar and auto‑book the first client to accept.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets × Square" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Square Integration — One‑click connect, instant detection",
    description: "Connect Square, set rules, notify by SMS/Email, and auto‑book openings.",
    images: [OG_IMAGE],
  },
};

const bullets = [
  "Detect cancellations from your Square calendar in real time.",
  "Target eligible customers using your Square profiles and rules.",
  "Send SMS/Email simultaneously and auto‑book the first reply.",
] as const;

const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Gaplets",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: PAGE_URL,
    description: "Appointment waitlist & cancellation recovery integrated with Square Appointments.",
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      description: "7‑day free trial available",
      url: `${SITE_URL}/price`,
    },
    provider: { "@type": "Organization", name: "Gaplets" },
  } as const;
export default function SquareIntegrationPage() {
  // JSON‑LD: Breadcrumbs + HowTo (connect Square)
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Integrations", item: `${SITE_URL}/integrations` },
      { "@type": "ListItem", position: 3, name: "Square", item: PAGE_URL },
    ],
  } as const;

  const howtoLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Connect Square to Gaplets",
    description: "Authorize Square, set eligibility rules, and enable notifications to recover cancellations automatically.",
    step: [
      { "@type": "HowToStep", name: "Connect Square", text: "Authorize Square so we can detect cancellations instantly." },
      { "@type": "HowToStep", name: "Choose services & rules", text: "Target the right customers (same service type, inactive, or no upcoming booking)." },
      { "@type": "HowToStep", name: "Enable notifications", text: "Send SMS/Email in waves and stop on first booking." },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <Script id="square-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
       <Script id="square-howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howtoLd) }} />
      <Script id="square-softwareapp-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }} />
      <SectionHeader
        eyebrow="Square"
        title="No new system to learn — just connect Square"
        desc="Gaplets lives alongside your Square workflow and fills cancellations automatically."
        href="/signup?next=/integrations/square" // onboarding recomendado
        cta="Connect Square"
        align="center"
      />

      {/* Key points */}
      <ul className="mt-8 space-y-3" aria-label="Highlights">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-slate-700">
            <span className="text-emerald-600" aria-hidden>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* 3‑step quick start (sky variant for live integration) */}
      <div className="mt-10">
        <SquareSetupSteps />
      </div>

      {/* Support & next steps */}
      <div className="mt-12 grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="support-title">
          <h2 id="support-title" className="text-base font-semibold text-slate-900">Need help?</h2>
          <p className="mt-1 text-sm text-slate-700">Short answers and setup notes live in the Help Center.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/docs/faq" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Read FAQ</Link>
            <Link href="/features#rules" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Review rules</Link>
            <Link href="/features/notifications" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">Configure notifications</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" aria-labelledby="cta-title">
          <h2 id="cta-title" className="text-base font-semibold text-slate-900">Ready to recover lost revenue?</h2>
          <p className="mt-1 text-sm text-slate-600">Connect Square or review pricing.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link href="/signup?next=/integrations/square" className="inline-flex items-center rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Connect Square</Link>
            <Link href="/price" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">View pricing</Link>
          </div>
        </section>
      </div>

      {/* SEO: JSON‑LD */}
      <Script id="square-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Script id="square-howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howtoLd) }} />
    </main>
  );
}
