import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import QuickStart from "@/components/how-it-works/QuickStart";

// ────────────────────────────────────────────────────────────────────────────────
// SEO constants
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/how-it-works` as const;
const OG_IMAGE = `${SITE_URL}/og/how-it-works.png` as const; // ensure this asset exists

export const metadata: Metadata = {
  title: {
    default: "How it works — Cancel → detect → notify → auto‑book",
    template: "%s | Gaplets",
  },
  description:
    "From cancellation to confirmed booking: detection, eligibility targeting, simultaneous SMS/Email, and auto‑booking.",
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
    "appointment waitlist",
    "fill last-minute cancellations",
    "cancellation recovery",
    "Square Appointments waitlist",
    "sms email booking notifications",
    "auto booking",
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "How it works — Cancel → detect → notify → auto‑book",
    description:
      "See the 3‑step flow to replace last‑minute cancellations and keep your calendar full.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "How Gaplets works" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How it works — Cancel → detect → notify → auto‑book",
    description:
      "From cancellation to confirmed booking: detection, targeting, notifications, and auto‑booking.",
    images: [OG_IMAGE],
  },
};

export default function HowItWorksPage() {
  // JSON‑LD: HowTo + BreadcrumbList
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
        text: "Gaplets listens to provider webhooks. When an appointment is deleted, the opening is detected instantly.",
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
      { "@type": "ListItem", position: 2, name: "How it works", item: PAGE_URL },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">

       <Script id="howitworks-howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howtoLd) }} />
       <Script id="howitworks-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <SectionHeader
        eyebrow="Flow"
        title="From cancellation to confirmed booking"
        desc="Under the hood: detection, targeting, and an instant race to confirm."
        href="/features"
        cta="Explore features"
        align="center"
      />

      <div className="mt-10">
        <QuickStart />
      </div>
      {/* Extra content (SSR, white variant) */}
      <div className="mt-16 grid gap-6">
        {/* Setup checklist */}
        <section id="setup-checklist" aria-labelledby="setup-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="setup-title" className="text-base font-semibold text-slate-900">Setup checklist</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <span className="font-medium">Connect Square.</span> Authorize access so we can detect cancellations in real time. <a href="/integrations/square" className="underline underline-offset-4">Open Square integration</a>.
            </li>
            <li>
              <span className="font-medium">Set eligibility rules.</span> Target only clients who can actually make it (same service type, inactive, no upcoming booking, provider/time filters). <a href="/features#rules" className="underline underline-offset-4">See rules</a>.
            </li>
            <li>
              <span className="font-medium">Enable notifications.</span> Choose SMS/Email, quiet hours, and caps. Waves stop on first booking. <a href="/features/notifications" className="underline underline-offset-4">Configure notifications</a>.
            </li>
          </ol>
        </section>

        {/* Speed & reliability */}
        <section id="speed" aria-labelledby="speed-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="speed-title" className="text-base font-semibold text-slate-900">Speed & reliability</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-lg font-semibold text-slate-900">&lt; 10s</div>
              <div className="text-xs text-slate-600">Cancellation detection</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-lg font-semibold text-slate-900">&lt; 30s</div>
              <div className="text-xs text-slate-600">First notification wave</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-lg font-semibold text-slate-900">1–2h</div>
              <div className="text-xs text-slate-600">Typical time to fill</div>
            </div>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Retry & backoff on webhooks; surfaced errors with clear fixes.</li>
            <li>Quiet hours and daily caps to protect your sender reputation.</li>
            <li>Automatic stop after the first confirmed booking.</li>
          </ul>
        </section>

        {/* Next steps */}
        <section id="next-steps" aria-labelledby="next-title" className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 id="next-title" className="text-base font-semibold text-slate-900">Next steps</h2>
          <p className="mt-1 text-sm text-slate-600">Ready to go live? Connect Square or review pricing.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <a href="/integrations/square" className="inline-flex items-center rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Connect Square</a>
            <a href="/price" className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50">View pricing</a>
          </div>
        </section>
      </div>
      {/* SEO: JSON‑LD */}
      <Script id="howitworks-howto-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howtoLd) }} />
      <Script id="howitworks-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
    </main>
  );
}
