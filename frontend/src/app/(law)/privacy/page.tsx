import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Gaplets",
  description:
    "Read how Gaplets collects, uses, and protects your personal data with secure automation.",
  keywords: [
    "privacy policy",
    "client data protection",
    "calendar scheduling",
    "smart appointment automation",
  ],
  alternates: {
    canonical: "https://gaplets.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Gaplets",
    description:
      "Understand how Gaplets protects your data while helping you manage last-minute appointment slots.",
    url: "https://gaplets.com/privacy",
    siteName: "Gaplets",
    type: "article",
    images: [
      {
        url: "/og_gaplet.png",
        width: 1200,
        height: 630,
        alt: "Gaplets privacy OG image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Gaplets",
    description:
      "We value your privacy. Read how Gaplets secures your information in our smart automation platform.",
    images: ["/og_gaplet.png"],
  },
};

export default function PrivacyPage() {
  return (
    <section className="relative isolate bg-gradient-to-br from-[#f8fafc] via-[#fefcff] to-[#f3f7f9] px-6 py-24 text-neutral-800 overflow-hidden">
      {/* background decor */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_15%,rgba(139,92,246,0.05),transparent_50%),radial-gradient(circle_at_85%_85%,rgba(8,145,178,0.04),transparent_50%)]" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-16 text-base leading-relaxed prose prose-neutral prose-headings:font-semibold prose-headings:text-xl prose-p:mt-0">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg mt-4">
            Last updated: July 2025
          </p>
        </header>

        <section>
          <h2>1. Introduction</h2>
          <p>
            At Gaplets, your privacy matters. This policy explains what
            information we collect, how we use it, and the measures we take to
            keep it secure.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <ul>
            <li>Personal identification: name, email, phone number</li>
            <li>Appointment and calendar data (via integrations)</li>
            <li>Communication preferences (email/SMS)</li>
            <li>Platform usage and interaction analytics</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Data</h2>
          <ul>
            <li>To detect appointment cancellations in real-time</li>
            <li>To notify eligible clients via SMS/email</li>
            <li>To improve our platform, features, and user experience</li>
            <li>To provide technical support and analytics</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Sharing</h2>
          <p>
            We do not sell your personal information. We only share it with
            trusted third-party providers like Google, Stripe, SendGrid, or
            Twilio — strictly for service delivery purposes and under secure data
            agreements.
          </p>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            Your data is retained only as long as necessary to deliver our
            services or fulfill legal requirements. You may request deletion at
            any time.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <ul>
            <li>Access, update, or correct your personal data</li>
            <li>Request deletion of your account or data</li>
            <li>Withdraw consent to marketing communications</li>
            <li>Request a copy of the data we store</li>
          </ul>
        </section>

        <section>
          <h2>7. Data Security</h2>
          <p>
            We use best-in-class practices such as HTTPS encryption, OAuth2
            authentication, role-based access control, and external audits to
            protect your data from unauthorized access or misuse.
          </p>
        </section>

        <section>
          <h2>8. Policy Updates</h2>
          <p>
            We may occasionally update this policy to reflect changes to our
            services or regulatory obligations. You will be notified of material
            updates via email or in-app.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=privacy@gaplets.com"
                  target="_blank"
                  rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80"
            >
              privacy@gaplets.com
            </a>
            
          </p>
        </section>
      </div>
    </section>
  );
}
