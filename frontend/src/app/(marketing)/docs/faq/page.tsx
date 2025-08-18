// app/(marketing)/docs/faq/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";

const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/docs/faq` as const;
const OG_IMAGE = `${SITE_URL}/og/faq.png` as const;

export const metadata: Metadata = {
  title: {
    default: "Appointment Waitlist FAQ — Square setup, notifications, rules & billing",
    template: "%s | Gaplets",
  },
  description:
    "Answers for appointment waitlist: connect Square, configure eligibility, send SMS/Email waves, and understand billing & taxes.",
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
    "appointment waitlist automation",
    "Square Appointments waitlist",
    "fill last-minute cancellations",
    "auto-book cancellations",
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Appointment Waitlist FAQ — Square setup, notifications, rules & billing",
    description:
      "Connect Square, set eligibility rules, send SMS/Email waves, and handle billing & taxes.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets FAQ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Appointment Waitlist FAQ — Square setup, notifications, rules & billing",
    description:
      "How to set up an appointment waitlist with Square: rules, notifications, and billing.",
    images: [OG_IMAGE],
  },
};

const PRICING_PATH = "/price" as const;

type QAItem = { q: string; a: React.ReactNode; plain: string };

// ── Getting started ─────────────────────────────────────────────────────────────
const gettingStarted: QAItem[] = [
  {
    q: "What does Gaplets do?",
    a: (
      <>
        It auto-fills last-minute cancellations. When a slot opens, Gaplets
        notifies eligible clients (email/SMS). The first to accept books it.
        Originals stay intact unless you edit them. See{" "}
        <a href="#getting-started" className="underline underline-offset-4">
          Getting started
        </a>.
      </>
    ),
    plain:
      "It auto-fills last-minute cancellations by notifying eligible clients via email/SMS. The first to accept books the slot. Original appointments remain unless edited.",
  },
  {
    q: "How do I connect Square?",
    a: (
      <>
        Go to{" "}
        <Link href="/integrations/square" className="underline underline-offset-4">
          Integrations → Square
        </Link>{" "}
        and authorize. We subscribe to Square webhooks so openings are captured instantly.
      </>
    ),
    plain:
      "Open Integrations → Square, authorize your account, and we subscribe to webhooks to capture openings instantly.",
  },
  {
    q: "Who gets notified?",
    a: (
      <>
        Clients matching your rules: same service type, future-booked to move
        up, inactive (hasn’t booked in X days), or no upcoming bookings. Tune it in{" "}
        <Link href="/features#rules" className="underline underline-offset-4">
          Features → Rules
        </Link>.
      </>
    ),
    plain:
      "Clients who match your eligibility rules—same service type, future-booked to move up, inactive, or with no upcoming bookings.",
  },
];

// ── Product ────────────────────────────────────────────────────────────────────
const product: QAItem[] = [
  {
    q: "Will it change existing appointments?",
    a: <>No. The replacement books the open slot. The client’s original appointment remains unless you edit it in your provider.</>,
    plain:
      "No. The replacement books the open slot and the original appointment remains unless you choose to edit it.",
  },
  {
    q: "How are notifications sent?",
    a: (
      <>
        In waves. Email and/or SMS based on your plan and rules. Waves stop as
        soon as a client accepts. Learn more in{" "}
        <Link href="/features/notifications" className="underline underline-offset-4">
          Notifications
        </Link>.
      </>
    ),
    plain:
      "Notifications are sent in controlled waves via email and/or SMS based on your plan and rules. Waves stop once a client accepts.",
  },
  {
    q: "What data can I review?",
    a: (
      <>
        Every gap and replacement is logged (OpenSlot & ReplacementLog) so you
        can reconcile ROI. See{" "}
        <Link href="/features#metrics" className="underline underline-offset-4">
          Metrics & logs
        </Link>.
      </>
    ),
    plain:
      "All gaps and replacements are logged (OpenSlot & ReplacementLog) so you can track results and ROI.",
  },
];

// ── Security
const security: QAItem[] = [
  {
    q: "How do you handle security and privacy?",
    a: (
      <>
        OAuth scopes are least-privilege; data is encrypted in transit and at
        rest. Learn more in{" "}
        <Link href="/security" className="underline underline-offset-4">
          Security
        </Link>.
      </>
    ),
    plain:
      "We use least-privilege OAuth scopes and encrypt data in transit and at rest.",
  },
];

// ── Billing (incluye impuestos con Stripe Tax) ─────────────────────────────────
const billing: QAItem[] = [
  {
    q: "Do you handle my taxes?",
    a: (
      <>
        No. Gaplets doesn’t file your business taxes. We only calculate and
        collect any required sales taxes on your subscription (via Stripe Tax)
        and show them on the invoice. You can expense the subscription as a
        business cost.
      </>
    ),
    plain:
      "Gaplets doesn’t file your taxes. We collect required sales taxes on your subscription (via Stripe Tax) and show them on the invoice. You can expense it.",
  },
  {
    q: "How are taxes calculated on my invoice?",
    a: (
      <>
        Automatically by Stripe Tax based on your billing address and our active
        registrations (e.g., GST/HST in Canada, QST in Québec, or US sales tax
        where applicable).
      </>
    ),
    plain:
      "Stripe Tax calculates taxes automatically using your billing address and our registrations (e.g., GST/HST, QST, US sales tax).",
  },
  {
    q: "Do you offer a trial?",
    a: (
      <>
        Yes. Start free for 7 days, then pick a plan. Cancel anytime. See{" "}
        <Link href={PRICING_PATH} className="underline underline-offset-4">
          Pricing
        </Link>
        .
      </>
    ),
    plain: "Yes. 7-day free trial. Pick a plan after. Cancel anytime. See Pricing.",
  },
];

// Secciones visibles (sin troubleshooting)
const sections = [
  { id: "getting-started", title: "Getting started", items: gettingStarted },
  { id: "product", title: "Product", items: product },
  { id: "billing", title: "Billing", items: billing },
  { id: "security", title: "Security", items: security },
] as const;

export default function FAQPage() {
  // JSON-LD: FAQPage + BreadcrumbList
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.plain },
      }))
    ),
  } as const;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Help Center", item: `${SITE_URL}/docs` },
      { "@type": "ListItem", position: 3, name: "FAQ", item: PAGE_URL },
    ],
  } as const;
  const webpageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Appointment Waitlist — FAQ",
  url: PAGE_URL,
  description:
    "FAQ about appointment waitlist: Square setup, eligibility rules, notifications, and billing.",
} as const;



  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <Script id="faq-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <SectionHeader
  eyebrow="Docs"
  title="Appointment Waitlist — FAQ"
  desc="Short answers to set up your appointment waitlist, from Square connection to notifications and billing."
  href={PRICING_PATH}
  cta="View pricing"
  align="center"
/>

      {/* TOC */}
      <nav
        aria-label="FAQ sections"
        className="mx-auto mt-6 max-w-3xl rounded-xl border bg-white p-3 text-sm shadow-sm"
      >
        <ul className="flex flex-wrap gap-3">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center rounded-lg border px-2.5 py-1.5 hover:bg-slate-50"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sections */}
      <div className="mx-auto mt-10 grid gap-8 lg:grid-cols-2">
        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-title`}
            className="scroll-mt-[70px]"
          >
            <h2
              id={`${s.id}-title`}
              className="mb-3 text-base font-semibold text-slate-900"
            >
              {s.title}
            </h2>
            <ul className="space-y-3">
              {s.items.map((item) => (
                <FaqItem key={item.q} q={item.q}>
                  {item.a}
                </FaqItem>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Footer CTA → existing routes only */}
      <div className="mt-16 rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">
          Prefer a quick overview? See{" "}
          <Link
            href="/features"
            className="font-medium underline underline-offset-4"
          >
            Features
          </Link>{" "}
          or{" "}
          <Link
            href="/integrations/square"
            className="font-medium underline underline-offset-4"
          >
            Integrations → Square
          </Link>
          .
        </p>
      </div>

      {/* SEO: JSON-LD */}
      <Script
        id="faq-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Script
        id="breadcrumbs-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </main>
  );
}

function FaqItem({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <li className="list-none">
      <details className="group rounded-xl border bg-white p-4 shadow-sm open:shadow-md">
        <summary className="flex cursor-pointer select-none items-start justify-between gap-3 text-left">
          <span className="font-medium text-slate-900">{q}</span>
          <span
            className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md border text-slate-600 transition group-open:rotate-45"
            aria-hidden
          >
            +
          </span>
        </summary>
        <div className="mt-2 text-sm text-slate-700">{children}</div>
      </details>
    </li>
  );
}
