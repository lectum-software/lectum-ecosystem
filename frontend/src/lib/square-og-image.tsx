import { ImageResponse } from "next/og";
import { absoluteUrl } from "@/lib/seo";

export const SQUARE_OPEN_GRAPH_IMAGE_SIZE = 1200;

const fallbackImageUrl = () => absoluteUrl("/logo-light.png");

export const squareOpenGraphImageHeaders = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
  "X-Robots-Tag": "noindex, nofollow",
};

export const createSquareOpenGraphImageResponse = (
  sourceUrl?: string | null,
  fallbackUrl?: string | null,
) => {
  const imageUrl = sourceUrl || fallbackUrl || fallbackImageUrl();
  const fit = sourceUrl ? "cover" : "contain";

  return new ImageResponse(
    <div
      style={{
        backgroundImage: `url(${JSON.stringify(imageUrl)})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: fit,
        display: "flex",
        height: "100%",
        width: "100%",
      }}
    />,
    {
      headers: squareOpenGraphImageHeaders,
      height: SQUARE_OPEN_GRAPH_IMAGE_SIZE,
      width: SQUARE_OPEN_GRAPH_IMAGE_SIZE,
    },
  );
};
