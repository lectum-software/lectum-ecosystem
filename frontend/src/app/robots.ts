import type { MetadataRoute } from "next";
import {
  AI_SEARCH_USER_AGENTS,
  AI_TRAINING_USER_AGENTS,
  absoluteUrl,
  getSiteUrl,
  NON_INDEXABLE_ROUTES,
} from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: NON_INDEXABLE_ROUTES,
      },
      {
        userAgent: AI_SEARCH_USER_AGENTS,
        allow: "/",
        disallow: NON_INDEXABLE_ROUTES,
      },
      {
        userAgent: AI_TRAINING_USER_AGENTS,
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl.origin,
  };
}
