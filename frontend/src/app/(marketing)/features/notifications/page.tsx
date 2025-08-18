import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import { NotificationsShowcase } from "@/components/features/NotificationsShowcase";

const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/features/notifications` as const;
const OG_IMAGE = `${SITE_URL}/og/notifications.png` as const;

export const metadata: Metadata = {
  title: {
    default: "Appointment Waitlist Notifications — SMS + Email waves to eligible clients",
    template: "%s | Gaplets",
  },
  description:
    "Multi-channel notifications for your appointment waitlist: SMS + Email sent simultaneously to eligible clients. Waves stop on first booking.",
  alternates: { canonical: "https://gaplets.com/features/notifications" },
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
    "appointment waitlist notifications",
    "sms notifications",
    "email notifications",
    "waitlist automation",
    "fill last-minute cancellations",
  ],
  openGraph: {
    type: "article",
    url: "https://gaplets.com/features/notifications",
    siteName: "Gaplets",
    title: "Appointment Waitlist Notifications — SMS + Email waves to eligible clients",
    description:
      "Reach the right clients instantly. One tap to confirm; automatic stop on first booking.",
    images: [{ url: "https://gaplets.com/og/notifications.png", width: 1200, height: 630, alt: "Notifications" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Appointment Waitlist Notifications — SMS + Email waves to eligible clients",
    description:
      "Simultaneous SMS + Email to eligible clients. Smart throttling and caps.",
    images: ["https://gaplets.com/og/notifications.png"],
  },
};

export default function NotificationsPage() {
  // JSON-LD: WebPage + Breadcrumbs
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Notifications — SMS + Email waves to eligible clients",
    url: PAGE_URL,
    description:
      "Multi-channel outreach: SMS + Email sent simultaneously to eligible clients. Waves stop on first booking.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
      { "@type": "ListItem", position: 3, name: "Notifications", item: PAGE_URL },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
     <SectionHeader
  eyebrow="Notifications"
  title="Appointment waitlist — right people, right away"
  desc="Simultaneous SMS + Email to clients who can actually make it. First to confirm gets the spot."
  href="/features"
  cta="Back to features"
  align="center"
/>

      <NotificationsShowcase />

      {/* Delivery controls (misma variante: white) */}
      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Delivery controls</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Waves stop automatically after the first confirmed booking.</li>
          <li>Quiet hours and daily caps to prevent spam.</li>
          <li>Retry window if no one accepts within X minutes.</li>
          <li>Targeting powered by <a href="/features#rules" className="underline underline-offset-4">Eligibility rules</a>.</li>
        </ul>
      </section>

      {/* SEO: JSON-LD */}
      <Script id="notifications-webpage-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="notifications-breadcrumbs-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
    </main>
  );
}