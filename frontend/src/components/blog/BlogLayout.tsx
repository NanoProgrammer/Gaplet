// components/BlogLayout.tsx
'use client';

import { motion } from 'framer-motion';
import { Metadata } from 'next';

type BlogLayoutProps = {
  title: string;
  date: string;
  description?: string;
  children: React.ReactNode;
};

export function generateMetadata({ title, description }: Pick<BlogLayoutProps, 'title' | 'description'>): Metadata {
  return {
    title: `${title} | Gaplets Blog`,
    description: description || 'Insights and updates from the Gaplets journey.',
    openGraph: {
      title: `${title} | Gaplets Blog`,
      description: description || 'Insights and updates from the Gaplets journey.',
      url: `https://gaplets.com/blog/${title.toLowerCase().replace(/\s+/g, '-')}`,
      siteName: 'Gaplets',
      type: 'article',
      images: [
        {
          url: '/og_gaplet.png',
          width: 1200,
          height: 630,
          alt: 'Gaplets blog SEO OG',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Gaplets Blog`,
      description: description || 'Insights from the Gaplets journey.',
      images: ['/og_gaplet.png'],
    },
  };
}

export default function BlogLayout({ title, date, description, children }: BlogLayoutProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative isolate overflow-hidden px-6 py-24 bg-background text-neutral-800"
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_30%,rgba(8,145,178,0.05),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(139,92,246,0.08),transparent_50%)]" />

      <div className="max-w-3xl mx-auto space-y-10 prose prose-neutral prose-headings:text-xl prose-headings:font-semibold">
        <header className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
          <p className="text-muted-foreground text-base">{date}</p>
          {description && <p className="text-muted-foreground text-lg">{description}</p>}
        </header>

        <article className="text-base leading-relaxed">{children}</article>
      </div>
    </motion.section>
  );
}
