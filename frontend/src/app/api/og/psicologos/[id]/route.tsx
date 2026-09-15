import { getPublicPsychologistSeo, resolveSeoMediaUrl } from "@/lib/seo-metadata";
import { createSquareOpenGraphImageResponse } from "@/lib/square-og-image";

export const dynamic = "force-dynamic";

type PsychologistOpenGraphImageRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = async (request: Request, { params }: PsychologistOpenGraphImageRouteContext) => {
  const { id } = await params;
  const seo = await getPublicPsychologistSeo({ id });
  const sourceUrl = resolveSeoMediaUrl(seo?.og_image_url);
  const fallbackUrl = new URL("/logo-light.png", request.url).toString();

  return createSquareOpenGraphImageResponse(sourceUrl, fallbackUrl);
};
