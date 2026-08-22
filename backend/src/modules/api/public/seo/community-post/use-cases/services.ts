import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type { PublicCommunityPostSeoDTO } from "../DTOs/IPublicCommunityPostSeoDTO";

type PostSeoParams = {
  id: string;
  slug: string;
};

type ReplySeoParams = PostSeoParams & {
  replyId: string;
};

type MediaCandidate = {
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
};

type SeoAuthor = {
  deleted: boolean;
  name: string;
  role: string;
  psychologist_profile: {
    professional_first_name: string | null;
    professional_last_name: string | null;
  } | null;
};

const TEXT_MAX_LENGTH = 180;
const TITLE_MAX_LENGTH = 78;

const normalizeSpaces = (value?: string | null) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const compactDescription = (value?: string | null) =>
  truncate(normalizeSpaces(value), TEXT_MAX_LENGTH);

const compactTitle = (value?: string | null) => truncate(normalizeSpaces(value), TITLE_MAX_LENGTH);

const professionalVideoTitle = (author?: SeoAuthor | null) => {
  if (author?.role !== "psicologo" || author.deleted) return null;

  const displayName = buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
  const name = normalizeSpaces(displayName || author.name);

  return name ? `${name} na Lectum` : null;
};

const resolveVideoOpenGraphTitle = (
  mediaType: string | null,
  author: SeoAuthor | null | undefined,
  fallbackTitle: string,
) => (mediaType === "video" ? (professionalVideoTitle(author) ?? fallbackTitle) : fallbackTitle);

const resolveMediaPreview = (media?: MediaCandidate | null) => {
  if (!media?.media_url) {
    return {
      mediaType: null,
      ogImageHeight: null,
      ogImageUrl: null,
      ogImageWidth: null,
      ogVideoUrl: null,
    };
  }

  if (media.media_type === "image") {
    return {
      mediaType: "image",
      ogImageHeight: null,
      ogImageUrl: media.media_url,
      ogImageWidth: null,
      ogVideoUrl: null,
    };
  }

  if (media.media_type === "video") {
    const hasThumbnail = Boolean(media.thumbnail_url);

    return {
      mediaType: "video",
      ogImageUrl: media.thumbnail_url || null,
      ogImageHeight: hasThumbnail ? 1920 : null,
      ogImageWidth: hasThumbnail ? 1080 : null,
      ogVideoUrl: media.media_url,
    };
  }

  return {
    mediaType: null,
    ogImageHeight: null,
    ogImageUrl: null,
    ogImageWidth: null,
    ogVideoUrl: null,
  };
};

const firstPostMedia = (post: {
  media_items: MediaCandidate[];
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
}): MediaCandidate | null => {
  const mediaItem = post.media_items.find((item) => item.media_url && item.media_type);
  if (mediaItem) return mediaItem;

  if (post.media_url && post.media_type) {
    return {
      media_type: post.media_type,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
    };
  }

  return null;
};

const notFound = (): Resolve => ({
  status: 404,
  ...error("not_found", { gender: "a" }),
});

export const showPost = async ({ id, slug }: PostSeoParams): Promise<Resolve> => {
  const post = await prisma.community_post.findFirst({
    where: {
      deleted: false,
      id,
      status: "publicado",
      community: {
        active: true,
        deleted: false,
        slug,
      },
    },
    select: {
      content: true,
      createdAt: true,
      edited_at: true,
      media_type: true,
      media_url: true,
      thumbnail_url: true,
      title: true,
      updatedAt: true,
      author: {
        select: {
          deleted: true,
          name: true,
          role: true,
          psychologist_profile: {
            select: {
              professional_first_name: true,
              professional_last_name: true,
            },
          },
        },
      },
      community: {
        select: {
          name: true,
          slug: true,
        },
      },
      media_items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          media_type: true,
          media_url: true,
          thumbnail_url: true,
        },
        where: {
          deleted: false,
        },
      },
    },
  });

  if (!post) return notFound();

  const title = normalizeSpaces(post.title) || "Pergunta da comunidade";
  const description = compactDescription(post.content) || "Discussão pública na comunidade Lectum.";
  const mediaPreview = resolveMediaPreview(firstPostMedia(post));
  const ogTitle = resolveVideoOpenGraphTitle(mediaPreview.mediaType, post.author, title);
  const data: PublicCommunityPostSeoDTO = {
    canonical_url: `/comunidades/${post.community.slug}/publicacao/${id}`,
    community: post.community,
    description,
    media_type: mediaPreview.mediaType,
    og_description: description,
    og_image_height: mediaPreview.ogImageHeight,
    og_image_url: mediaPreview.ogImageUrl,
    og_image_width: mediaPreview.ogImageWidth,
    og_title: ogTitle,
    og_video_url: mediaPreview.ogVideoUrl,
    published_at: post.createdAt,
    source: "community_post",
    title: `${title} | Lectum`,
    updated_at: post.edited_at ?? post.updatedAt ?? null,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data,
  };
};

