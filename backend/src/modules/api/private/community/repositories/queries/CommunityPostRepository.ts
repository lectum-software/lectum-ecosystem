import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { ensureCommunityMembership } from "@/utils/community-membership";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  CommunityPostDTO,
  CommunityPostsResponse,
  ICommunityCreatePostDTO,
  ICommunityPostsDTO,
} from "../../DTOs/ICommunityDTO";
import type { CommunityPostCreationOptions } from "../interfaces/ICommunityRepository";
import {
  communitySelect,
  normalizeCommunityPostSort,
  normalizeCommunityPostSortPeriod,
  normalizePagination,
  postSelect,
  sortCommunityPostResults,
} from "../support/community-feed";
import {
  getCommunityPostSortMetrics,
  getFollowedCommunityIds,
  getPostCurrentVotes,
  getSavedPostIds,
  getSavedReplyIds,
  selectHighlightedProfessionalReplies,
  toCommunityResponse,
} from "../support/community-ranking";
import { postSearchWhere, toPostResponse } from "../support/community-response";

import { CommunityRepositoryContext } from "./CommunityRepositoryContext";

export class CommunityPostRepository extends CommunityRepositoryContext {
  async posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const sort = normalizeCommunityPostSort(data.q.sort);
    const period = normalizeCommunityPostSortPeriod(data.q.period);
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        active: true,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const where: Prisma.community_postWhereInput = {
      community_id: community.id,
      deleted: false,
      status: "publicado",
      OR: postSearchWhere(search),
    };

    const [allItems, count] = await Promise.all([
      prisma.community_post.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: postSelect,
      }),
      prisma.community_post.count({ where }),
    ]);
    const allPostIds = allItems.map((item) => item.id);
    const sortMetricsByPostId = await getCommunityPostSortMetrics(allPostIds);
    const items = sortCommunityPostResults(allItems, sort, period, sortMetricsByPostId).slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    );
    const highlightedRepliesByPostId = await selectHighlightedProfessionalReplies(items);
    const postIds = items.map((item) => item.id);
    const replyIds = [...highlightedRepliesByPostId.values()].map((reply) => reply.id);
    const [
      currentVotes,
      savedPostIds,
      savedReplyIds,
      followedCommunityIds,
      mutedPostIds,
      postsWithPsychologistReplies,
    ] = await Promise.all([
      getPostCurrentVotes(data.auth?.id ?? undefined, postIds),
      getSavedPostIds(data.auth?.id ?? undefined, postIds),
      getSavedReplyIds(data.auth?.id ?? undefined, replyIds),
      getFollowedCommunityIds(data.auth?.id ?? undefined, [community.id]),
      getMutedPostIds(data.auth?.id ?? undefined, postIds),
      getPostIdsWithPsychologistReplies(postIds),
    ]);

    return {
      community: {
        ...toCommunityResponse(community),
        following: followedCommunityIds.has(community.id),
      },
      data: items.map((item) =>
        toPostResponse(
          item,
          currentVotes.get(item.id) ?? null,
          savedPostIds.has(item.id),
          followedCommunityIds,
          savedReplyIds,
          sortMetricsByPostId.get(item.id),
          highlightedRepliesByPostId.get(item.id) ?? null,
          mutedPostIds.has(item.id),
          postsWithPsychologistReplies.has(item.id),
        ),
      ),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async createPost(
    data: ICommunityCreatePostDTO,
    options: CommunityPostCreationOptions = {},
  ): Promise<CommunityPostDTO | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        active: true,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!community) return null;

    const isPsychologist = data.auth.role === "psicologo";
    const mediaItems = data.b.mediaItems ?? [];
    const firstMediaItem = mediaItems[0];
    const status = options.status ?? "publicado";
    const post = await withSerializableTransaction(async (transaction) => {
      await ensureCommunityMembership({
        client: transaction,
        communityId: community.id,
        userId: data.auth.id!,
      });

      return transaction.community_post.create({
        data: {
          community_id: community.id,
          author_id: data.auth.id!,
          title: data.b.title.trim(),
          content: data.b.content.trim(),
          media_url: firstMediaItem?.mediaUrl.trim() || data.b.mediaUrl?.trim() || null,
          media_type: firstMediaItem ? "image" : data.b.mediaType || null,
          thumbnail_url: firstMediaItem ? null : data.b.thumbnailUrl?.trim() || null,
          media_items:
            mediaItems.length > 0
              ? {
                  create: mediaItems.map((mediaItem, index) => ({
                    media_url: mediaItem.mediaUrl.trim(),
                    media_type: "image",
                    position: typeof mediaItem.position === "number" ? mediaItem.position : index,
                  })),
                }
              : undefined,
          anonymous: isPsychologist ? false : data.b.anonymous === true,
          status,
        },
        select: postSelect,
      });
    });

    return toPostResponse(post);
  }
}
