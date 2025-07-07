"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BlogPostCard({
  slug,
  title,
  excerpt,
  date,
  readingTime,
}: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="rounded-2xl border p-6 bg-white hover:shadow-lg transition"
    >
      <Link href={`/blog/${slug}`}>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{excerpt}</p>
          <p className="text-sm text-muted-foreground">
            {date} • {readingTime}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
