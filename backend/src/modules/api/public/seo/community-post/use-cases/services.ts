import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
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

const resolveMediaPreview = (media?: MediaCandidate | null) => {
  if (!media?.media_url) {
    return {
      mediaType: null,
      ogImageUrl: null,
      ogVideoUrl: null,
    };
  }

  if (media.media_type === "image") {
    return {
      mediaType: "image",
      ogImageUrl: media.media_url,
      ogVideoUrl: null,
    };
  }

  if (media.media_type === "video") {
    return {
      mediaType: "video",
      ogImageUrl: media.thumbnail_url || null,
      ogVideoUrl: media.media_url,
    };
  }

  return {
    mediaType: null,
    ogImageUrl: null,
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

  const title = compactTitle(post.title) || "Pergunta da comunidade";
  const description = compactDescription(post.content) || "Discussão pública na comunidade Lectum.";
  const mediaPreview = resolveMediaPreview(firstPostMedia(post));
  const data: PublicCommunityPostSeoDTO = {
    canonical_url: `/community/${post.community.slug}/post/${id}`,
    community: post.community,
    description,
    media_type: mediaPreview.mediaType,
    og_description: description,
    og_image_url: mediaPreview.ogImageUrl,
    og_title: `${title} | Lectum`,
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
      post: {
        select: {
          content: true,
          media_type: true,
          media_url: true,
          thumbnail_url: true,
          title: true,
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
  const data: PublicCommunityPostSeoDTO = {
    canonical_url: `/community/${reply.post.community.slug}/post/${id}/thread/${replyId}`,
    community: reply.post.community,
    description,
    media_type: replyMedia.mediaType ?? postMedia.mediaType,
    og_description: description,
    og_image_url: replyMedia.ogImageUrl ?? postMedia.ogImageUrl,
    og_title: `${title} | Lectum`,
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
