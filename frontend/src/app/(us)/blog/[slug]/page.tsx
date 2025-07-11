import { notFound } from 'next/navigation';
import { blogPosts } from '@/data/blogPosts';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: `${post.title} | Blog | Gaplets`,
    description: `Read about ${post.title} on Gaplets blog.`,
    openGraph: {
      title: `${post.title} | Gaplets Blog`,
      description: `Explore insights: ${post.title}`,
      url: `https://gaplets.com/blog/${post.slug}`,
      type: 'article',
      images: post.image
        ? [
            {
              url: post.image,
              width: 1200,
              height: 630,
              alt: post.alt || post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Gaplets Blog`,
      description: `Explore insights: ${post.title}`,
      images: post.image ? [post.image] : [],
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = blogPosts.find((p) => p.slug === params.slug);

  if (!post) return notFound();

  return (
    <section className="px-6 py-24 max-w-3xl mx-auto space-y-10">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">{post.title}</h1>
        <p className="text-muted-foreground text-sm">{post.date}</p>
        {post.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
            <img
              src={post.image}
              alt={post.alt || post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </header>

      <div
        className="prose prose-neutral max-w-none text-base"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </section>
  );
}
