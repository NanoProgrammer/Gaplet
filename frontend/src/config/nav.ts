// src/config/nav.ts
export const PRICING_PATH = "/price"; // <- si prefieres /pricing, cámbialo aquí

export const NAV = {
  primary: [
    { href: "/features", label: "Features" },
    { href: "/use-cases", label: "Use cases" },
    { href: "/integrations", label: "Integrations" },
    { href: PRICING_PATH, label: "Pricing" },
    { href: "/docs/faq", label: "FAQ" },
  ],
  more: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/testimonials", label: "Testimonials" },
    { href: "/integrations/square", label: "Square" },
    { href: "/security", label: "Security & compliance" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" }, // si aún no existe, quítalo
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ],
} as const;
