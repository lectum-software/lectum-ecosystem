import { sitemapPage, sitemapResponse, sitemapUnavailable } from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  try {
    const xml = await sitemapPage(file);
    return xml ? sitemapResponse(xml) : new Response(null, { status: 404 });
  } catch {
    return sitemapUnavailable();
  }
}
