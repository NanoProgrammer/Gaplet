"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const PRICING_PATH = "/price"; // cambia a "/pricing" si usas esa ruta

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // sombra al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // bloquear scroll cuando el menú está abierto + ESC para cerrar
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (open) setTimeout(() => firstLinkRef.current?.focus(), 10);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // navegación (agrupada)
  const NAV_PRIMARY = [
    { href: "/features", label: "Features" },
    { href: "/use-cases", label: "Use cases" },
    { href: "/integrations", label: "Integrations" },
    { href: PRICING_PATH, label: "Pricing" },
  ] as const;

  const NAV_SUPPORT = [
    { href: "/docs", label: "Docs" },
    { href: "/docs/faq", label: "FAQ" },
    { href: "/testimonials", label: "Testimonials" },
  ] as const;

  const NAV_COMPANY = [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/security", label: "Security" },
    { href: "/blog", label: "Blog" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ] as const;

  const linkBase =
    "transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-md px-1";
  const isActive = (href: string) => href !== "/" && pathname?.startsWith(href);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-white/60",
        scrolled ? "bg-white/80 shadow-sm" : "bg-white/50",
      ].join(" ")}
    >
      {/* Skip link accesible */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 rounded bg-black px-3 py-1 text-white"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <Image
            src="/logo_gaplets.avif"
            alt="Gaplets"
            width={132}
            height={44}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV_PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${linkBase} ${
                isActive(item.href) ? "text-[var(--primary)] underline underline-offset-4" : "text-foreground/80"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Docs destacado en desktop */}
          <Link
            href="/docs"
            className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
          >
            Docs
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/signin">
            <Button variant="outline" className="h-9 rounded-md">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="h-9 rounded-md">Start free</Button>
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white/70 text-xl"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden">
          {/* overlay clickeable */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
          />
          {/* panel */}
          <div
            id="mobile-menu"
            className="fixed inset-x-0 top-0 z-50 mt-14 max-h-[85vh] overflow-y-auto rounded-b-2xl border-b bg-white px-5 pb-6 pt-3 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            {/* Primary */}
            <MobileGroup title="Product">
              {NAV_PRIMARY.map((item, i) => (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  ref={i === 0 ? firstLinkRef : undefined}
                  active={isActive(item.href)}
                >
                  {item.label}
                </MobileLink>
              ))}
            </MobileGroup>

            {/* Support */}
            <MobileGroup title="Support">
              {NAV_SUPPORT.map((item) => (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  active={isActive(item.href)}
                >
                  {item.label}
                </MobileLink>
              ))}
            </MobileGroup>

            {/* Company */}
            <MobileGroup title="Company">
              {NAV_COMPANY.map((item) => (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  active={isActive(item.href)}
                >
                  {item.label}
                </MobileLink>
              ))}
            </MobileGroup>

            {/* CTAs pegadas al final, fáciles de tocar */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/signin" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full rounded-lg">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)}>
                <Button className="w-full rounded-lg">Start free</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------- helpers móviles ---------- */

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-2">
      <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-1.5">{children}</div>
    </section>
  );
}

const MobileLink = React.forwardRef<
  HTMLAnchorElement,
  { href: string; children: React.ReactNode; onClick?: () => void; active?: boolean }
>(function MobileLink({ href, children, onClick, active = false }, ref) {
  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      className={[
        "block rounded-lg px-3 py-2 text-base",
        active ? "bg-emerald-50 text-emerald-700" : "text-foreground/90 hover:bg-gray-50",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
});
