import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Gaplets",
  description:
    "Discover the story behind Gaplets, meet the creator, and learn how this project aims to improve last-minute appointment scheduling.",
  alternates: {
    canonical: "https://gaplets.com/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate bg-gradient-to-br from-[#eef4f9] via-[#fcf8ff] to-[#f7fcfa] px-6 py-24 text-neutral-800 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.05),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(8,145,178,0.05),transparent_60%)]" />
      <div className="relative z-10 max-w-4xl mx-auto space-y-20">{children}</div>
    </section>
  );
}