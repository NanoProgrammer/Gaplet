import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Gaplets",
  description:
    "Review the legal terms and conditions for using Gaplets. Understand your responsibilities as a user of our smart appointment automation platform.",
  keywords: [
    "terms of service",
    "gaplets legal terms",
    "appointment platform agreement",
    "calendar automation terms",
    "SaaS user agreement",
    "smart waitlist platform",
  ],
  alternates: {
    canonical: "https://gaplets.com/terms",
  },
  openGraph: {
    title: "Terms & Conditions | Gaplets",
    description:
      "Read the official terms of service for Gaplets. Understand your rights and responsibilities as a user.",
    url: "https://gaplets.com/terms",
    siteName: "Gaplets",
    type: "article",
    images: [
      {
        url: "/og_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplets terms OG image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | Gaplets",
    description:
      "Gaplets Terms of Service: Your legal agreement when using our appointment automation platform.",
    images: ["/og_gaplet.png"],
  },
};

export default function TermsPage() {
  return (
    <section className="relative isolate bg-gradient-to-br from-[#f2f7fc] via-[#fdfbff] to-[#f8f9fa] px-6 py-24 text-neutral-800 overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.04),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(8,145,178,0.05),transparent_40%)]" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-16 text-base leading-relaxed prose prose-neutral prose-headings:font-semibold prose-headings:text-xl prose-p:mt-0">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Terms & Conditions</h1>
          <p className="text-muted-foreground text-lg mt-4">Last updated: July 2025</p>
        </header>

        {[
          {
            title: "1. Acceptance of Terms",
            content:
              "By accessing or using Gaplets, you agree to be bound by these Terms and all applicable laws and regulations. If you do not agree, you are prohibited from using our platform.",
          },
          {
            title: "2. Platform Use",
            content:
              "You agree to use Gaplets only for lawful purposes and in accordance with these Terms. You may not misuse the platform or interfere with its functionality, APIs, or user experience.",
          },
          {
            title: "3. Account Responsibility",
            content:
              "You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.",
          },
          {
            title: "4. Intellectual Property",
            content:
              "All content, software, branding, and features on Gaplets are the property of Gaplets Inc. You may not copy, modify, or distribute any part without explicit written permission.",
          },
          {
            title: "5. Third-Party Services",
            content:
              "Gaplets integrates with services like Google Calendar, Jane, Square, and Twilio. We are not responsible for their availability or data policies. Your use of them is governed by their respective terms.",
          },
          {
            title: "6. Limitation of Liability",
            content:
              "Gaplets is provided “as is” without warranty of any kind. We are not liable for any damages resulting from the use or inability to use the platform.",
          },
          {
            title: "7. Termination",
            content:
              "We reserve the right to suspend or terminate your access to the platform at any time, with or without cause or prior notice.",
          },
          {
            title: "8. Changes to These Terms",
            content:
              "These Terms may be updated from time to time. We will post significant changes on this page and notify users when appropriate.",
          },
          {
            title: "9. Governing Law",
            content:
              "These Terms are governed by the laws of Alberta, Canada. Any disputes must be brought in the courts of that jurisdiction.",
          },
          {
            title: "10. Contact",
            content: (
              <>
                For questions regarding these Terms, contact us at{" "}
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=terms@gaplets.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  terms@gaplets.com
                </a>
                .
              </>
            ),
          },
        ].map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
