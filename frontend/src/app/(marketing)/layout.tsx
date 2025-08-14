// src/app/(marketing)/layout.tsx
import type { ReactNode } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-dvh">{children}</main>
      <Footer />
    </>
  );
}
