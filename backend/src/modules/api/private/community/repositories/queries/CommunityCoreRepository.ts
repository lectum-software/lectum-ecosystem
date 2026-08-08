import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import type {
  CommunityDetailResponse,
  CommunityFeedResponse,
  CommunityIndexResponse,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityShowDTO,
} from "../../DTOs/ICommunityDTO";
import {
  communityRuleSelect,
  communitySelect,
  normalizePagination,
  postSelect,
  sortGeneralFeedPostResults,
} from "../support/community-feed";
import {
  getCommunityPostSortMetrics,
  getFollowedCommunityIds,
  getPostCurrentVotes,
  getSavedPostIds,
  getSavedReplyIds,
  normalizeScope,
  selectHighlightedProfessionalReplies,
  toCommunityDetailResponse,
  toCommunityResponse,
} from "../support/community-ranking";
import { postSearchWhere, toPostResponse } from "../support/community-response";

import { CommunityRepositoryContext } from "./CommunityRepositoryContext";

export class CommunityCoreRepository extends CommunityRepositoryContext {
  async existsBySlug(slug: string): Promise<boolean> {
    const community = await this.repository.findFirst({
      where: {
        slug,
        active: true,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    return Boolean(community);
  }

  async index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const category = data.q.category?.trim();
    const scope = normalizeScope(data.q.scope);
    const userId = data.auth?.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where: Prisma.communityWhereInput = {
      active: true,
      deleted: false,
      members:
        scope === "following"
          ? {
              some: {
                user_id: userId || "__missing_user__",
                deleted: false,
              },
            }
          : undefined,
      category: category
        ? {
            equals: category,
            mode: "insensitive",
          }
        : undefined,
      OR: search
        ? [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              category: {
                contains: search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };
    const followedMembershipWhere: Prisma.community_memberWhereInput = {
      user_id: userId || "__missing_user__",
      deleted: false,
      community: {
        active: true,
        deleted: false,
      },
    };
    const followedPostsTodayWhere: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      createdAt: {
        gte: todayStart,
      },
      community: {
        active: true,
        deleted: false,
        members: {
          some: {
            user_id: userId || "__missing_user__",
            deleted: false,
          },
        },
      },
    };

    const [items, count, categories, followingCount, newPostsTodayCount] = await Promise.all([
      this.repository.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ members_count: "desc" }, { name: "asc" }, { createdAt: "desc" }],
        select: communitySelect,
      }),
      this.repository.count({ where }),
      this.repository.findMany({
        where: {
          active: true,
          deleted: false,
          category: {
            not: null,
          },
        },
        distinct: ["category"],
        orderBy: {
          category: "asc",
        },
        select: {
          category: true,
        },
      }),
      userId
        ? prisma.community_member.count({ where: followedMembershipWhere })
        : Promise.resolve(0),
      userId ? prisma.community_post.count({ where: followedPostsTodayWhere }) : Promise.resolve(0),
    ]);
    const itemIds = items.map((item) => item.id);
    const [memberships, postsCount, newPostsCount] =
      userId && itemIds.length > 0
        ? await Promise.all([
            prisma.community_member.findMany({
              where: {
                user_id: userId,
                community_id: {
                  in: itemIds,
                },
                deleted: false,
              },
              select: {
                community_id: true,
                createdAt: true,
              },
            }),
            prisma.community_post.groupBy({
              by: ["community_id"],
              where: {
                community_id: {
                  in: itemIds,
                },
                deleted: false,
                status: "publicado",
              },
              _count: {
                _all: true,
              },
            }),
            prisma.community_post.groupBy({
              by: ["community_id"],
              where: {
                community_id: {
                  in: itemIds,
                },
                deleted: false,
                status: "publicado",
                createdAt: {
                  gte: todayStart,
                },
              },
              _count: {
                _all: true,
              },
            }),
          ])
        : [[], [], []];
    const membershipByCommunityId = new Map(
      memberships.map((item) => [item.community_id, item.createdAt]),
    );
    const postsCountByCommunityId = new Map(
      postsCount.map((item) => [item.community_id, item._count._all]),
    );
    const newPostsCountByCommunityId = new Map(
      newPostsCount.map((item) => [item.community_id, item._count._all]),
    );

