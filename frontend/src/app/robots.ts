// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/signin",
          "/signup",             // si es solo auth; si es landing pública, quítala de aquí
          "/forgotPassword",
          "/recoverPassword",
          "/recoverPassword/",
          "/dashboard",
          "/dashboard/",
        ],
      },
    ],
    sitemap: "https://gaplets.com/sitemap.xml",
    host: "https://gaplets.com",
  };
}
