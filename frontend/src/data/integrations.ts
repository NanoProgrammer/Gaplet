// src/data/integrations.ts
// Single source of truth for the integrations directory (marketing + dashboard).
// Status is deliberately honest:
//   live    → works end-to-end today
//   soon    → in active development
//   planned → on the roadmap, prioritised by customer requests

export type IntegrationStatus = "live" | "soon" | "planned";

export type IndustryKey =
  | "beauty"
  | "health"
  | "fitness"
  | "pets"
  | "auto"
  | "home"
  | "education"
  | "professional"
  | "hospitality"
  | "general";

export type Integration = {
  key: string;
  name: string;
  industry: IndustryKey;
  desc: string;
  status: IntegrationStatus;
  /** key used by the backend /auth/connect/:provider route (live only) */
  provider?: string;
  /** public image path, optional */
  img?: string;
  /** detail page for live integrations */
  href?: string;
};

export const INDUSTRIES: Record<IndustryKey, { label: string; blurb: string }> = {
  beauty: { label: "Beauty & Wellness", blurb: "Salons, barbers, spas, nails, massage, med-spa, tattoo" },
  health: { label: "Health & Clinics", blurb: "Dental, physio, chiro, therapy, optometry, clinics" },
  fitness: { label: "Fitness & Coaching", blurb: "Studios, gyms, personal training, yoga, classes" },
  pets: { label: "Pets & Vets", blurb: "Groomers, vets, trainers, boarding" },
  auto: { label: "Auto & Mobile Services", blurb: "Detailing, tint, repair, car wash" },
  home: { label: "Home Services", blurb: "Cleaning, HVAC, plumbing, field service" },
  education: { label: "Education & Tutoring", blurb: "Tutors, music lessons, schools, courses" },
  professional: { label: "Professional Services", blurb: "Consultants, legal, finance, coaching" },
  hospitality: { label: "Restaurants & Events", blurb: "Reservations, tours, rentals" },
  general: { label: "General Scheduling", blurb: "Calendars, spreadsheets, forms and automation" },
};

