// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Gaplets | Square-Powered Last-Minute Appointment Filler",
  description:
    "Seamlessly integrate with Square to automatically detect last-minute cancellations and notify your Square customers. Recover lost revenue and streamline scheduling right from your Square dashboard.",
  keywords: [
    "Square integration",
    "Square appointments",
    "Square waitlist",
    "fill last-minute cancellations",
    "appointment automation",
    "salon scheduling with Square",
    "clinic scheduling Square",
  ],
  metadataBase: new URL("https://gaplets.com/"),
  openGraph: {
    title: "Gaplets | Fill Last-Minute Appointments via Square",
    description:
      "Leverage Square’s customer management—Gaplets auto-fills your last-minute cancellations from your Square waitlist with zero manual work.",
    url: "https://gaplets.com/",
    siteName: "Gaplets",
    type: "website",
    images: [
      {
        url: "/og_square_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplets Square integration screenshot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaplets | Square Integration for No-Show Recovery",
    description:
      "Plug Gaplets into your Square account to instantly notify clients when slots free up—never lose revenue to no-shows again.",
    images: ["/og_square_gaplet.png"],
  },
};

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
