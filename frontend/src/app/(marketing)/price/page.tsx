import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import Pricing from "@/components/Pricing";

// SEO constants
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/price` as const;
const OG_IMAGE = `${SITE_URL}/og/pricing.png` as const; // asegúrate de tener esta imagen

export const metadata: Metadata = {
  title: { default: "Pricing — Simple plans, 7‑day free trial", template: "%s | Gaplets" },
  description: "Simple plans for busy clinics and studios. 7‑day free trial. Cancel anytime.",
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
    "gaplets pricing",
    "saas pricing",
     "appointment waitlist pricing",
    "square appointments automation",
    "fill last‑minute cancellations",
  ],
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Pricing — Simple plans, 7‑day free trial",
    description: "Choose a plan that fits. Email/SMS notifications, automation, and analytics included.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Simple plans, 7‑day free trial",
    description: "Start free. Cancel anytime.",
    images: [OG_IMAGE],
  },
};
const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Gaplets Pricing",
    url: PAGE_URL,
    description: "Pricing for Gaplets appointment waitlist & cancellation recovery.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Pricing", item: PAGE_URL },
    ],
  } as const;

export default function PricingPage() {
  // JSON‑LD: OfferCatalog with three plans
  const offerCatalogLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Gaplets Pricing",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Starter",
        price: 49,
        priceCurrency: "USD",
        priceSpecification: { "@type": "UnitPriceSpecification", price: 49, priceCurrency: "USD", billingDuration: 1, billingIncrement: 1, unitCode: "MON" },
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: 110,
        priceCurrency: "USD",
        priceSpecification: { "@type": "UnitPriceSpecification", price: 110, priceCurrency: "USD", billingDuration: 1, billingIncrement: 1, unitCode: "MON" },
      },
      {
        "@type": "Offer",
        name: "Premium",
        price: 180,
        priceCurrency: "USD",
        priceSpecification: { "@type": "UnitPriceSpecification", price: 180, priceCurrency: "USD", billingDuration: 1, billingIncrement: 1, unitCode: "MON" },
      },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <Script id="pricing-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
    <Script id="pricing-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
       <Script id="pricing-offercatalog-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalogLd) }} />
      <SectionHeader
        eyebrow="Pricing"
        title="Choose a plan that fits"
        desc="Starter for solo pros. Pro & Premium add SMS, higher limits, and priority support."
        href="/signup"
        cta="Start free for 7 days"
        align="center"
      />

      <div className="mt-10">
        <Pricing />
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Prices in USD. Taxes may apply based on your location. See <a href="/docs/faq#billing" className="underline underline-offset-4">Billing FAQ</a>.
      </p>

      {/* SEO: JSON‑LD */}
      <Script id="pricing-offercatalog-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalogLd) }} />
    </main>
  );
}