// Este layout se aplica a todas las páginas dentro de /privacy, /terms, etc.

import type { ReactNode } from "react";

export default function LawLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black antialiased">
      {children}
    </div>
  );
}
