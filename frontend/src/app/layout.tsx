// ✅ app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// ✅ Fuentes con CSS variables
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// ✅ Metadata global
export const metadata: Metadata = {
  title: "Gaplets | Last-Minute Appointment App for Clinics and Salons",
  description:
    "Gaplets helps you fill last-minute cancellations automatically. Notify eligible clients from your waitlist and recover lost revenue — all in one smart scheduling app.",
  keywords: [
    "last minute appointment app",
    "fill last minute cancellations",
    "waitlist automation software",
    "smart scheduling for clinics",
    "appointment recovery platform",
    "calendar integration",
    "clinic no-show solution",
  ],
  metadataBase: new URL("https://gaplet.vercel.app/"),
  openGraph: {
    title: "Gaplets | Fill Last-Minute Appointments with Automation",
    description:
      "Stop losing revenue on no-shows. Gaplets fills last-minute cancellations using your own waitlist — fully automated.",
    url: "https://gaplet.vercel.app/",
    siteName: "Gaplets",
    type: "website",
    images: [
      {
        url: "/og_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplets waitlist automation app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaplets | Recover Lost Appointments Automatically",
    description:
      "Smart software to fill appointment gaps. Use Gaplets to notify waitlisted clients when last-minute slots open up.",
    images: ["/og_gaplet.png"],
  },
};

// ✅ Este es el layout real
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans bg-white text-black">
        {children}
      </body>
    </html>
  );
}