export const INTEGRATIONS: readonly Integration[] = [
  // ── General ────────────────────────────────────────────────────────────────
  { key: "square", name: "Square Appointments", industry: "general", desc: "Webhook cancellation detection, customer targeting and auto-booking.", status: "live", provider: "square", img: "/squarefavicon.webp", href: "/integrations/square" },
  { key: "google-calendar", name: "Google Calendar", industry: "general", desc: "Detect deleted events and invite clients to move up.", status: "soon", img: "/calendarlogo.webp" },
  { key: "google-sheets", name: "Google Sheets", industry: "general", desc: "Bring your own client list and let Gaplet run the waves.", status: "soon", img: "/google-sheets.webp" },
  { key: "outlook", name: "Microsoft Outlook Calendar", industry: "general", desc: "Cancellation detection for Microsoft 365 calendars.", status: "planned" },
  { key: "apple-calendar", name: "Apple Calendar (iCal/CalDAV)", industry: "general", desc: "Sync via CalDAV feeds.", status: "planned" },
  { key: "calendly", name: "Calendly", industry: "general", desc: "Detect cancelled bookings and refill the slot.", status: "planned" },
  { key: "acuity", name: "Acuity Scheduling", industry: "general", desc: "OAuth + webhooks for cancelled appointments.", status: "soon" },
  { key: "setmore", name: "Setmore", industry: "general", desc: "Appointment cancellations and client list.", status: "planned" },
  { key: "simplybook", name: "SimplyBook.me", industry: "general", desc: "Cancellation webhooks and client targeting.", status: "planned" },
  { key: "square-booking", name: "Square Online Booking", industry: "general", desc: "Booking-site cancellations through Square.", status: "planned" },
  { key: "squarespace", name: "Squarespace Scheduling", industry: "general", desc: "Acuity-powered scheduling for Squarespace sites.", status: "planned" },
  { key: "youcanbook", name: "YouCanBookMe", industry: "general", desc: "Booking-page cancellations.", status: "planned" },
  { key: "cal-com", name: "Cal.com", industry: "general", desc: "Open-source scheduling via webhooks.", status: "planned" },
  { key: "zapier", name: "Zapier", industry: "general", desc: "Connect any tool that is not natively supported.", status: "planned" },
  { key: "make", name: "Make (Integromat)", industry: "general", desc: "Automation scenarios to trigger Gaplet waves.", status: "planned" },
  { key: "webhooks", name: "Custom Webhooks / API", industry: "general", desc: "Send cancellations from your own system.", status: "planned" },
  { key: "csv", name: "CSV Import", industry: "general", desc: "Upload your client list in one click.", status: "planned" },

  // ── Beauty & Wellness ──────────────────────────────────────────────────────
  { key: "fresha", name: "Fresha", industry: "beauty", desc: "Salon & spa booking cancellations.", status: "planned" },
  { key: "vagaro", name: "Vagaro", industry: "beauty", desc: "Salon, spa and fitness appointments.", status: "planned" },
  { key: "booksy", name: "Booksy", industry: "beauty", desc: "Barbers and beauty professionals.", status: "planned" },
  { key: "mangomint", name: "Mangomint", industry: "beauty", desc: "Modern salon and spa software.", status: "planned" },
  { key: "boulevard", name: "Boulevard", industry: "beauty", desc: "High-end salons and med-spas.", status: "planned" },
  { key: "zenoti", name: "Zenoti", industry: "beauty", desc: "Spa, salon and wellness enterprise.", status: "planned" },
  { key: "glossgenius", name: "GlossGenius", industry: "beauty", desc: "Independent stylists and artists.", status: "planned" },
  { key: "styleseat", name: "StyleSeat", industry: "beauty", desc: "Independent beauty professionals.", status: "planned" },
  { key: "schedulicity", name: "Schedulicity", industry: "beauty", desc: "Small beauty and wellness businesses.", status: "planned" },
  { key: "phorest", name: "Phorest", industry: "beauty", desc: "Salon management platform.", status: "planned" },
  { key: "treatwell", name: "Treatwell", industry: "beauty", desc: "European salon marketplace.", status: "planned" },
  { key: "timely", name: "Timely", industry: "beauty", desc: "Salon and spa scheduling.", status: "planned" },
  { key: "meevo", name: "Meevo", industry: "beauty", desc: "Salon and spa software.", status: "planned" },
  { key: "massagebook", name: "MassageBook", industry: "beauty", desc: "Massage therapists scheduling.", status: "planned" },
  { key: "pocketsuite", name: "PocketSuite", industry: "beauty", desc: "Mobile and independent service pros.", status: "planned" },
  { key: "aesthetic-record", name: "Aesthetic Record", industry: "beauty", desc: "Aesthetics and med-spa practices.", status: "planned" },
  { key: "pabau", name: "Pabau", industry: "beauty", desc: "Clinics, med-spas and aesthetics.", status: "planned" },

  // ── Health & Clinics ───────────────────────────────────────────────────────
  { key: "jane", name: "Jane App", industry: "health", desc: "Physio, chiro, massage and allied health.", status: "planned", img: "/janeApp.avif" },
  { key: "simplepractice", name: "SimplePractice", industry: "health", desc: "Therapists and mental health practices.", status: "planned" },
  { key: "cliniko", name: "Cliniko", industry: "health", desc: "Allied health practice management.", status: "planned" },
  { key: "healthie", name: "Healthie", industry: "health", desc: "Dietitians and wellness practitioners.", status: "planned" },
  { key: "tebra", name: "Tebra (Kareo)", industry: "health", desc: "Independent medical practices.", status: "planned" },
  { key: "dentrix", name: "Dentrix Ascend", industry: "health", desc: "Dental practice schedules.", status: "planned" },
  { key: "open-dental", name: "Open Dental", industry: "health", desc: "Dental appointment book.", status: "planned" },
  { key: "eaglesoft", name: "Eaglesoft", industry: "health", desc: "Dental practice management.", status: "planned" },
  { key: "nextech", name: "Nextech", industry: "health", desc: "Dermatology and plastic surgery.", status: "planned" },
  { key: "practice-better", name: "Practice Better", industry: "health", desc: "Nutrition and wellness coaching.", status: "planned" },
  { key: "zocdoc", name: "Zocdoc", industry: "health", desc: "Patient booking marketplace.", status: "planned" },
  { key: "theranest", name: "TheraNest", industry: "health", desc: "Behavioral health practice management.", status: "planned" },

  // ── Fitness ────────────────────────────────────────────────────────────────
  { key: "mindbody", name: "Mindbody", industry: "fitness", desc: "Studios, gyms and wellness brands.", status: "planned", img: "/mindbody.avif" },
  { key: "glofox", name: "Glofox", industry: "fitness", desc: "Boutique fitness studios.", status: "planned" },
  { key: "wodify", name: "Wodify", industry: "fitness", desc: "CrossFit and functional fitness.", status: "planned" },
  { key: "pushpress", name: "PushPress", industry: "fitness", desc: "Gym management and billing.", status: "planned" },
  { key: "trainerize", name: "Trainerize", industry: "fitness", desc: "Personal trainers and coaches.", status: "planned" },
  { key: "teamup", name: "TeamUp", industry: "fitness", desc: "Classes and memberships.", status: "planned" },
  { key: "zenplanner", name: "Zen Planner", industry: "fitness", desc: "Martial arts and fitness studios.", status: "planned" },
  { key: "momence", name: "Momence", industry: "fitness", desc: "Yoga, Pilates and studio classes.", status: "planned" },
  { key: "truecoach", name: "TrueCoach", industry: "fitness", desc: "Online and in-person coaching.", status: "planned" },

  // ── Pets ───────────────────────────────────────────────────────────────────
  { key: "gingr", name: "Gingr", industry: "pets", desc: "Grooming, daycare and boarding.", status: "planned" },
  { key: "moego", name: "MoeGo", industry: "pets", desc: "Mobile and salon pet grooming.", status: "planned" },
  { key: "daysmart-pet", name: "DaySmart Pet", industry: "pets", desc: "Pet care business software.", status: "planned" },
  { key: "petdesk", name: "PetDesk", industry: "pets", desc: "Veterinary clinic appointments.", status: "planned" },
  { key: "covetrus", name: "Covetrus Pulse", industry: "pets", desc: "Veterinary practice management.", status: "planned" },

  // ── Auto ───────────────────────────────────────────────────────────────────
  { key: "shopmonkey", name: "Shopmonkey", industry: "auto", desc: "Auto repair shop scheduling.", status: "planned" },
  { key: "tekmetric", name: "Tekmetric", industry: "auto", desc: "Repair shop management.", status: "planned" },
  { key: "shop-ware", name: "Shop-Ware", industry: "auto", desc: "Shop workflow and appointments.", status: "planned" },

  // ── Home services ──────────────────────────────────────────────────────────
  { key: "jobber", name: "Jobber", industry: "home", desc: "Field service and home services.", status: "planned" },
  { key: "housecall", name: "Housecall Pro", industry: "home", desc: "Plumbing, HVAC, cleaning.", status: "planned" },
  { key: "servicetitan", name: "ServiceTitan", industry: "home", desc: "Enterprise home services.", status: "planned" },
  { key: "workiz", name: "Workiz", industry: "home", desc: "Field service scheduling.", status: "planned" },
  { key: "booking-koala", name: "Booking Koala", industry: "home", desc: "Cleaning company bookings.", status: "planned" },
  { key: "zenmaid", name: "ZenMaid", industry: "home", desc: "Maid and cleaning services.", status: "planned" },

  // ── Education ──────────────────────────────────────────────────────────────
  { key: "teachworks", name: "Teachworks", industry: "education", desc: "Tutoring and music lessons.", status: "planned" },
  { key: "opus1", name: "Opus1.io", industry: "education", desc: "Music school management.", status: "planned" },
  { key: "tutorbird", name: "TutorBird", industry: "education", desc: "Private tutors and lesson schedules.", status: "planned" },

  // ── Professional services ──────────────────────────────────────────────────
  { key: "clio", name: "Clio", industry: "professional", desc: "Law practice appointments.", status: "planned" },
  { key: "honeybook", name: "HoneyBook", industry: "professional", desc: "Creative and consulting businesses.", status: "planned" },
  { key: "dubsado", name: "Dubsado", industry: "professional", desc: "Client management for freelancers.", status: "planned" },
  { key: "hubspot-meetings", name: "HubSpot Meetings", industry: "professional", desc: "Sales and consulting meetings.", status: "planned" },
  { key: "zoho-bookings", name: "Zoho Bookings", industry: "professional", desc: "Zoho ecosystem scheduling.", status: "planned" },
  { key: "microsoft-bookings", name: "Microsoft Bookings", industry: "professional", desc: "Microsoft 365 booking pages.", status: "planned" },

  // ── Hospitality ────────────────────────────────────────────────────────────
  { key: "opentable", name: "OpenTable", industry: "hospitality", desc: "Restaurant reservation no-shows.", status: "planned" },
  { key: "resy", name: "Resy", industry: "hospitality", desc: "Restaurant cancellations.", status: "planned" },
  { key: "tock", name: "Tock", industry: "hospitality", desc: "Prepaid dining and events.", status: "planned" },
  { key: "fareharbor", name: "FareHarbor", industry: "hospitality", desc: "Tours and activities.", status: "planned" },
  { key: "bookeo", name: "Bookeo", industry: "hospitality", desc: "Tours, classes and rentals.", status: "planned" },
  { key: "rezdy", name: "Rezdy", industry: "hospitality", desc: "Tour operator bookings.", status: "planned" },
];

export const STATUS_META: Record<IntegrationStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  soon: { label: "Coming soon", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  planned: { label: "Planned", cls: "bg-slate-50 text-slate-600 ring-slate-200" },
};
