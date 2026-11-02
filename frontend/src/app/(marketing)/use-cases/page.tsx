import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { SectionHeader } from "@/components/home/teasers-animated";
import UseCasesGrid, { type UseCaseCard } from "@/components/use-cases/UseCasesGrid";

// ────────────────────────────────────────────────────────────────────────────────
// SEO
// ────────────────────────────────────────────────────────────────────────────────
const SITE_URL = "https://gaplets.com" as const;
const PAGE_URL = `${SITE_URL}/use-cases` as const;
const OG_IMAGE = `${SITE_URL}/og/use-cases.png` as const; // ensure asset exists

export const metadata: Metadata = {
  title: { default: "Use cases — Clinics, Salons, Spas, Vets, Fitness, Home services & more", template: "%s | Gaplets" },
  description:
    "From clinics to barbers, spas, nails, tattoo, pet grooming, fitness and more — if cancellations hurt, Gaplets helps refill those openings automatically.",
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
    "use cases",
    "dentist cancellations",
    "barber no-shows",
     "cancellation recovery",
    "spa last-minute openings",
    "massage therapist scheduling",
    "nail salon cancellations",
    "tattoo studio booking",
    "pet grooming appointments",
    "fitness trainer rescheduling",
    "auto detailing appointments",
  ],
  openGraph: {
    type: "article",
    url: PAGE_URL,
    siteName: "Gaplets",
    title: "Use cases — Clinics, Salons, Spas, Vets, Fitness, Home services & more",
    description: "See where Gaplets shines when last‑minute cancellations happen.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gaplets Use Cases" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Use cases — Clinics, Salons, Spas, Vets, Fitness, Home services & more",
    description: "Popular appointment‑based businesses keep calendars full with Gaplets.",
    images: [OG_IMAGE],
  },
};

// Cards (SSR-stable) — anchors only to this page
const CARDS: readonly UseCaseCard[] = [
  { k: "clinics", t: "Clinics", d: "Dentists, physio, chiro — high‑value slots refilled quickly.", href: "/use-cases#clinics", icon: "Stethoscope" },
  { k: "barbers-spas", t: "Barbers & Spas", d: "Keep chairs and rooms full when plans change.", href: "/use-cases#barbers-spas", icon: "Scissors" },
  { k: "massage", t: "Massage", d: "Turn same‑day cancellations into filled sessions.", href: "/use-cases#massage", icon: "HeartPulse" },
  { k: "nails", t: "Nails", d: "Backfill manicures & fills without blasting everyone.", href: "/use-cases#nails", icon: "Brush" },
  { k: "aesthetics", t: "Aesthetics & Med‑spa", d: "Target by service to avoid mismatches.", href: "/use-cases#aesthetics", icon: "Sparkles" },
  { k: "tattoo", t: "Tattoo & Piercing", d: "First‑come, first‑served for coveted slots.", href: "/use-cases#tattoo", icon: "PenTool" },
  { k: "pets", t: "Pet grooming", d: "Alert nearby regulars and keep the table busy.", href: "/use-cases#pets", icon: "PawPrint" },
  { k: "fitness", t: "Fitness & Coaching", d: "Reschedule clients who want earlier times.", href: "/use-cases#fitness", icon: "Dumbbell" },
  { k: "auto", t: "Auto detailing & tint", d: "Fill bays fast when a job cancels.", href: "/use-cases#auto", icon: "Car" },
  { k: "vets", t: "Veterinary clinics", d: "Refill exam slots by inviting patients with later visits — or overdue ones — to take them.", href: "/use-cases#vets", icon: "Syringe" },
  { k: "eyecare", t: "Optometry & Eye care", d: "Recover exam chairs with patients overdue for a visit.", href: "/use-cases#eyecare", icon: "Eye" },
  { k: "repair", t: "Auto repair shops", d: "Backfill service bays when a drop-off cancels.", href: "/use-cases#repair", icon: "Wrench" },
  { k: "home", t: "Home services", d: "Cleaners, HVAC and plumbers: refill crews' day fast.", href: "/use-cases#home", icon: "Home" },
  { k: "education", t: "Tutors & lessons", d: "Music, language and tutoring slots filled by students who can come earlier or have lapsed.", href: "/use-cases#education", icon: "GraduationCap" },
  { k: "professional", t: "Consultants & Legal", d: "Keep billable hours booked when meetings fall through.", href: "/use-cases#professional", icon: "Briefcase" },
  { k: "hospitality", t: "Tours & Experiences", d: "Resell cancelled seats on tours, classes and rentals.", href: "/use-cases#hospitality", icon: "UtensilsCrossed" },
] as const;

