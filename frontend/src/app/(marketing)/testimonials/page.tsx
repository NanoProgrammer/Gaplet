import type { Metadata } from "next";
import Script from "next/script";
import { SectionHeader } from "@/components/home/teasers-animated";
import TestimonialsWall from "../../../components/testimonials/TestimonialsWall";
import SubmitTestimonial from "@/components/testimonials/SubmitTestimonial";

// ────────────────────────────────────────────────────────────────────────────────
// SEO
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/testimonials` as const;
const OG_IMAGE = `${SITE_URL}/og/testimonials.png` as const;

export const metadata: Metadata = {
  title: { default: "Testimonials — Loved by busy teams", template: "%s | Gaplets" },
  description: "What clinics, salons, and local services say after filling last‑minute cancellations with Gaplets.",
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Testimonials — Loved by busy teams",
    description: "Real quotes from customers who stopped losing money to cancellations.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Testimonials" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Testimonials — Loved by busy teams",
    description: "What customers say about recovering lost revenue with Gaplets.",
    images: [OG_IMAGE],
  },
};

// Keep items stable on SSR and pass to client wall
export type Testimonial = {
  id: string;
  name: string;
  role: string;
  org: string;
  sector: "Dentist" | "Barber" | "Massage" | "Clinic" | "Mechanic" | "Spa" | "Chiro" | "Aesthetics";
  quote: string;
};

const ITEMS: readonly Testimonial[] = [
  { id: "t1", name: "Dr. Nguyen", role: "Owner", org: "Elm Dental", sector: "Dentist", quote: "Filled two last‑minute cancellations before lunch. No phone tag—just done." },
  { id: "t2", name: "Maya R.", role: "Lead Stylist", org: "Fade & Flow", sector: "Barber", quote: "Text went out, chair was booked in 6 minutes. Slow Fridays aren’t scary anymore." },
  { id: "t3", name: "Jonas P.", role: "RMT", org: "Northside Massage", sector: "Massage", quote: "Same‑service targeting is clutch. Clients love moving up when a slot opens." },
  { id: "t4", name: "Caroline A.", role: "Manager", org: "Cedar Wellness", sector: "Clinic", quote: "Gaplets pays for itself in the first week of each month. Set it and forget it." },
  { id: "t5", name: "Louis V.", role: "Owner", org: "Prime AutoCare", sector: "Mechanic", quote: "Cancellations used to wreck our day. Now the bay stays full." },
  { id: "t6", name: "Aisha K.", role: "Spa Director", org: "Luna Spa", sector: "Spa", quote: "Email + SMS together just works. We avoid spam and still fill openings fast." },
  { id: "t7", name: "Dr. Patel", role: "Chiropractor", org: "Align Chiro", sector: "Chiro", quote: "The logs make reconciliation simple. I can literally see recovered revenue." },
  { id: "t8", name: "Riley S.", role: "Owner", org: "Glow Aesthetics", sector: "Aesthetics", quote: "Client moved her Botox up same day. Win‑win for schedule and revenue." },
  { id: "t9", name: "Marco D.", role: "Barber", org: "Clip Joint", sector: "Barber", quote: "We don’t babysit DMs anymore. First to confirm gets the slot—clean and fair." },
  { id: "t10", name: "Nora L.", role: "Office Admin", org: "River Dental", sector: "Dentist", quote: "The grace window avoids awkward double bookings. Thoughtful defaults." },
  { id: "t11", name: "Sam T.", role: "Owner", org: "Muscle Mend", sector: "Massage", quote: "Inactive client reactivated from a cancellation text. That’s found money." },
  { id: "t12", name: "Katia R.", role: "Clinic Ops", org: "Oak Health", sector: "Clinic", quote: "Setup took five minutes with Square. We went live the same morning." },
  { id: "t13", name: "Diego F.", role: "Mechanic", org: "ShiftWorks", sector: "Mechanic", quote: "Morning cancel? Noon filled. The queue and retries are solid." },
  { id: "t14", name: "Emily W.", role: "Aesthetician", org: "Birch Beauty", sector: "Aesthetics", quote: "No more blasting everyone—targeting respects clients’ time." },
  { id: "t15", name: "Chris J.", role: "Owner", org: "Seatown Cuts", sector: "Barber", quote: "We see less no‑shows because people feel lucky to grab an opening." },
  { id: "t16", name: "Dr. Kim", role: "Dentist", org: "Smile Co.", sector: "Dentist", quote: "Our front desk doesn’t scramble anymore. Gaplets just backfills." },
  { id: "t17", name: "Renee B.", role: "Spa Owner", org: "Quiet Waters", sector: "Spa", quote: "Booked a 90‑minute slot that would’ve gone empty. That covered the month." },
  { id: "t18", name: "Omar S.", role: "Chiro", org: "Uplift Chiro", sector: "Chiro", quote: "Patients who want earlier times jump on alerts immediately." },
] as const;

export default function TestimonialsPage() {
  // JSON‑LD: ItemList of testimonials (names only, no PII beyond names/orgs)
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ITEMS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: `${t.name} — ${t.org}` })),
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Social proof"
        title="Loved by busy teams"
        desc="Real quotes from customers who stopped losing money to cancellations."
        href="/signup"
        cta="Start free"
        align="center"
      />

      <div className="mt-10">
        <TestimonialsWall items={ITEMS} />
      </div>

      <div className="mt-16">
        <SubmitTestimonial />
      </div>

      <Script id="testimonials-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </main>
  );
}