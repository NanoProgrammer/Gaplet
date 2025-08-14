// app/(marketing)/page.tsx
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";
import Demo from "@/components/Demo"; // este ya incluye id="Demo" adentro
import CTA from "@/components/CTA";

// Asegúrate que esta ruta de import coincida con tu archivo:
import {
  RevenueLossTeaser,
  HowItWorksTeaser,
  IntegrationsTeaser,
  BenefitsMarquee,
  PricingTeaserGlow,
  FAQTeaserStrip,
} from "@/components/home/teasers-animated"; // o teasers-soul

export const metadata: Metadata = {
  title: "Gaplets | Fill last-minute cancellations automatically",
  description:
    "Detect cancellations, notify eligible clients via SMS/Email, and auto-book the first confirmation. Recover lost revenue in minutes.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="relative">
      <Hero />

      {/* Pain + valor con bloques animados */}
      <RevenueLossTeaser />

      {/* 3 pasos (un solo estilo de card en esta sección) */}
      <HowItWorksTeaser />

      {/* Integraciones (Square live + coming soon) */}
      <IntegrationsTeaser />

      {/* Beneficios con marquee infinito (sin corte) */}
      <BenefitsMarquee />

      {/* Social proof */}
      <Testimonials />

      {/* Teaser de pricing con CTA brillante */}
      <PricingTeaserGlow />

      {/* Demo: ya trae id="Demo" dentro del componente */}
      <Demo />

      {/* FAQ corto + link al Help Center */}
      <FAQTeaserStrip />

      <CTA />
    </main>
  );
}
