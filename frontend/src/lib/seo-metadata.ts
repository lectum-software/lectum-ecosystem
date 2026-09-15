import type { Metadata } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import { getPublicApiSource, isTrustedPublicAssetUrl } from "@/utils/public-asset-sources";
import {
  publicCommunityOpenGraphImageHref,
  publicCommunityPostWhatsappShareHref,
  publicCommunityReplyWhatsappShareHref,
  publicPsychologistOpenGraphImageHref,
} from "@/utils/public-routes";

const COMMUNITY_ICON_MEDIA_PATH_PREFIX = "/community/icons/";
const COMMUNITY_ICON_FRONTEND_PATH_PREFIX = "/images/community/explore/";
const MAX_METADATA_URL_LENGTH = 8192;

export type SeoMetadataPageKey =
  | "default"
  | "home"
  | "psychologists"
  | "psychologist_profile"
  | "community"
  | "community_detail"
  | "community_post"
  | "community_post_reply"
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
  openGraphUrl?: string | null;
  title?: string | null;
  type?: SeoOpenGraphType;
  video?: string | null;
  videoHeight?: number | null;
  videoType?: string | null;
  videoWidth?: number | null;
};

type CommunityPostSeoShareTarget = "default" | "whatsapp";

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
  og_image_height: number | null;
  og_image_url: string | null;
  og_image_width: number | null;
  og_title: string;
  slug: string;
  title: string;
  updated_at: string | null;
};

type PublicPsychologistSeo = {
  canonical_url: string;
  description: string;
  name: string;
  og_description: string;
  og_image_height: number | null;
  og_image_url: string | null;
  og_image_width: number | null;
  og_title: string;
  title: string;
  updated_at: string | null;
};

const apiBaseUrl = () => {
  return getPublicApiSource()?.origin ?? null;
};

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const resolveCommunityIconAssetPath = (pathname: string, search = "") => {
  if (!pathname.startsWith(COMMUNITY_ICON_MEDIA_PATH_PREFIX)) return null;

  const filename = pathname.slice(COMMUNITY_ICON_MEDIA_PATH_PREFIX.length);
  if (!filename || filename.includes("/")) return null;

  return `${COMMUNITY_ICON_FRONTEND_PATH_PREFIX}${filename}${search}`;
};

const normalizeMetadataUrl = (value?: string | null) => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > MAX_METADATA_URL_LENGTH ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(value ?? "")
  ) {
    return null;
  }

  return raw;
};