    return {
      data: items.map((item) => {
        const membershipCreatedAt = membershipByCommunityId.get(item.id) ?? null;

        return {
          ...toCommunityResponse(item),
          following: Boolean(membershipCreatedAt),
          membership_created_at: membershipCreatedAt,
          posts_count: postsCountByCommunityId.get(item.id) ?? 0,
          new_posts_count: newPostsCountByCommunityId.get(item.id) ?? 0,
        };
      }),
      categories: categories
        .map((item) => item.category?.trim())
        .filter((item): item is string => Boolean(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      scope,
      following_count: followingCount,
      new_posts_today_count: newPostsTodayCount,
    };
  }

  async show(data: ICommunityShowDTO): Promise<CommunityDetailResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        active: true,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const userId = data.auth?.id;
    const [postsCount, membership, rules] = await Promise.all([
      prisma.community_post.count({
        where: {
          community_id: community.id,
          deleted: false,
          status: "publicado",
        },
      }),
      userId
        ? prisma.community_member.findUnique({
            where: {
              community_id_user_id: {
                community_id: community.id,
                user_id: userId,
              },
            },
            select: {
              createdAt: true,
              deleted: true,
            },
          })
        : Promise.resolve(null),
      prisma.community_rule.findMany({
        where: {
          active: true,
          community_id: community.id,
          deleted: false,
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: communityRuleSelect,
      }),
    ]);

    return toCommunityDetailResponse(
      community,
      postsCount,
      membership && !membership.deleted ? membership.createdAt : null,
      rules,
    );
  }

  async feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const communitySlug = data.q.community?.trim() || null;
    const scope = normalizeScope(data.q.scope);
    const followerUserId = scope === "following" ? data.auth?.id : undefined;

    if (scope === "following" && !followerUserId) {
      return {
        data: [],
        page: pagination.page,
        pages: 0,
        count: 0,
        scope,
        community_slug: communitySlug,
        following_count: 0,
      };
    }

    const communityMemberFilter: Prisma.communityWhereInput["members"] =
      scope === "following" && followerUserId
        ? {
            some: {
              user_id: followerUserId,
              deleted: false,
            },
          }
        : undefined;

    const where: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      community: {
        active: true,
        deleted: false,
        slug: communitySlug || undefined,
        members: communityMemberFilter,
      },
      OR: postSearchWhere(search),
    };

    const followedMembershipWhere: Prisma.community_memberWhereInput = {
      user_id: followerUserId || "__missing_user__",
      deleted: false,
      community: {
        active: true,
        deleted: false,
      },
    };

    const [allItems, count, followingCount] = await Promise.all([
      prisma.community_post.findMany({
        where,
        orderBy: [
          { upvotes_count: "desc" },
          { replies_count: "desc" },
          { saves_count: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: postSelect,
      }),
      prisma.community_post.count({ where }),
      scope === "following" && followerUserId
        ? prisma.community_member.count({ where: followedMembershipWhere })
        : Promise.resolve(0),
    ]);
    const allPostIds = allItems.map((item) => item.id);
    const sortMetricsByPostId = await getCommunityPostSortMetrics(allPostIds);
    const items = sortGeneralFeedPostResults(allItems, sortMetricsByPostId).slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    );
    const highlightedRepliesByPostId = await selectHighlightedProfessionalReplies(items);
    const postIds = items.map((item) => item.id);
    const communityIds = [...new Set(items.map((item) => item.community.id))];
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
      getFollowedCommunityIds(data.auth?.id ?? undefined, communityIds),
      getMutedPostIds(data.auth?.id ?? undefined, postIds),
      getPostIdsWithPsychologistReplies(postIds),
    ]);

    return {
      data: items.map((item) =>
        toPostResponse(
          item,
          currentVotes.get(item.id) ?? null,
          savedPostIds.has(item.id),
          followedCommunityIds,
          savedReplyIds,
          undefined,
          highlightedRepliesByPostId.get(item.id) ?? null,
          mutedPostIds.has(item.id),
          postsWithPsychologistReplies.has(item.id),
        ),
      ),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      scope,
      community_slug: communitySlug,
      ...(scope === "following" ? { following_count: followingCount } : {}),
    };
  }
}
