import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isVideoAssetPlaybackReference } from "@/infra/video-stream";
import { resolveReadyOwnedVideoAssetReference } from "@/modules/video-assets/service";
import { ensureCommunityMembership } from "@/utils/community-membership";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  IPostCreateReplyDTO,
  IPostRepliesDTO,
  IPostReplyThreadDTO,
  PostMutationResult,
  PostRepliesResponse,
  PostReplyDTO,
} from "../../DTOs/IPostDTO";
import {
  type CurrentVote,
  INLINE_REPLY_DESCENDANT_DEPTH,
  normalizePagination,
  normalizeVoteValue,
  replyBaseSelect,
  toReplyResponse,
} from "../support/post-response";
import {
  buildReplyThread,
  buildReplyTrees,
  collectReplyIds,
  findPublishedPost,
  findRootReplyId,
  isPublicReplyMediaUrl,
  loadFocusedReplyPath,
  loadReplyDescendants,
  mergeRepliesById,
  normalizeReplyMediaType,
  sortRepliesForDisplay,
} from "../support/reply-tree";

import type { PostCoreRepository } from "./PostCoreRepository";
import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostReplyRepository extends PostRepositoryContext {
  constructor(private readonly coreRepository: PostCoreRepository) {
    super();
  }
  async replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const pagination = normalizePagination(data.q);
    const where: Prisma.post_replyWhereInput = {
      post_id: post.id,
      parent_reply_id: null,
      deleted: false,
    };

    const [topLevelItems, count] = await Promise.all([
      prisma.post_reply.findMany({
        where,
        orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: replyBaseSelect,
      }),
      prisma.post_reply.count({ where }),
    ]);
    const sortedItems = await sortRepliesForDisplay(post.community_id, topLevelItems);
    const focusRootReplyId = await findRootReplyId(post.id, data.q.focusReplyId);
    const focusRootIndex = focusRootReplyId
      ? sortedItems.findIndex((reply) => reply.id === focusRootReplyId)
      : -1;
    const effectivePage =
      focusRootIndex >= 0 ? Math.floor(focusRootIndex / pagination.limit) + 1 : pagination.page;
    const effectiveSkip =
      focusRootIndex >= 0 ? (effectivePage - 1) * pagination.limit : pagination.skip;
    const paginatedTopLevelItems = sortedItems.slice(
      effectiveSkip,
      effectiveSkip + pagination.limit,
    );
    const baseDescendants = await loadReplyDescendants(
      post.id,
      paginatedTopLevelItems.map((reply) => reply.id),
      INLINE_REPLY_DESCENDANT_DEPTH,
    );
    const focusedReplyPath = await loadFocusedReplyPath(
      post.id,
      focusRootReplyId,
      data.q.focusReplyId,
    );
    const descendants = mergeRepliesById(baseDescendants, focusedReplyPath);
    const treeRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      [...paginatedTopLevelItems, ...descendants]
        .filter((reply) => reply.author.role === "psicologo")
        .map((reply) => reply.author.id),
    );
    const items = buildReplyTrees(paginatedTopLevelItems, descendants, treeRankingSignals);

    const replyIds = collectReplyIds(items);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return {
      data: items.map((item) =>
        toReplyResponse(item, voteMap, savedReplyIds, {
          postAnonymous: post.author.role !== "psicologo" && post.anonymous,
          postAuthorId: post.author_id,
        }),
      ),
      page: effectivePage,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async replyThread(data: IPostReplyThreadDTO): Promise<PostReplyDTO | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: post.id,
        deleted: false,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: replyBaseSelect,
    });
    const threadRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      replies.filter((reply) => reply.author.role === "psicologo").map((reply) => reply.author.id),
    );
    const thread = buildReplyThread(data.p.replyId, replies, threadRankingSignals);
    if (!thread) return null;

    const replyIds = collectReplyIds([thread]);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return toReplyResponse(thread, voteMap, savedReplyIds, {
      postAnonymous: post.author.role !== "psicologo" && post.anonymous,
      postAuthorId: post.author_id,
    });
  }

  async createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const content = String(data.b.content ?? "").trim();
    const mediaUrl = data.b.mediaUrl?.trim() || null;
    const mediaType = normalizeReplyMediaType(data.b.mediaType);
    const thumbnailUrl = data.b.thumbnailUrl?.trim() || null;
    const hasMedia = Boolean(mediaUrl || data.b.mediaType);
    let streamVideoReference: string | null = null;

    if (!content && !hasMedia) {
      return { kind: "invalid_content" };
    }

    if (hasMedia) {
      streamVideoReference =
        mediaUrl && mediaType === "video" && isVideoAssetPlaybackReference(mediaUrl)
          ? await resolveReadyOwnedVideoAssetReference({
              contextId: post.id,
              ownerId: data.auth.id!,
              purpose: "community_reply",
              reference: mediaUrl,
            })
          : null;

      if (!mediaUrl || !mediaType || (!isPublicReplyMediaUrl(mediaUrl) && !streamVideoReference)) {
        return { kind: "invalid_media" };
      }

      if (thumbnailUrl && !isPublicReplyMediaUrl(thumbnailUrl)) {
        return { kind: "invalid_media" };
      }

      const canAttachMedia = await this.coreRepository.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) {
        return { kind: "media_not_allowed" };
      }
    }

    if (data.b.parentReplyId) {
      const parent = await prisma.post_reply.findFirst({
        where: {
          id: data.b.parentReplyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!parent) return { kind: "invalid_parent" };
    }

    const reply = await withSerializableTransaction(async (transaction) => {
      await ensureCommunityMembership({
        client: transaction,
        communityId: post.community_id,
        userId: data.auth.id!,
      });

      const created = await transaction.post_reply.create({
        data: {
          post_id: post.id,
          author_id: data.auth.id!,
          parent_reply_id: data.b.parentReplyId || null,
          content,
          media_type: mediaType,
          media_url: streamVideoReference || mediaUrl,
          thumbnail_url: mediaType === "video" && !streamVideoReference ? thumbnailUrl : null,
        },
        select: replyBaseSelect,
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: {
            increment: 1,
          },
        },
      });

      return created;
    });

    return {
      kind: "ok",
      data: toReplyResponse(reply, new Map(), undefined, {
        postAnonymous: post.author.role !== "psicologo" && post.anonymous,
        postAuthorId: post.author_id,
      }),
    };
  }
}
