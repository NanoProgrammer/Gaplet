import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Importación de fuentes con variables
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

// SEO realista y coherente con la propuesta de Gaplet
export const metadata: Metadata = {
  title: "Gaplets | Smart Waitlist Management for Clinics and Service Providers",
  description:
    "Gaplets fills last-minute cancellations by automatically notifying eligible clients from your existing schedule — recover revenue and never leave a spot empty.",
  keywords: [
    "waitlist management",
    "calendar automation",
    "fill last minute cancellations",
    "appointment notifications",
    "clinic no-show solution",
    "gap recovery software",
  ],
  metadataBase: new URL("https://gaplets.com"),
  openGraph: {
    title: "Gaplet",
    description:
      "Recover revenue from cancellations and no-shows. Gaplet automatically fills last-minute appointment slots using your existing waitlist.",
    url: "https://gaplets.com",
    siteName: "Gaplet",
    type: "website",
    images: [
      {
        url: "og_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplet Open Graph Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaplet",
    description:
      "Never let a last-minute cancellation go to waste — use Gaplet to automatically fill empty appointments.",
    images: ["/og_gaplet.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans bg-white text-black">
        {children}
      </body>
    </html>
  );
}
