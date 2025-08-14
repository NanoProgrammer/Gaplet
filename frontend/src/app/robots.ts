// app/robots.ts
import type { MetadataRoute } from "next";

const SITE = "https://gaplets.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // API & internal
          "/api/",
          "/_next/",
          "/static/",
          "/assets/",

          // Auth & account
          "/signin",
          "/signup",
          "/forgotPassword",
          "/recoverPassword",
          "/account",
          "/account/",

          // App (privado)
          "/dashboard",
          "/dashboard/",
          "/tools",
          "/tools/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
