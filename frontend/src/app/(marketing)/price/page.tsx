// src/app/(marketing)/price/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";
import Pricing from "@/components/Pricing";

export const metadata: Metadata = {
  title: "Pricing | Gaplets",
  description: "Simple plans. Start free for 7 days. Cancel anytime.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Pricing"
        title="Choose a plan that fits"
        desc="Starter for small teams. Pro & Premium for SMS, higher limits, and priority support."
        href="/signup"
        cta="Start free"
        align="center"
      />
      <div className="mt-10">
        <Pricing />
      </div>
    </main>
  );
}
