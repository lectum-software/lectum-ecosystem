import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { AdminPsychologistsDashboardDateRange } from "../../DTOs/IAdminPsychologistsDashboardDTO";
import { eventCreatedAtWhere } from "../support/dashboard-selects";

export class AdminPsychologistsDashboardTrafficRepository {
  async listCommunityTrafficPlatformMetricDataset(range: AdminPsychologistsDashboardDateRange) {
    const [posts, replies] = await Promise.all([
      prisma.community_post.findMany({
        select: {
          author_id: true,
          createdAt: true,
          id: true,
          media_items: {
            select: {
              media_type: true,
            },
            where: {
              deleted: false,
            },
          },
          media_type: true,
        },
        where: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          createdAt: {
            lte: range.end,
          },
          deleted: false,
          status: "publicado",
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          createdAt: true,
          id: true,
          media_type: true,
          parent_reply_id: true,
          post: {
            select: {
              author: {
                select: {
                  role: true,
                },
              },
              author_id: true,
              createdAt: true,
              id: true,
            },
          },
          post_id: true,
        },
        where: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          createdAt: {
            lte: range.end,
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            deleted: false,
            status: "publicado",
          },
        },
      }),
    ]);

    const postIds = posts.map((post) => post.id);
    const replyIds = replies.map((reply) => reply.id);
    const psychologistIds = [...new Set([...posts, ...replies].map((item) => item.author_id))];
    const pageViewTargets: Prisma.page_view_eventWhereInput[] = [];
    const attentionTargets: Prisma.content_attention_sessionWhereInput[] = [];
    const videoTargets: Prisma.content_video_watch_sessionWhereInput[] = [];
    const voteTargets: Prisma.post_voteWhereInput[] = [];
    const commentTargets: Prisma.post_replyWhereInput[] = [];

    if (postIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      });
      attentionTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: "post",
      });
      videoTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: "post",
      });
      voteTargets.push({
        post_id: {
          in: postIds,
        },
      });
      commentTargets.push({
        post_id: {
          in: postIds,
        },
      });
    }

    if (replyIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: {
          in: ["post_reply", "reply"],
        },
      });
      attentionTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: "reply",
      });
      videoTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: "reply",
      });
      voteTargets.push({
        reply_id: {
          in: replyIds,
        },
      });
      commentTargets.push({
        parent_reply_id: {
          in: replyIds,
        },
      });
    }

    if (psychologistIds.length > 0) {
      pageViewTargets.push({
        page_kind: "psychologist_profile",
        target_id: {
          in: psychologistIds,
        },
        target_type: "psychologist",
      });
    }

    const [
      attentionSessions,
      comments,
      pageViews,
      postSaves,
      replySaves,
      shares,
      videoWatchSessions,
      votes,
    ] = await Promise.all([
      attentionTargets.length > 0
        ? prisma.content_attention_session.findMany({
            select: {
              attention_seconds: true,
              target_id: true,
              target_type: true,
            },
            where: {
              attention_seconds: {
                gt: 0,
              },
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: attentionTargets,
            },
          })
        : Promise.resolve([]),
      commentTargets.length > 0
        ? prisma.post_reply.findMany({
            select: {
              parent_reply_id: true,
              post_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: commentTargets,
            },
          })
        : Promise.resolve([]),
      pageViewTargets.length > 0
        ? prisma.page_view_event.findMany({
            orderBy: [{ session_id: "asc" }, { occurred_at: "asc" }, { id: "asc" }],
            select: {
              occurred_at: true,
              session_id: true,
              target_id: true,
              target_type: true,
            },
            where: {
              deleted: false,
              occurred_at: eventCreatedAtWhere(range),
              OR: pageViewTargets,
            },
          })
        : Promise.resolve([]),
      postIds.length > 0
        ? prisma.post_save.findMany({
            select: {
              post_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              post_id: {
                in: postIds,
              },
            },
          })
        : Promise.resolve([]),
      replyIds.length > 0
        ? prisma.post_reply_save.findMany({
            select: {
              reply_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              reply_id: {
                in: replyIds,
              },
            },
          })
        : Promise.resolve([]),
      postIds.length > 0 || replyIds.length > 0
        ? prisma.post_share.findMany({
            select: {
              post_id: true,
              reply_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: [
                ...(postIds.length > 0
                  ? [
                      {
                        post_id: {
                          in: postIds,
                        },
                        reply_id: null,
                      },
                    ]
                  : []),
                ...(replyIds.length > 0
                  ? [
                      {
                        reply_id: {
                          in: replyIds,
                        },
                      },
                    ]
                  : []),
              ],
            },
          })
        : Promise.resolve([]),
      videoTargets.length > 0
        ? prisma.content_video_watch_session.findMany({
            select: {
              duration_seconds: true,
              target_id: true,
              target_type: true,
              watched_seconds: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: videoTargets,
            },
          })
        : Promise.resolve([]),
      voteTargets.length > 0
        ? prisma.post_vote.findMany({
            select: {
              post_id: true,
              reply_id: true,
              value: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: voteTargets,
              value: {
                in: [1, -1],
              },
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      attentionSessions,
      comments,
      pageViews,
      posts,
      postSaves,
      replies,
      replySaves,
      shares,
      videoWatchSessions,
      votes,
    };
  }

  async listProfileTrafficPlatformMetricDataset(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) {
      return {
        favorites: [],
        pageViews: [],
        profileViews: [],
        tabActions: [],
        videoActions: [],
        videoWatchSessions: [],
      };
    }

    const [favorites, pageViews, profileViews, tabActions, videoActions, videoWatchSessions] =
      await Promise.all([
        prisma.psychologist_favorite.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
          },
        }),
        prisma.page_view_event.findMany({
          select: {
            duration_seconds: true,
            target_id: true,
            user_id: true,
          },
          where: {
            deleted: false,
            duration_seconds: {
              gt: 0,
            },
            occurred_at: eventCreatedAtWhere(range),
            page_kind: "psychologist_profile",
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.profile_view_event.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
            source: "profile_page",
          },
        }),
        prisma.important_action_event.findMany({
          select: {
            action_type: true,
            target_id: true,
            user_id: true,
          },
          where: {
            action_type: {
              in: [
                "psychologist_profile_publications_tab_open",
                "psychologist_profile_reviews_tab_open",
              ],
            },
            deleted: false,
            occurred_at: eventCreatedAtWhere(range),
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.important_action_event.findMany({
          select: {
            action_type: true,
            path: true,
            target_id: true,
            user_id: true,
          },
          where: {
            action_type: {
              in: [
                "psychologist_video_favorite",
                "psychologist_video_profile_access",
                "psychologist_video_share",
              ],
            },
            deleted: false,
            occurred_at: eventCreatedAtWhere(range),
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.profile_video_watch_session.findMany({
          select: {
            completed: true,
            duration_seconds: true,
            max_position_seconds: true,
            milestone_100: true,
            psychologist_id: true,
            replay_count: true,
            viewer_id: true,
            watched_seconds: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
          },
        }),
      ]);

    return {
      favorites,
      pageViews,
      profileViews,
      tabActions,
      videoActions,
      videoWatchSessions,
    };
  }
}
