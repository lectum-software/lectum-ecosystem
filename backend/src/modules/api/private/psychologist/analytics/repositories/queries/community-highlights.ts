import prisma from "@/infra/database/prisma";
import type { PsychologistAnalyticsCommunityHighlight } from "../../DTOs/IAnalyticsDTO";
import {
  type HighlightAction,
  highlightExcerpt,
  rankCommunityHighlights,
} from "../support/community-highlights";

export async function buildCommunityHighlights(userId: string, actions: HighlightAction[]) {
  const posts = rankCommunityHighlights(actions, "posts");
  const replies = rankCommunityHighlights(actions, "replies");
  const [postItems, replyItems] = await Promise.all([
    posts.length
      ? prisma.community_post.findMany({
          where: {
            id: { in: posts.map((item) => item.id) },
            author_id: userId,
            deleted: false,
            status: "publicado",
            community: { active: true, deleted: false },
          },
          select: {
            id: true,
            title: true,
            content: true,
            media_type: true,
            media_url: true,
            thumbnail_url: true,
            community: { select: { slug: true } },
            media_items: {
              where: { deleted: false },
              orderBy: { position: "asc" },
              take: 1,
              select: { media_type: true, media_url: true, thumbnail_url: true },
            },
          },
        })
      : [],
    replies.length
      ? prisma.post_reply.findMany({
          where: {
            id: { in: replies.map((item) => item.id) },
            author_id: userId,
            deleted: false,
            post: {
              deleted: false,
              status: "publicado",
              community: { active: true, deleted: false },
            },
          },
          select: {
            id: true,
            title: true,
            content: true,
            media_type: true,
            media_url: true,
            thumbnail_url: true,
            post: { select: { id: true, title: true, community: { select: { slug: true } } } },
          },
        })
      : [],
  ]);
  const thumbnail = (item: {
    thumbnail_url: string | null;
    media_type: string | null;
    media_url: string | null;
  }) => item.thumbnail_url ?? (item.media_type?.startsWith("image") ? item.media_url : null);
  return {
    posts: posts.flatMap((rank): PsychologistAnalyticsCommunityHighlight[] => {
      const item = postItems.find((post) => post.id === rank.id);
      if (!item) return [];
      const media = item.media_items[0] ?? item;
      return [
        {
          ...rank,
          post_id: item.id,
          community_slug: item.community.slug,
          title: item.title,
          excerpt: highlightExcerpt(item.content),
          context: null,
          media_url: media.media_url,
          thumbnail_url: thumbnail(media),
          media_type: media.media_type,
        },
      ];
    }),
    replies: replies.flatMap((rank): PsychologistAnalyticsCommunityHighlight[] => {
      const item = replyItems.find((reply) => reply.id === rank.id);
      if (!item) return [];
      return [
        {
          ...rank,
          post_id: item.post.id,
          community_slug: item.post.community.slug,
          title: item.title ?? "",
          excerpt: highlightExcerpt(item.content),
          context: item.post.title,
          media_url: item.media_url,
          thumbnail_url: thumbnail(item),
          media_type: item.media_type,
        },
      ];
    }),
  };
}
