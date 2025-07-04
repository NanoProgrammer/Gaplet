"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 👇 Bloquea el scroll cuando el menú está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [menuOpen]);

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-sm px-12 transition-all duration-300 ${scrolled ? "bg-white shadow-xl h-20" : "h-24 bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center h-full">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo_gaplets.avif" alt="Gaplet Logo" width={170} height={60} />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-8">
          <ul className="flex gap-6 text-sm font-medium">
            <li><Link href="#Features" className="hover:underline hover:text-[var(--primary-hover)]">Features</Link></li>
            <li><Link href="#Pricing" className="hover:underline hover:text-[var(--primary-hover)]">Pricing</Link></li>
            <li><Link href="#Integration" className="hover:underline hover:text-[var(--primary-hover)]">Integration</Link></li>
            <li><Link href="#FAQ" className="hover:underline hover:text-[var(--primary-hover)]">FAQ</Link></li>
          </ul>
        </nav>

        {/* DESKTOP BUTTONS */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/sign-up"><Button className="rounded-md">Sign up</Button></Link>
          <Link href="/sign-in"><Button variant="outline" className="rounded-md">Sign in</Button></Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-300 shadow-lg px-14 py-24 space-y-8 rounded-md">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <Link href="#Features" onClick={() => setMenuOpen(false)} className="hover:underline hover:text-[var(--primary-hover)]">Features</Link>
            <Link href="#Pricing" onClick={() => setMenuOpen(false)} className="hover:underline hover:text-[var(--primary-hover)]">Pricing</Link>
            <Link href="#Integration" onClick={() => setMenuOpen(false)} className="hover:underline hover:text-[var(--primary-hover)]">Integration</Link>
            <Link href="#FAQ" onClick={() => setMenuOpen(false)} className="hover:underline hover:text-[var(--primary-hover)]">FAQ</Link>
          </nav>
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Link href="/signup"><Button className="w-full rounded-md">Sign up</Button></Link>
            <Link href="/signin"><Button variant="outline" className="w-full rounded-md">Sign in</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}
