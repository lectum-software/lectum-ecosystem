import type { Metadata } from "next";
import type { VideoCaptions } from "@/components/video-captions/types";
import { absoluteUrl } from "@/lib/seo";
import { resolveSeoMediaUrl, resolveSeoMetadata } from "@/lib/seo-metadata";
import { getPublicApiSource } from "@/utils/public-asset-sources";

export type ReelQuery = {
  reel?: string | string[];
  reelPost?: string | string[];
  reelReply?: string | string[];
};
export type PublicReel = {
  canonical_path: string;
  post_path: string;
  video_id: string;
  reply_id: string | null;
  post_title: string;
  post_content: string;
  video_title: string | null;
  video_content: string;
  professional_name: string;
  published_at: string;
  hls_url: string;
  content_url: string | null;
  thumbnail_url: string | null;
  thumbnail_path: string | null;
  captions: VideoCaptions | null;
};
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value);

export async function getPublicReel(slug: string, id: string, query: ReelQuery) {
  if (
    !validId(query.reel) ||
    (query.reelPost !== undefined && query.reelPost !== id) ||
    (query.reelReply !== undefined && !validId(query.reelReply))
  )
    return null;
  const api = getPublicApiSource()?.origin;
  if (!api) return null;
  const path = [slug, id, query.reel].map(encodeURIComponent);
  const response = await fetch(
    `${api}/api/public/seo/community-post/${path[0]}/${path[1]}/videos/${path[2]}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Public video temporarily unavailable");
  const body = (await response.json()) as { success: boolean; data?: PublicReel };
  const data = body.success ? body.data : null;
  if (
    !data ||
    data.video_id !== query.reel ||
    (query.reelReply !== undefined && data.reply_id !== query.reelReply)
  )
    return null;
  return data;
}

export function reelSeoContent(data: PublicReel) {
  const title = [
    data.post_title,
    data.video_title !== data.post_title ? data.video_title : null,
    data.professional_name,
  ]
    .filter(Boolean)
    .join(" | ");
  const description = (
    data.post_content ||
    data.video_content ||
    data.captions?.cues.map((cue) => cue.text).join(" ") ||
    data.post_title
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
  const api = getPublicApiSource();
  const thumbnail =
    data.thumbnail_path && api ? new URL(data.thumbnail_path, api.origin).toString() : undefined;
  return { title, description, thumbnail };
}

export async function reelMetadata(data: PublicReel | null): Promise<Metadata> {
  if (!data)
    return { title: "Vídeo indisponível | Lectum", robots: { index: false, follow: false } };
  const { title, description, thumbnail } = reelSeoContent(data);
  return resolveSeoMetadata(
    "community_post",
    { title, description },
    {
      title,
      ogTitle: title,
      description,
      ogDescription: description,
      canonical: data.canonical_path,
      openGraphUrl: data.canonical_path,
      image: thumbnail,
      video: data.content_url,
      type: "video.other",
    },
  );
}

export function reelVideoObject(data: PublicReel) {
  const { title, description, thumbnail } = reelSeoContent(data);
  if (!thumbnail || !Number.isFinite(Date.parse(data.published_at))) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: data.post_content.trim() || description,
    thumbnailUrl: [thumbnail],
    uploadDate: data.published_at,
    url: absoluteUrl(data.canonical_path),
    contentUrl: data.content_url ? resolveSeoMediaUrl(data.content_url) : undefined,
    transcript: data.captions?.cues.map((cue) => cue.text).join(" ") || undefined,
    inLanguage: "pt-BR",
  };
}

export function reelPlaybackUrl(value: string) {
  const trusted = resolveSeoMediaUrl(value);
  if (trusted) return trusted;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      /^customer-[a-zA-Z0-9_-]+\.cloudflarestream\.com$/.test(url.hostname) &&
      url.pathname.endsWith("/manifest/video.m3u8")
    )
      return url.toString();
  } catch {}
  return undefined;
}
