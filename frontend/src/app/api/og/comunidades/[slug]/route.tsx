import { getPublicCommunitySeo, resolveSeoMediaUrl } from "@/lib/seo-metadata";
import { createSquareOpenGraphImageResponse } from "@/lib/square-og-image";

export const dynamic = "force-dynamic";

type CommunityOpenGraphImageRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export const GET = async (request: Request, { params }: CommunityOpenGraphImageRouteContext) => {
  const { slug } = await params;
  const seo = await getPublicCommunitySeo({ slug });
  const sourceUrl = resolveSeoMediaUrl(seo?.og_image_url);
  const fallbackUrl = new URL("/logo-light.png", request.url).toString();

  return createSquareOpenGraphImageResponse(sourceUrl, fallbackUrl);
};
