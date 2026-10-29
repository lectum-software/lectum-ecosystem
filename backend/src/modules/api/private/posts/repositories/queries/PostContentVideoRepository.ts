import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type {
  IPostContentVideosDTO,
  PostContentVideo,
  PostContentVideosResponse,
} from "../../DTOs/IPostContentVideoDTO";
import type { IPostContentVideoRepository } from "../interfaces/IPostContentVideoRepository";
import {
  ContentVideoCursorError,
  type ContentVideoCursorStore,
  contentVideoCursors,
} from "../support/content-video-cursor";
import {
  focusContentVideo,
  normalizeContentVideosPagination,
  orderContentVideoReplies,
} from "../support/content-video-order";
import {
  normalizeVoteValue,
  postSelect,
  replyBaseSelect,
  toAuthorResponse,
  toCommunityResponse,
  toPostMediaItemsResponse,
} from "../support/post-response";

type Client = Pick<
  Prisma.TransactionClient,
  | "community_post"
  | "post_reply"
  | "user"
  | "video_asset"
  | "post_vote"
  | "post_save"
  | "post_reply_save"
>;

type Candidate = {
  id: string;
  reply_id: string | null;
  media_item_id: string | null;
  media_url: string;
  author_id: string;
};

const MAX_DISCUSSION_INDEX_NODES = 10_000;

export class PostContentVideoRepository implements IPostContentVideoRepository {
  constructor(
    private readonly client: Client = prisma,
    private readonly rankingSignals = getCommunityMentorRankingSignals,
    private readonly cursors: ContentVideoCursorStore = contentVideoCursors,
  ) {}

