import type { Metadata } from "next";
import Script from "next/script";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";
import Demo from "@/components/Demo";
import CTA from "@/components/CTA";
import {
  RevenueLossTeaser,
  HowItWorksTeaser,
  IntegrationsTeaser,
  BenefitsMarquee,
  PricingTeaserGlow,
  FAQTeaserStrip,
} from "@/components/home/teasers-animated";

export const metadata: Metadata = {
  metadataBase: new URL("https://gaplets.com"),
  title:
    "Appointment Waitlist Software for Square | Auto‑Fill Last‑Minute Cancellations – Gaplet",
  description:
    "Appointment waitlist automation for Square Appointments. Detect cancellations, notify eligible clients by SMS/Email, and auto‑book the first to confirm — no call‑down list.",
  alternates: { canonical: "https://gaplets.com/" },
  robots: { index: true, follow: true },
  keywords: [
    "appointment waitlist",
    "appointment waitlist software",
    "appointment waitlist automation",
    "appointment waitlist app",
    "Square Appointments waitlist",
    "fill last-minute cancellations",
    "no-show recovery",
    "auto-book cancellations",
  ],
  openGraph: {
    title:
      "Appointment Waitlist Software for Square | Auto‑Fill Last‑Minute Cancellations – Gaplet",
    description:
      "Detect. Notify. Auto‑book. Recover lost revenue from last‑minute cancellations on Square.",
    url: "https://gaplets.com/",
    siteName: "Gaplet",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Appointment waitlist software — Gaplet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Appointment Waitlist Automation for Square – Gaplet",
    description:
      "Fill last‑minute cancellations automatically on Square. First to reply gets booked.",
    images: ["/og.jpg"],
  },
};

export default function HomePage() {
  // JSON‑LD (separate blocks for clarity)
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Gaplet",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://gaplets.com/",
    description:
      "Appointment waitlist automation for Square Appointments to fill last‑minute cancellations and auto‑book the first to confirm.",
    offers: { "@type": "Offer", price: "49.00", priceCurrency: "USD" },
  } as const;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Gaplet",
    url: "https://gaplets.com/",
    logo: "https://gaplets.com/logo.png",
  } as const;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need to change my booking system?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Gaplet works with Square Appointments today. Calendar/Sheets coming soon.",
        },
      },
      {
        "@type": "Question",
        name: "Do my clients need an app?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Clients receive SMS/Email and book via a one‑tap link. First come, first served.",
        },
      },
      {
        "@type": "Question",
        name: "How fast are replacements?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Typically within 1–2 hours when multi‑notify waves are enabled.",
        },
      },
    ],
  } as const;

  return (
    <main className="relative">
      {/* Structured data */}
      <Script id="ld-software" type="application/ld+json">
        {JSON.stringify(softwareLd)}
      </Script>
      <Script id="ld-org" type="application/ld+json">
        {JSON.stringify(orgLd)}
      </Script>
      <Script id="ld-faq" type="application/ld+json">
        {JSON.stringify(faqLd)}
      </Script>

      {/* Above the fold */}
      <Hero />

      {/* Body */}
      <RevenueLossTeaser />
      <HowItWorksTeaser />
      <IntegrationsTeaser />
      <BenefitsMarquee />
      <Testimonials />
      <PricingTeaserGlow />
      <Demo />
      <FAQTeaserStrip />
      <CTA />
    </main>
  );
}