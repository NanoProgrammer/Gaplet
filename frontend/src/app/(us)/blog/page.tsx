import Link from 'next/link';
import { blogPosts } from '@/data/blogPosts';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gaplets Blog | Tips on Scheduling, Automation, and Revenue Recovery',
  description:
    'Read insights and strategies on filling last-minute cancellations, smart waitlist management, and improving your appointment scheduling with Gaplets.',
  openGraph: {
    title: 'Gaplets Blog | Tips on Scheduling and Revenue Recovery',
    description:
      'Articles on how to automate your schedule, reduce no-shows, and boost revenue using Gaplets.',
    url: 'https://gaplets.com/blog',
    siteName: 'Gaplets',
    type: 'website',
    images: [
      {
        url: '/og_gaplet.png',
        width: 1200,
        height: 630,
        alt: 'Gaplets Blog Open Graph Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaplets Blog | Automation Tips & Revenue Insights',
    description:
      'Get tips to fill last-minute appointment gaps and automate your workflow using Gaplets.',
    images: ['/og_gaplet.png'],
  },
};

export default function BlogPage() {
  return (
    <section className="px-6 py-24 max-w-4xl mx-auto space-y-10">
      <h1 className="text-4xl font-bold text-center text-gray-900">Blog</h1>
      <div className="grid gap-8">
        {blogPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article className="border p-6 rounded-xl shadow-sm hover:shadow-md transition hover:scale-[1.01] bg-white">
              <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
              <p className="text-muted-foreground text-sm mt-1">{post.date}</p>
              <p className="text-neutral-600 mt-3 line-clamp-2">
                {post.content.replace(/<[^>]+>/g, '').slice(0, 100)}...
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
