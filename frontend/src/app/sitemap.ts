// app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://gaplets.com";

type Entry = MetadataRoute.Sitemap[number];

function m(path: string, opts?: Partial<Entry>): Entry {
  const now = new Date();
  return {
    url: `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    lastModified: opts?.lastModified ?? now,
    changeFrequency: opts?.changeFrequency ?? "weekly",
    priority: opts?.priority ?? 0.5,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Si luego conectas un CMS/MDX para el blog, hidrata aquí.
  // Devuelve [{ slug: "post-slug", updatedAt?: string | Date }, ...]
  const blogPosts: Array<{ slug: string; updatedAt?: string | Date }> = [];

  const core: Entry[] = [
    m("/", { priority: 1.0, changeFrequency: "weekly" }),

    // Marketing
    m("/features", { priority: 0.9 }),
    m("/features/automation", { priority: 0.8 }),
    m("/features/notifications", { priority: 0.8 }),
    m("/integrations", { priority: 0.8 }),
    m("/integrations/square", { priority: 0.8 }),
    m("/how-it-works", { priority: 0.8 }),
    m("/use-cases", { priority: 0.7 }),
    m("/price", { priority: 0.8 }),
    m("/testimonials", { priority: 0.6 }),
    m("/security", { priority: 0.5 }),

    // Docs / Help
    m("/docs", { priority: 0.5, changeFrequency: "monthly" }),
    m("/docs/faq", { priority: 0.5, changeFrequency: "monthly" }),

    // Company
    m("/about", { priority: 0.4, changeFrequency: "yearly" }),
    m("/contact", { priority: 0.4, changeFrequency: "yearly" }),

    // Legal
    m("/terms", { priority: 0.2, changeFrequency: "yearly" }),
    m("/privacy", { priority: 0.2, changeFrequency: "yearly" }),

    // Blog index (si aún no hay posts, igual se indexa la portada)
    m("/blog", { priority: 0.4, changeFrequency: "monthly" }),
  ];

  const blog: Entry[] = blogPosts.map((p) =>
    m(`/blog/${p.slug}`, {
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    }),
  );

  return [...core, ...blog];
}
