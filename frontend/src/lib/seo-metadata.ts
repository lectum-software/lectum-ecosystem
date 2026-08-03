import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const DEFAULT_API_URL = "http://localhost:3001";

export type SeoMetadataPageKey =
  | "default"
  | "home"
  | "psychologists"
  | "psychologist_profile"
  | "community"
  | "community_post"
  | "top_mentors";

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
  ogDescription?: string;
  ogTitle?: string;
  robotsFollow?: boolean;
  robotsIndex?: boolean;
  title: string;
  type?: "article" | "website";
  video?: string;
};

type SeoMetadataOverrides = {
  canonical?: string | null;
  description?: string | null;
  image?: string | null;
  ogDescription?: string | null;
  ogTitle?: string | null;
  title?: string | null;
  type?: "article" | "website";
  video?: string | null;
};

type PublicCommunityPostSeo = {
  canonical_url: string;
  description: string;
  media_type: string | null;
  og_description: string;
  og_image_url: string | null;
  og_title: string;
  og_video_url: string | null;
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
              url: resolvedImage,
            },
          ]
        : undefined,
      type: overrides.type ?? fallback.type ?? "website",
      title: ogTitle,
      url: resolvedCanonical,
      videos: resolvedVideo
        ? [
            {
              url: resolvedVideo,
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
      headers: {
        "Accept-Language": "pt",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<PublicCommunityPostSeo>;

    return body.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
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
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    title: seo.title,
    type: "article",
    video: seo.og_video_url,
  });
};
