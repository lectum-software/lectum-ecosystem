import { sitemapIndex, sitemapResponse, sitemapUnavailable } from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return sitemapResponse(await sitemapIndex());
  } catch {
    return sitemapUnavailable();
  }
}