const EXTRA_DETAILS: readonly { k: string; t: string; p: string; b: readonly string[] }[] = [
  { k: "vets", t: "Veterinary clinics", p: "Fill cancelled exams and procedures by inviting clients who already have a later visit to move up, or pets that are overdue for care.", b: ["Invite only clients whose next visit is later than the time you set.", "Reach clients who haven’t visited in the last weeks or months.", "SMS + Email waves stop the moment someone confirms."] },
  { k: "eyecare", t: "Optometry & Eye care", p: "Exam chairs are expensive to leave empty: offer them to patients booked later, or overdue for a checkup.", b: ["Same-service matching keeps invitations relevant.", "You choose how long since the last visit counts as inactive.", "See every recovered appointment in your logs."] },
  { k: "repair", t: "Auto repair shops", p: "A cancelled drop-off leaves a bay idle: invite customers with a later appointment, or ones overdue for service, to take it.", b: ["Same-service matching.", "First to confirm gets the slot.", "Waves stop as soon as the slot is filled."] },
  { k: "home", t: "Home services", p: "A cancelled visit leaves a gap in the day: offer it to customers booked later, or past customers due for a repeat.", b: ["Invite clients whose next visit is further out.", "Reactivate customers who haven’t booked in a while.", "SMS + Email waves that stop as soon as someone confirms."] },
  { k: "education", t: "Tutors & lessons", p: "Refill cancelled lessons by inviting students booked later to move up, or past students to return.", b: ["Match by lesson type.", "Set how long a student must be inactive before they’re invited.", "A log of who took each slot."] },
  { k: "professional", t: "Consultants & Legal", p: "Keep billable hours booked when clients cancel: invite those with a later meeting to move up, or past clients to return.", b: ["Same-service matching keeps meeting types consistent.", "Choose how far out a next meeting must be.", "Full log for reconciliation."] },
  { k: "hospitality", t: "Tours & Experiences", p: "Cancelled seats on tours, classes and rentals are perishable: invite guests booked later to move up, or past guests to return.", b: ["Same-service matching.", "First to confirm gets the seat.", "A log of every filled slot."] },
];

