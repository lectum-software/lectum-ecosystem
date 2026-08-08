import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type {
  IPostMineDTO,
  IPostSavedDTO,
  PostListItemDTO,
  PostListResponse,
} from "../../DTOs/IPostDTO";
import {
  authorSelect,
  type CurrentVote,
  listPostSelect,
  normalizeListType,
  normalizePagination,
  normalizeVoteValue,
  toAuthorResponse,
  toListPostResponse,
  toPaginatedListResponse,
} from "../support/post-response";

import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostListRepository extends PostRepositoryContext {
  async mine(data: IPostMineDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;

    const [posts, postsCount, replies, repliesCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.community_post.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              status: "publicado",
              community: {
                active: true,
                deleted: false,
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: listPostSelect,
          })
        : Promise.resolve([]),
      shouldLoadPosts
        ? prisma.community_post.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              status: "publicado",
              community: {
                active: true,
                deleted: false,
              },
            },
          })
        : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  active: true,
                  deleted: false,
                },
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              title: true,
              content: true,
              media_url: true,
              media_type: true,
              thumbnail_url: true,
              upvotes_count: true,
              downvotes_count: true,
              createdAt: true,
              edited_at: true,
              parent_reply_id: true,
              author: {
                select: authorSelect,
              },
              _count: {
                select: {
                  replies: {
                    where: {
                      deleted: false,
                    },
                  },
                  saves: {
                    where: {
                      deleted: false,
                    },
                  },
                },
              },
              replies: {
                where: {
                  deleted: false,
                  author_id: {
                    not: data.auth.id!,
                  },
                  author: {
                    role: "psicologo",
                    psychologist_profile: {
                      is: {
                        deleted: false,
                        ...verifiedProfessionalProfileWhere(),
                      },
                    },
                  },
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              parent_reply: {
                select: {
                  content: true,
                },
              },
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies
        ? prisma.post_reply.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  active: true,
                  deleted: false,
                },
              },
            },
          })
        : Promise.resolve(0),
    ]);
    const postVoteMap = new Map<string, CurrentVote>();
    const replyVoteMap = new Map<string, CurrentVote>();
    const savedPostIds = new Set<string>();
    const savedReplyIds = new Set<string>();
    const postIds = posts.map((post) => post.id);
    const replyIds = replies.map((reply) => reply.id);
    const contextPostIds = [...new Set([...postIds, ...replies.map((reply) => reply.post.id)])];

    if (postIds.length > 0 || replyIds.length > 0) {
      const [postVotes, replyVotes, postSaves, replySaves] = await Promise.all([
        postIds.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postIds,
                },
              },
              select: {
                post_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        replyIds.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replyIds,
                },
              },
              select: {
                reply_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        postIds.length > 0
          ? prisma.post_save.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postIds,
                },
              },
              select: {
                post_id: true,
              },
            })
          : Promise.resolve([]),
        replyIds.length > 0
          ? prisma.post_reply_save.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replyIds,
                },
              },
              select: {
                reply_id: true,
              },
            })
          : Promise.resolve([]),
      ]);

      for (const vote of postVotes) {
        if (vote.post_id) {
          postVoteMap.set(vote.post_id, normalizeVoteValue(vote.value));
        }
      }

      for (const vote of replyVotes) {
        if (vote.reply_id) {
          replyVoteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
        }
      }

      for (const save of postSaves) {
        if (save.post_id) {
          savedPostIds.add(save.post_id);
        }
      }

      for (const save of replySaves) {
        if (save.reply_id) {
          savedReplyIds.add(save.reply_id);
        }
      }
    }

    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(data.auth.id!, contextPostIds),
      getPostIdsWithPsychologistReplies(contextPostIds),
    ]);

    const postItems = posts.map<PostListItemDTO>((post) => ({
      id: post.id,
      type: "post",
      created_at: post.createdAt,
      saved_at: null,
      status: post.status,
      saved: savedPostIds.has(post.id),
      post: toListPostResponse(
        post,
        postVoteMap.get(post.id) ?? null,
        savedPostIds.has(post.id),
        savedReplyIds,
        mutedPostIds.has(post.id),
        postsWithPsychologistReplies.has(post.id),
      ),
      reply: null,
    }));
    const replyItems = replies.map<PostListItemDTO>((reply) => ({
      id: reply.id,
      type: "reply",
      created_at: reply.createdAt,
      saved_at: null,
      status: "publicado",
      saved: savedReplyIds.has(reply.id),
      post: toListPostResponse(
        reply.post,
        null,
        false,
        undefined,
        mutedPostIds.has(reply.post.id),
        postsWithPsychologistReplies.has(reply.post.id),
      ),
      reply: {
        id: reply.id,
        title: reply.title,
        content: reply.content,
        media_url: reply.media_url,
        media_type: reply.media_type,
        thumbnail_url: reply.thumbnail_url,
        upvotes_count: reply.upvotes_count,
        downvotes_count: reply.downvotes_count,
        saves_count: reply._count.saves,
        replies_received_count: reply._count.replies,
        has_verified_professional_reply: reply.replies.length > 0,
        created_at: reply.createdAt,
        edited_at: reply.edited_at,
        parent_reply_id: reply.parent_reply_id,
        parent_content: reply.parent_reply?.content ?? null,
        current_user_vote: replyVoteMap.get(reply.id) ?? null,
        saved: savedReplyIds.has(reply.id),
        author: toAuthorResponse(
          reply.author,
          reply.upvotes_count,
          false,
          undefined,
          "community_reply",
        ),
      },
    }));
    const merged =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const createdAtDiff =
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              if (createdAtDiff !== 0) return createdAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postsCount + repliesCount;

    return toPaginatedListResponse(merged, pagination.page, pagination.limit, count);
  }

  async saved(data: IPostSavedDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;
    const postWhere: Prisma.post_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
    };
    const replyWhere: Prisma.post_reply_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      reply: {
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: {
            active: true,
            deleted: false,
          },
        },
      },
    };
    const [postSaves, postCount, replySaves, replyCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.post_save.findMany({
            where: postWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadPosts ? prisma.post_save.count({ where: postWhere }) : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply_save.findMany({
            where: replyWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              reply: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  media_url: true,
                  media_type: true,
                  thumbnail_url: true,
                  upvotes_count: true,
                  downvotes_count: true,
                  createdAt: true,
                  edited_at: true,
                  parent_reply_id: true,
                  author: {
                    select: authorSelect,
                  },
                  _count: {
                    select: {
                      replies: {
                        where: {
                          deleted: false,
                        },
                      },
                      saves: {
                        where: {
                          deleted: false,
                        },
                      },
                    },
                  },
                  replies: {
                    where: {
                      deleted: false,
                      author: {
                        role: "psicologo",
                        psychologist_profile: {
                          is: {
                            deleted: false,
                            ...verifiedProfessionalProfileWhere(),
                          },
                        },
                      },
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                  parent_reply: {
                    select: {
                      content: true,
                    },
                  },
                  post: {
                    select: listPostSelect,
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies ? prisma.post_reply_save.count({ where: replyWhere }) : Promise.resolve(0),
    ]);
    const postVoteMap = new Map<string, CurrentVote>();
    const replyVoteMap = new Map<string, CurrentVote>();

    if (postSaves.length > 0 || replySaves.length > 0) {
      const [postVotes, replyVotes] = await Promise.all([
        postSaves.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postSaves.map((item) => item.post.id),
                },
              },
              select: {
                post_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        replySaves.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replySaves.map((item) => item.reply.id),
                },
              },
              select: {
                reply_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
      ]);

      for (const vote of postVotes) {
        if (vote.post_id) {
          postVoteMap.set(vote.post_id, normalizeVoteValue(vote.value));
        }
      }

      for (const vote of replyVotes) {
        if (vote.reply_id) {
          replyVoteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
        }
      }
    }

    const contextPostIds = [
      ...new Set([
        ...postSaves.map((item) => item.post.id),
        ...replySaves.map((item) => item.reply.post.id),
      ]),
    ];
    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(data.auth.id!, contextPostIds),
      getPostIdsWithPsychologistReplies(contextPostIds),
    ]);

    const postItems = postSaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "post",
      created_at: item.post.createdAt,
      saved_at: item.createdAt,
      status: item.post.status,
      saved: true,
      post: toListPostResponse(
        item.post,
        postVoteMap.get(item.post.id) ?? null,
        true,
        undefined,
        mutedPostIds.has(item.post.id),
        postsWithPsychologistReplies.has(item.post.id),
      ),
      reply: null,
    }));
    const replyItems = replySaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "reply",
      created_at: item.reply.createdAt,
      saved_at: item.createdAt,
      status: "publicado",
      saved: true,
      post: toListPostResponse(
        item.reply.post,
        null,
        false,
        undefined,
        mutedPostIds.has(item.reply.post.id),
        postsWithPsychologistReplies.has(item.reply.post.id),
      ),
      reply: {
        id: item.reply.id,
        title: item.reply.title,
        content: item.reply.content,
        media_url: item.reply.media_url,
        media_type: item.reply.media_type,
        thumbnail_url: item.reply.thumbnail_url,
        upvotes_count: item.reply.upvotes_count,
        downvotes_count: item.reply.downvotes_count,
        saves_count: item.reply._count.saves,
        replies_received_count: item.reply._count.replies,
        has_verified_professional_reply: item.reply.replies.length > 0,
        created_at: item.reply.createdAt,
        edited_at: item.reply.edited_at,
        parent_reply_id: item.reply.parent_reply_id,
        parent_content: item.reply.parent_reply?.content ?? null,
        current_user_vote: replyVoteMap.get(item.reply.id) ?? null,
        saved: true,
        author: toAuthorResponse(
          item.reply.author,
          item.reply.upvotes_count,
          false,
          undefined,
          "community_reply",
        ),
      },
    }));
    const responseItems =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const savedAtDiff =
                new Date(b.saved_at ?? b.created_at).getTime() -
                new Date(a.saved_at ?? a.created_at).getTime();
              if (savedAtDiff !== 0) return savedAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postCount + replyCount;

    return toPaginatedListResponse(responseItems, pagination.page, pagination.limit, count);
  }
}
