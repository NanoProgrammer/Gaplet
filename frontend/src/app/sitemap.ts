import type { MetadataRoute } from "next";
const BASE_URL = "https://gaplets.com";

type Entry = MetadataRoute.Sitemap[number];

async function getAllBlogPosts(): Promise<Array<{ slug: string; updatedAt?: string | Date }>> {
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: Entry[] = [
    { url: `${BASE_URL}/`,      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/privacy`,lastModified: now,changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/blog`,  lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
  ];

  const posts = await getAllBlogPosts();
  const blogRoutes: Entry[] = posts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