export const showReply = async ({ id, replyId, slug }: ReplySeoParams): Promise<Resolve> => {
  const reply = await prisma.post_reply.findFirst({
    where: {
      deleted: false,
      id: replyId,
      post_id: id,
      post: {
        deleted: false,
        id,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
          slug,
        },
      },
    },
    select: {
      content: true,
      createdAt: true,
      edited_at: true,
      media_type: true,
      media_url: true,
      thumbnail_url: true,
      title: true,
      updatedAt: true,
      author: {
        select: {
          deleted: true,
          name: true,
          role: true,
          psychologist_profile: {
            select: {
              professional_first_name: true,
              professional_last_name: true,
            },
          },
        },
      },
      post: {
        select: {
          content: true,
          media_type: true,
          media_url: true,
          thumbnail_url: true,
          title: true,
          author: {
            select: {
              deleted: true,
              name: true,
              role: true,
              psychologist_profile: {
                select: {
                  professional_first_name: true,
                  professional_last_name: true,
                },
              },
            },
          },
          community: {
            select: {
              name: true,
              slug: true,
            },
          },
          media_items: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: {
              media_type: true,
              media_url: true,
              thumbnail_url: true,
            },
            where: {
              deleted: false,
            },
          },
        },
      },
    },
  });

  if (!reply) return notFound();

  const replyTitle = compactTitle(reply.title || reply.content);
  const postTitle = compactTitle(reply.post.title) || "Post da comunidade";
  const title = replyTitle ? `Resposta: ${replyTitle}` : `Resposta em ${postTitle}`;
  const description =
    compactDescription(reply.content || reply.post.content) ||
    "Discussão pública de uma resposta na comunidade Lectum.";
  const replyMedia = resolveMediaPreview({
    media_type: reply.media_type,
    media_url: reply.media_url,
    thumbnail_url: reply.thumbnail_url,
  });
  const postMedia = resolveMediaPreview(firstPostMedia(reply.post));
  const mediaType = replyMedia.mediaType ?? postMedia.mediaType;
  const mediaAuthor =
    replyMedia.mediaType === "video"
      ? reply.author
      : postMedia.mediaType === "video"
        ? reply.post.author
        : null;
  const ogTitle = resolveVideoOpenGraphTitle(mediaType, mediaAuthor, title);
  const data: PublicCommunityPostSeoDTO = {
    canonical_url: `/comunidades/${reply.post.community.slug}/publicacao/${id}/resposta/${replyId}`,
    community: reply.post.community,
    description,
    media_type: mediaType,
    og_description: description,
    og_image_height: replyMedia.ogImageHeight ?? postMedia.ogImageHeight,
    og_image_url: replyMedia.ogImageUrl ?? postMedia.ogImageUrl,
    og_image_width: replyMedia.ogImageWidth ?? postMedia.ogImageWidth,
    og_title: ogTitle,
    og_video_url: replyMedia.ogVideoUrl ?? postMedia.ogVideoUrl,
    published_at: reply.createdAt,
    source: "post_reply",
    title: `${title} | Lectum`,
    updated_at: reply.edited_at ?? reply.updatedAt ?? null,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data,
  };
};
