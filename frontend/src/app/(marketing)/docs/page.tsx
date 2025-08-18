// app/(marketing)/docs/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";
import { DocsIndex } from "@/components/docs/DocsIndex";

export const metadata: Metadata = {
  title: {
    default: "Help Center — Appointment Waitlist Setup & Guides",
    template: "%s | Gaplets",
  },
  description:
    "Setup guides for appointment waitlist: connect Square, configure notifications and rules, and go live in minutes.",
  alternates: { canonical: "https://gaplets.com/docs" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "https://gaplets.com/docs",
    siteName: "Gaplets",
    title: "Help Center — Appointment Waitlist Setup & Guides",
    description:
      "Connect Square, set rules and notifications, and launch your appointment waitlist fast.",
    images: [{ url: "https://gaplets.com/og/docs.png", width: 1200, height: 630, alt: "Gaplets Docs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center — Appointment Waitlist Setup & Guides",
    description:
      "Everything to launch your appointment waitlist: integrations, notifications, rules.",
    images: ["https://gaplets.com/og/docs.png"],
  },
  keywords: [
    "appointment waitlist setup",
    "appointment waitlist guides",
    "Square Appointments waitlist",
  ],
};

const PRICING_PATH = "/price" as const;
const SQUARE_PATH = "/integrations/square" as const;
const HOW_IT_WORKS_PATH = "/how-it-works" as const;
const FEATURES_PATH = "/features" as const;
const NOTIFICATIONS_PATH = "/features/notifications" as const;
const SECURITY_PATH = "/security" as const;

// Rutas SOLO existentes.
const primary = [
  { t: "FAQ", d: "Common questions about setup, usage, and billing.", href: "/docs/faq", icon: "BookOpen" },
  { t: "Square", d: "Connect Square Appointments and go live.", href: SQUARE_PATH, icon: "Plug" },
  { t: "Pricing & billing", d: "Plans, trials, invoices, and taxes.", href: PRICING_PATH, icon: "CreditCard" },
] as const;

// Guías → destinos canónicos (no anchors del FAQ)
const guides = [
  { t: "Getting started", d: "3-step setup to recover last-minute cancellations.", href: HOW_IT_WORKS_PATH, icon: "Zap" },
  { t: "Eligibility rules", d: "Only notify clients who match your criteria.", href: `${FEATURES_PATH}#rules`, icon: "BookOpen" },
  { t: "Notifications", d: "Email/SMS waves, throttling, and caps.", href: NOTIFICATIONS_PATH, icon: "BellRing" },
  { t: "Metrics & logs", d: "OpenSlot and ReplacementLog explained.", href: `${FEATURES_PATH}#metrics`, icon: "BarChart3" },
  { t: "Security & privacy", d: "Data handling and least privilege.", href: SECURITY_PATH, icon: "ShieldCheck" },
] as const;

export default function DocsHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
  eyebrow="Docs"
  title="Help Center — Appointment Waitlist"
  desc="Short guides to connect Square, configure rules & notifications, and go live."
  href={PRICING_PATH}
  cta="View pricing"
  align="center"
/>
      <DocsIndex primary={primary} guides={guides} quickStartHref={SQUARE_PATH} />
    </main>
  );
}
