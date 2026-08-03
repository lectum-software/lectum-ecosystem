import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const DEFAULT_API_URL = "http://localhost:3001";

export type SeoMetadataPageKey =
  | "default"
  | "home"
  | "psychologists"
  | "psychologist_profile"
  | "community"
  | "community_detail"
  | "community_post"
  | "top_mentors";

type SeoOpenGraphType = "article" | "video.other" | "website";

type PublicSeoMetadataSetting = {
  canonical_url: string | null;
  description: string;
  keywords: string[];
  og_description: string | null;
  og_image_url: string | null;
  og_title: string | null;
  page_key: SeoMetadataPageKey;
  robots_follow: boolean;
  robots_index: boolean;
  route_path: string | null;
  title: string;
};

type PublicSeoMetadataSettings = {
  settings: PublicSeoMetadataSetting[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
};

export type SeoMetadataFallback = {
  canonical?: string;
  description: string;
  image?: string;
  imageHeight?: number | null;
  imageWidth?: number | null;
  ogDescription?: string;
  ogTitle?: string;
  robotsFollow?: boolean;
  robotsIndex?: boolean;
  title: string;
  type?: SeoOpenGraphType;
  video?: string;
  videoHeight?: number | null;
  videoType?: string | null;
  videoWidth?: number | null;
};

type SeoMetadataOverrides = {
  canonical?: string | null;
  description?: string | null;
  image?: string | null;
  imageHeight?: number | null;
  imageWidth?: number | null;
  ogDescription?: string | null;
  ogTitle?: string | null;
  title?: string | null;
  type?: SeoOpenGraphType;
  video?: string | null;
  videoHeight?: number | null;
  videoType?: string | null;
  videoWidth?: number | null;
};

type PublicCommunityPostSeo = {
  canonical_url: string;
  description: string;
  media_type: string | null;
  og_description: string;
  og_image_height: number | null;
  og_image_url: string | null;
  og_image_width: number | null;
  og_title: string;
  og_video_url: string | null;
  title: string;
};

type PublicCommunitySeo = {
  canonical_url: string;
  description: string;
  name: string;
  og_description: string;
  og_image_url: string | null;
  og_title: string;
  slug: string;
  title: string;
};

const apiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

const resolveAbsoluteUrl = (value?: string | null) => {
  if (!value) return undefined;

  if (value.startsWith("/public/files/")) return `${apiBaseUrl()}${value}`;

  try {
    return new URL(value).toString();
  } catch {
    return absoluteUrl(value);
  }
};

const resolveVideoType = (value?: string | null) => {
  const normalized = value?.split("?")[0]?.toLowerCase() ?? "";

  if (normalized.endsWith(".mp4")) return "video/mp4";
  if (normalized.endsWith(".webm")) return "video/webm";
  if (normalized.endsWith(".mov") || normalized.endsWith(".qt")) return "video/quicktime";

  return undefined;
};

const getPublicSeoSettings = async () => {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/public/seo/metadata`, {
      headers: {
        "Accept-Language": "pt",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<PublicSeoMetadataSettings>;

    return body.success ? (body.data?.settings ?? null) : null;
  } catch {
    return null;
  }
};

export const resolveSeoMetadata = async (
  pageKey: SeoMetadataPageKey,
  fallback: SeoMetadataFallback,
  overrides: SeoMetadataOverrides = {},
): Promise<Metadata> => {
  const settings = await getPublicSeoSettings();
  const setting = settings?.find((item) => item.page_key === pageKey);
  const title = overrides.title || setting?.title || fallback.title;
  const description = overrides.description || setting?.description || fallback.description;
  const canonical = overrides.canonical || setting?.canonical_url || fallback.canonical;
  const image = overrides.image || setting?.og_image_url || fallback.image || "/logo-light.png";
  const video = overrides.video || fallback.video;
  const ogTitle = overrides.ogTitle || setting?.og_title || fallback.ogTitle || title;
  const ogDescription =
    overrides.ogDescription || setting?.og_description || fallback.ogDescription || description;
  const robotsIndex = setting?.robots_index ?? fallback.robotsIndex ?? true;
  const robotsFollow = setting?.robots_follow ?? fallback.robotsFollow ?? true;
  const resolvedImage = resolveAbsoluteUrl(image);
  const resolvedVideo = resolveAbsoluteUrl(video);
  const imageWidth = overrides.imageWidth ?? fallback.imageWidth ?? undefined;
  const imageHeight = overrides.imageHeight ?? fallback.imageHeight ?? undefined;
  const videoWidth = overrides.videoWidth ?? fallback.videoWidth ?? undefined;
  const videoHeight = overrides.videoHeight ?? fallback.videoHeight ?? undefined;
  const videoType = overrides.videoType ?? fallback.videoType ?? resolveVideoType(resolvedVideo);
  const routePath = setting?.route_path?.includes("[") ? undefined : setting?.route_path;
  const resolvedCanonical = resolveAbsoluteUrl(canonical || routePath);

  return {
    title: { absolute: title },
    description,
    keywords: setting?.keywords?.length ? setting.keywords : undefined,
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    openGraph: {
      description: ogDescription,
      images: resolvedImage
        ? [
            {
              alt: title,
              height: imageHeight,
              url: resolvedImage,
              width: imageWidth,
            },
          ]
        : undefined,
      type: overrides.type ?? fallback.type ?? "website",
      title: ogTitle,
      url: resolvedCanonical,
      videos: resolvedVideo
        ? [
            {
              height: videoHeight,
              type: videoType,
              url: resolvedVideo,
              width: videoWidth,
            },
          ]
        : undefined,
    },
    robots: {
      follow: robotsFollow,
      googleBot: {
        follow: robotsFollow,
        index: robotsIndex,
        noimageindex: !robotsIndex,
        nosnippet: !robotsIndex,
      },
      index: robotsIndex,
    },
    twitter: {
      card: "summary_large_image",
      description: ogDescription,
      images: resolvedImage ? [resolvedImage] : undefined,
      title: ogTitle,
    },
  };
};

const getPublicCommunityPostSeo = async ({
  id,
  replyId,
  slug,
}: {
  id: string;
  replyId?: string;
  slug: string;
}) => {
  const encodedSlug = encodeURIComponent(slug);
  const encodedId = encodeURIComponent(id);
  const encodedReplyId = replyId ? encodeURIComponent(replyId) : null;
  const path = encodedReplyId
    ? `/api/public/seo/community-post/${encodedSlug}/${encodedId}/replies/${encodedReplyId}`
    : `/api/public/seo/community-post/${encodedSlug}/${encodedId}`;

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "pt",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<PublicCommunityPostSeo>;

    return body.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
};

const getPublicCommunitySeo = async ({ slug }: { slug: string }) => {
  const encodedSlug = encodeURIComponent(slug);

  try {
    const response = await fetch(`${apiBaseUrl()}/api/public/seo/community/${encodedSlug}`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "pt",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<PublicCommunitySeo>;

    return body.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
};

export const resolveCommunitySeoMetadata = async ({
  fallback,
  slug,
}: {
  fallback: SeoMetadataFallback;
  slug: string;
}): Promise<Metadata> => {
  const seo = await getPublicCommunitySeo({ slug });

  if (!seo) return resolveSeoMetadata("community_detail", fallback);

  return resolveSeoMetadata("community_detail", fallback, {
    canonical: seo.canonical_url,
    description: seo.description,
    image: seo.og_image_url,
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    title: seo.title,
  });
};

export const resolveCommunityPostSeoMetadata = async ({
  fallback,
  id,
  replyId,
  slug,
}: {
  fallback: SeoMetadataFallback;
  id: string;
  replyId?: string;
  slug: string;
}): Promise<Metadata> => {
  const seo = await getPublicCommunityPostSeo({ id, replyId, slug });

  if (!seo) return resolveSeoMetadata("community_post", fallback);

  return resolveSeoMetadata("community_post", fallback, {
    canonical: seo.canonical_url,
    description: seo.description,
    image: seo.og_image_url,
    imageHeight: seo.og_image_height,
    imageWidth: seo.og_image_width,
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    title: seo.title,
    type: seo.media_type === "video" ? "video.other" : "article",
    video: seo.og_video_url,
    videoHeight: seo.media_type === "video" ? 1920 : undefined,
    videoWidth: seo.media_type === "video" ? 1080 : undefined,
  });
};
