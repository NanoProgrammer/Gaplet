// src/app/(marketing)/testimonials/page.tsx
import type { Metadata } from "next";
import { SectionHeader } from "@/components/home/teasers-animated";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "Testimonials | Gaplets",
  description: "What clinics, salons, and local services say about Gaplets.",
};

export default function TestimonialsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeader
        eyebrow="Social proof"
        title="Loved by busy teams"
        desc="Real quotes from real customers who stopped losing money to cancellations."
        href="/signup"
        cta="Start free"
        align="center"
      />
      <div className="mt-10">
        <Testimonials />
      </div>
      <div className="mt-12">
        <CTA />
      </div>
    </main>
  );
}