  async list(data: IPostContentVideosDTO): Promise<PostContentVideosResponse | null> {
    const pagination = normalizeContentVideosPagination(data.q);
    if (pagination.page > 1 && !data.q.cursor) throw new ContentVideoCursorError("invalid");
    const continuation = data.q.cursor
      ? this.cursors.resolve(data.q.cursor, {
          postId: data.p.id,
          focusReplyId: data.q.focusReplyId,
          limit: pagination.limit,
          page: data.q.page,
        })
      : null;
    const post = await this.client.community_post.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        status: "publicado",
        community: { active: true, deleted: false },
      },
      select: postSelect,
    });
    if (!post) return null;

    // Only the ordering/eligibility index spans the discussion; text and authors are page-bound.
    const nodes = await this.client.post_reply.findMany({
      where: { post_id: post.id, deleted: false },
      take: MAX_DISCUSSION_INDEX_NODES + 1,
      select: {
        id: true,
        parent_reply_id: true,
        author_id: true,
        upvotes_count: true,
        createdAt: true,
        media_type: true,
        media_url: true,
      },
    });
    // Never truncate the tree: that would silently omit videos or hide their ancestors.
    if (nodes.length > MAX_DISCUSSION_INDEX_NODES) throw new ContentVideoCursorError("capacity");
    const authors = await this.client.user.findMany({
      where: {
        id: { in: [...new Set([post.author.id, ...nodes.map((node) => node.author_id)])] },
        role: "psicologo",
        active: true,
        deleted: false,
        psychologist_profile: { is: { deleted: false, ...verifiedProfessionalProfileWhere() } },
      },
      select: { id: true, psychologist_profile: { select: { video_url: true } } },
    });
    const authorIds = new Set(authors.map((author) => author.id));
    const presentationUrls = new Set(
      authors.map((author) => author.psychologist_profile?.video_url).filter(Boolean),
    );
    const rankings = continuation
      ? new Map()
      : await this.rankingSignals(post.community.id, [...authorIds]);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const candidates: Candidate[] = [];
    const postMedia = toPostMediaItemsResponse(post);
    if (authorIds.has(post.author.id)) {
      for (const media of postMedia) {
        if (media.media_type !== "video") continue;
        candidates.push({
          id: media.id ?? post.id,
          reply_id: null,
          media_item_id: media.id,
          media_url: media.media_url,
          author_id: post.author.id,
        });
      }
    }
    for (const id of orderContentVideoReplies(nodes, authorIds, rankings)) {
      const node = byId.get(id)!;
      if (node.media_type !== "video" || !node.media_url || !authorIds.has(node.author_id))
        continue;
      candidates.push({
        id,
        reply_id: id,
        media_item_id: null,
        media_url: node.media_url,
        author_id: node.author_id,
      });
    }

    // Stream assets are checked in one query, including purpose, owner and context.
    const assetIds = [
      ...new Set(
        candidates
          .map((item) => videoAssetIdFromReference(item.media_url))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const assets = assetIds.length
      ? await this.client.video_asset.findMany({
          where: {
            id: { in: assetIds },
            deleted: false,
            status: "ready",
            provider: "cloudflare_stream",
          },
          select: { id: true, purpose: true, owner_id: true, context_id: true },
        })
      : [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const eligible = candidates.filter((item) => {
      if (presentationUrls.has(item.media_url)) return false;
      const assetId = videoAssetIdFromReference(item.media_url);
      if (!assetId) return true;
      const asset = assetsById.get(assetId);
      return Boolean(
        asset &&
          asset.owner_id === item.author_id &&
          asset.purpose === (item.reply_id ? "community_reply" : "community_post") &&
          asset.context_id === (item.reply_id ? post.id : post.community.slug),
      );
    });
    const currentById = new Map(eligible.map((item) => [item.id, item]));
    const ordered = continuation ? null : focusContentVideo(eligible, data.q.focusReplyId);
    const ids = continuation?.snapshot.ids ?? ordered!.map((item) => item.id);
    const page = continuation?.page ?? pagination.page;
    const skip = continuation?.offset ?? pagination.skip;
    const { limit } = pagination;
    // Slice the original slots BEFORE removing newly ineligible items. Filtering first would shift pages.
    const selected = ids.slice(skip, skip + limit).flatMap((id) => {
      const item = currentById.get(id);
      return item ? [item] : [];
    });
    let nextCursor: string | null = null;
    if (skip + limit < ids.length) {
      const key =
        continuation?.key ??
        this.cursors.create({
          postId: post.id,
          focusReplyId: data.q.focusReplyId || null,
          limit,
          ids,
        }).key;
      nextCursor = `${key}.${skip + limit}`;
    }
    const replyIds = selected.flatMap((item) => (item.reply_id ? [item.reply_id] : []));
    const includePost = selected.some((item) => !item.reply_id);
    const userId = data.auth?.id;
    const replies = replyIds.length
      ? await this.client.post_reply.findMany({
          where: { post_id: post.id, deleted: false, id: { in: replyIds } },
          select: {
            ...replyBaseSelect,
            parent_reply: { select: { id: true, title: true, content: true, deleted: true } },
          },
        })
      : [];
    const votes =
      userId && selected.length
        ? await this.client.post_vote.findMany({
            where: {
              user_id: userId,
              deleted: false,
              OR: [
                ...(includePost ? [{ post_id: post.id, reply_id: null }] : []),
                ...(replyIds.length ? [{ reply_id: { in: replyIds } }] : []),
              ],
            },
            select: { post_id: true, reply_id: true, value: true },
          })
        : [];
    const postSave =
      userId && includePost
        ? await this.client.post_save.findFirst({
            where: { post_id: post.id, user_id: userId, deleted: false },
            select: { id: true },
          })
        : null;
    const replySaves =
      userId && replyIds.length
        ? await this.client.post_reply_save.findMany({
            where: { reply_id: { in: replyIds }, user_id: userId, deleted: false },
            select: { reply_id: true },
          })
        : [];
    const replyMap = new Map(replies.map((reply) => [reply.id, reply]));
    const voteMap = new Map(
      votes.map((vote) => [vote.reply_id ?? vote.post_id, normalizeVoteValue(vote.value)]),
    );
    const savedIds = new Set(replySaves.map((save) => save.reply_id));
    const community = toCommunityResponse(post.community);
    const items: PostContentVideo[] = [];
    for (const candidate of selected) {
      const reply = candidate.reply_id ? replyMap.get(candidate.reply_id) : null;
      if (candidate.reply_id && (!reply || reply.parent_reply?.deleted)) continue;
      const source = reply ?? post;
      items.push({
        id: candidate.id,
        post_id: post.id,
        reply_id: candidate.reply_id,
        media_item_id: candidate.media_item_id,
        media_url: candidate.media_url,
        thumbnail_url: reply
          ? reply.thumbnail_url
          : (postMedia.find((media) => media.id === candidate.media_item_id)?.thumbnail_url ??
            null),
        title: source.title,
        content: source.content,
        author: toAuthorResponse(
          source.author,
          source.upvotes_count,
          false,
          undefined,
          reply ? "community_reply" : "community_post",
        ),
        upvotes_count: source.upvotes_count,
        current_user_vote: voteMap.get(candidate.reply_id ?? post.id) ?? null,
        saved: reply ? savedIds.has(reply.id) : Boolean(postSave),
        replies_count: reply ? reply._count.replies : post.replies_count,
        responding_to: reply
          ? {
              id: reply.parent_reply?.id ?? post.id,
              title: reply.parent_reply ? reply.parent_reply.title : post.title,
              content: reply.parent_reply ? reply.parent_reply.content : post.content,
            }
          : null,
        community,
      });
    }
    return {
      data: items,
      page,
      pages: Math.ceil(ids.length / limit),
      count: ids.length,
      next_cursor: nextCursor,
    };
  }
}
