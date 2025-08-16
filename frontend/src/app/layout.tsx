// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://gaplets.com"),
  applicationName: "Gaplets",
  title: "Gaplets | Square-Powered Last-Minute Appointment Filler",
  description:
    "Detect last-minute cancellations in Square and instantly notify waitlisted customers. Recover lost revenue and keep your calendar full—right from your Square dashboard.",
  keywords: [
    "Square integration",
    "Square Appointments",
    "Square waitlist",
    "fill last-minute cancellations",
    "appointment automation",
    "no-show recovery",
    "salon scheduling Square",
    "clinic scheduling Square",
  ],
  alternates: {
    canonical: "https://gaplets.com/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "Gaplets",
    title: "Gaplets | Fill Last-Minute Appointments via Square",
    description:
      "Leverage Square’s customer management: Gaplets auto-fills last-minute cancellations from your Square waitlist—zero manual work.",
    url: "https://gaplets.com/",
    locale: "en_US",
    images: [
      {
        url: "https://gaplets.com/og_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplets × Square – product preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@your_handle",    // opcional
    creator: "@your_handle", // opcional
    title: "Gaplets | Square Integration for No-Show Recovery",
    description:
      "Plug Gaplets into Square to auto-notify clients when slots free up—stop losing revenue to no-shows.",
    images: ["https://gaplets.com/og_square_gaplet.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32x32.png",
  },
  category: "Business & Productivity",
};

export const viewport: Viewport = {
  themeColor: "#0A0F25",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans bg-white text-black">{children}
        <Analytics />
      </body>
    </html>
  );
}