const resolveCanonicalUrl = (value?: string | null) => {
  const raw = normalizeMetadataUrl(value);
  if (!raw) return undefined;

  try {
    const siteUrl = getSiteUrl();
    const url = new URL(raw, siteUrl);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.origin !== siteUrl.origin ||
      url.username ||
      url.password
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
};

export const resolveSeoMediaUrl = (value?: string | null) => {
  const raw = normalizeMetadataUrl(value);
  if (!raw) return undefined;

  if (raw.startsWith("/public/files/")) {
    const apiBase = apiBaseUrl();
    if (!apiBase) return undefined;

    try {
      const mediaUrl = new URL(raw, apiBase);
      return mediaUrl.pathname.startsWith("/public/files/") ? mediaUrl.toString() : undefined;
    } catch {
      return undefined;
    }
  }
  if (raw.startsWith(COMMUNITY_ICON_MEDIA_PATH_PREFIX)) {
    return absoluteUrl(resolveCommunityIconAssetPath(raw) ?? raw);
  }

  try {
    const siteUrl = getSiteUrl();
    const url = new URL(raw, siteUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return undefined;
    }

    const communityIconPath = resolveCommunityIconAssetPath(url.pathname, url.search);
    if (communityIconPath && url.origin === siteUrl.origin) return absoluteUrl(communityIconPath);

    return url.origin === siteUrl.origin || isTrustedPublicAssetUrl(url)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
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
    const apiBase = apiBaseUrl();
    if (!apiBase) return null;

    const response = await fetch(`${apiBase}/api/public/seo/metadata`, {
      signal: AbortSignal.timeout(5_000),
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
  const video = overrides.video === null ? null : overrides.video || fallback.video;
  const ogTitle = overrides.ogTitle || setting?.og_title || fallback.ogTitle || title;
  const ogDescription =
    overrides.ogDescription || setting?.og_description || fallback.ogDescription || description;
  const robotsIndex = setting?.robots_index ?? fallback.robotsIndex ?? true;
  const robotsFollow = setting?.robots_follow ?? fallback.robotsFollow ?? true;
  const resolvedImage = resolveSeoMediaUrl(image);
  const resolvedVideo = video === null ? undefined : resolveSeoMediaUrl(video);
  const imageWidth = overrides.imageWidth ?? fallback.imageWidth ?? undefined;
  const imageHeight = overrides.imageHeight ?? fallback.imageHeight ?? undefined;
  const videoWidth = overrides.videoWidth ?? fallback.videoWidth ?? undefined;
  const videoHeight = overrides.videoHeight ?? fallback.videoHeight ?? undefined;
  const videoType = overrides.videoType ?? fallback.videoType ?? resolveVideoType(resolvedVideo);
  const routePath = setting?.route_path?.includes("[") ? undefined : setting?.route_path;
  const resolvedCanonical = resolveCanonicalUrl(canonical || routePath);
  const resolvedOpenGraphUrl = resolveCanonicalUrl(overrides.openGraphUrl) ?? resolvedCanonical;

  return {
    title: { absolute: title },
    description,
    keywords: setting?.keywords?.length ? setting.keywords : undefined,
    alternates: resolvedCanonical
      ? {
          canonical: resolvedCanonical,
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
      url: resolvedOpenGraphUrl,
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
    const apiBase = apiBaseUrl();
    if (!apiBase) return null;

    const response = await fetch(`${apiBase}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
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

export const getPublicCommunitySeo = async ({ slug }: { slug: string }) => {
  const encodedSlug = encodeURIComponent(slug);

  try {
    const apiBase = apiBaseUrl();
    if (!apiBase) return null;

    const response = await fetch(`${apiBase}/api/public/seo/community/${encodedSlug}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
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

export const getPublicPsychologistSeo = async ({ id }: { id: string }) => {
  const encodedId = encodeURIComponent(id);

  try {
    const apiBase = apiBaseUrl();
    if (!apiBase) return null;

    const response = await fetch(`${apiBase}/api/public/seo/psychologist/${encodedId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: {
        "Accept-Language": "pt",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<PublicPsychologistSeo>;

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

  const squareImage = seo.og_image_url
    ? publicCommunityOpenGraphImageHref(seo.slug, seo.updated_at)
    : null;

  return resolveSeoMetadata("community_detail", fallback, {
    canonical: seo.canonical_url,
    description: seo.description,
    image: squareImage ?? seo.og_image_url,
    imageHeight: squareImage ? 1200 : seo.og_image_height,
    imageWidth: squareImage ? 1200 : seo.og_image_width,
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    title: seo.title,
  });
};

export const resolvePsychologistSeoMetadata = async ({
  fallback,
  id,
}: {
  fallback: SeoMetadataFallback;
  id: string;
}): Promise<Metadata> => {
  const seo = await getPublicPsychologistSeo({ id });

  if (!seo) return resolveSeoMetadata("psychologist_profile", fallback);

  const squareImage = seo.og_image_url
    ? publicPsychologistOpenGraphImageHref(id, seo.updated_at)
    : null;

  return resolveSeoMetadata("psychologist_profile", fallback, {
    canonical: seo.canonical_url,
    description: seo.description,
    image: squareImage ?? seo.og_image_url,
    imageHeight: squareImage ? 1200 : seo.og_image_height,
    imageWidth: squareImage ? 1200 : seo.og_image_width,
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    title: seo.title,
  });
};

export const resolveCommunityPostSeoMetadata = async ({
  canonicalOverride,
  fallback,
  id,
  openGraphUrlOverride,
  replyId,
  shareTarget = "default",
  slug,
}: {
  canonicalOverride?: string;
  fallback: SeoMetadataFallback;
  id: string;
  openGraphUrlOverride?: string;
  replyId?: string;
  shareTarget?: CommunityPostSeoShareTarget;
  slug: string;
}): Promise<Metadata> => {
  const seo = await getPublicCommunityPostSeo({ id, replyId, slug });
  const pageKey: SeoMetadataPageKey = replyId ? "community_post_reply" : "community_post";
  const suppressVideoPreview = shareTarget === "whatsapp";
  const whatsappSharePath =
    suppressVideoPreview && replyId
      ? publicCommunityReplyWhatsappShareHref(slug, id, replyId)
      : suppressVideoPreview
        ? publicCommunityPostWhatsappShareHref(slug, id)
        : undefined;

  const shareOpenGraphUrl = openGraphUrlOverride ?? whatsappSharePath;

  if (!seo) {
    return resolveSeoMetadata(pageKey, fallback, {
      canonical: canonicalOverride,
      openGraphUrl: shareOpenGraphUrl,
      ...(suppressVideoPreview ? { type: "article" as const, video: null } : {}),
    });
  }

  return resolveSeoMetadata(pageKey, fallback, {
    canonical: canonicalOverride ?? seo.canonical_url,
    description: seo.description,
    image: seo.og_image_url,
    imageHeight: seo.og_image_height,
    imageWidth: seo.og_image_width,
    ogDescription: seo.og_description,
    ogTitle: seo.og_title,
    openGraphUrl: shareOpenGraphUrl,
    title: seo.title,
    type: !suppressVideoPreview && seo.media_type === "video" ? "video.other" : "article",
    video: suppressVideoPreview ? null : seo.og_video_url,
    videoHeight: !suppressVideoPreview && seo.media_type === "video" ? 1920 : undefined,
    videoWidth: !suppressVideoPreview && seo.media_type === "video" ? 1080 : undefined,
  });
};