export default function UseCasesPage() {
  // JSON‑LD: WebPage + Breadcrumbs + ItemList
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Gaplets Use cases",
    url: PAGE_URL,
    description: "From clinics to barbers, spas, nails, tattoo, pet grooming, fitness and more — if cancellations hurt, Gaplets helps.",
  } as const;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Use cases", item: PAGE_URL },
    ],
  } as const;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: CARDS.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Thing", name: c.t, url: `${PAGE_URL}#${c.k}` },
    })),
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 overflow-x-clip">
      <SectionHeader
        eyebrow="Where Gaplets shines"
        title="Built for local services"
        desc="If your schedule matters and no‑shows hurt — you can win those minutes back."
        href="/testimonials"
        cta="See testimonials"
        align="center"
      />

      {/* Motion grid */}
      <div className="mt-10">
        <UseCasesGrid items={CARDS} />
      </div>

      {/* Detail anchors (same page) */}
      <div className="mt-16 grid gap-6">
        <section id="clinics" aria-labelledby="clinics-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="clinics-title" className="text-base font-semibold text-slate-900">Clinics</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Dental, physio, chiropractic, med‑spa, and multi‑provider clinics recover high‑value cancellations without front‑desk scramble.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Same‑service targeting to avoid mismatches.</li>
            <li>Respect existing bookings; originals stay unless you edit.</li>
            <li>Audit logs (OpenSlot & ReplacementLog) for reconciliation.</li>
          </ul>
        </section>

        <section id="barbers-spas" aria-labelledby="barbers-spas-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="barbers-spas-title" className="text-base font-semibold text-slate-900">Barbers & Spas</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Chairs and rooms stay busy: when someone cancels, clients with a later booking and regulars who haven’t visited in a while get the opening immediately.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>SMS + Email waves that stop as soon as someone books.</li>
            <li>Grace window to reduce accidental double‑fills.</li>
            <li>Simple rules: by service, staff, time window, or activity.</li>
          </ul>
        </section>

        <section id="massage" aria-labelledby="massage-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="massage-title" className="text-base font-semibold text-slate-900">Massage</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Fill 60–90 minute openings with clients eager to move up their sessions.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Target by service length and therapist.</li>
            <li>Respect break buffers to avoid burnout.</li>
            <li>Inactive‑client reactivation without mass blasts.</li>
          </ul>
        </section>

        <section id="nails" aria-labelledby="nails-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="nails-title" className="text-base font-semibold text-slate-900">Nails</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Manicures, fills, and gel appointments backfilled in minutes—without DM juggling.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Same‑service rule keeps matching precise.</li>
            <li>Cap per wave to avoid over‑messaging.</li>
            <li>Fast audit to see who booked and when.</li>
          </ul>
        </section>

        <section id="aesthetics" aria-labelledby="aesthetics-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="aesthetics-title" className="text-base font-semibold text-slate-900">Aesthetics & Med‑spa</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Protect brand experience while keeping injectables, facials, and laser slots full.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Filter by practitioner and service type.</li>
            <li>Clear opt‑out to respect preferences.</li>
            <li>Logs for compliance and reconciliation.</li>
          </ul>
        </section>

        <section id="tattoo" aria-labelledby="tattoo-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="tattoo-title" className="text-base font-semibold text-slate-900">Tattoo & Piercing</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Coveted blocks get claimed fast—fair, first‑come, first‑served.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Announce by artist and style.</li>
            <li>Set a short grace window to prevent double‑fills.</li>
            <li>Keep originals untouched unless you choose to edit.</li>
          </ul>
        </section>

        <section id="pets" aria-labelledby="pets-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="pets-title" className="text-base font-semibold text-slate-900">Pet grooming</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Regulars love grabbing earlier slots—keep your table and tubs busy.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Filter by pet size/time required.</li>
            <li>Batch alerts, then stop when filled.</li>
            <li>Clear logs to resolve disputes.</li>
          </ul>
        </section>

        <section id="fitness" aria-labelledby="fitness-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="fitness-title" className="text-base font-semibold text-slate-900">Fitness & Coaching</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Personal training, yoga, Pilates—clients jump on earlier times when they can.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Only notify members who match availability.</li>
            <li>Respect session caps and validity.</li>
            <li>Easy audit across trainers and rooms.</li>
          </ul>
        </section>

        <section id="auto" aria-labelledby="auto-title" className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="auto-title" className="text-base font-semibold text-slate-900">Auto detailing & tint</h2>
          <p className="mt-2 text-sm text-slate-700 max-w-2xl">Keep bays full even when a customer cancels last minute.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Target by service length and bay type.</li>
            <li>Queue retries if no one accepts initially.</li>
            <li>Track recovered revenue per service.</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6">
        {EXTRA_DETAILS.map((x) => (
          <section key={x.k} id={x.k} aria-labelledby={`${x.k}-title`} className="scroll-mt-[70px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 id={`${x.k}-title`} className="text-base font-semibold text-slate-900">{x.t}</h2>
            <p className="mt-2 text-sm text-slate-700 max-w-2xl">{x.p}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {x.b.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-700">Ready to keep your calendar full? <Link href="/signup" className="font-medium underline underline-offset-4">Start free</Link> or <Link href="/integrations/square" className="font-medium underline underline-offset-4">connect Square</Link>.</p>
      </div>

      {/* JSON‑LD */}
      <Script id="usecases-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }} />
      <Script id="usecases-breadcrumbs-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Script id="usecases-itemlist-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </main>
  );
}