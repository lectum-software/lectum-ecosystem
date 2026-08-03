import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";

const psychologistSelect = {
  cover_image_url: true,
  id: true,
  user_id: true,
  video_cover_url: true,
  video_url: true,
  user: {
    select: {
      active: true,
      createdAt: true,
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const communitySelect = {
  avatar_url: true,
  id: true,
  name: true,
  slug: true,
  visual_primary_color: true,
} satisfies Prisma.communitySelect;

const platformSessionSelect = {
  device_type: true,
  first_seen_at: true,
  last_seen_at: true,
  os: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

const postSelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  replies_count: true,
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  saves_count: true,
  title: true,
  upvotes_count: true,
  community: {
    select: communitySelect,
  },
  media_items: {
    orderBy: {
      position: "asc",
    },
    select: {
      media_type: true,
      media_url: true,
      position: true,
    },
    where: {
      deleted: false,
    },
  },
} satisfies Prisma.community_postSelect;

const coveragePatientPostSelect = {
  createdAt: true,
  id: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_postSelect;

const replySelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  parent_reply_id: true,
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  title: true,
  upvotes_count: true,
  post: {
    select: {
      createdAt: true,
      id: true,
      title: true,
      author: {
        select: {
          id: true,
          role: true,
        },
      },
      community: {
        select: communitySelect,
      },
    },
  },
} satisfies Prisma.post_replySelect;

const PROFILE_PAGE_SOURCE = "profile_page";
const SEARCH_RESULT_SOURCE = "search_result";

export const PROFILE_VIDEO_ACTION_TYPES = [
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
] as const;

export type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];

export type AdminPsychologistEngagementProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistPlatformSessionRecord = Prisma.visitor_sessionGetPayload<{
  select: typeof platformSessionSelect;
}>;

export type AdminPsychologistEngagementPost = Prisma.community_postGetPayload<{
  select: typeof postSelect;
}>;

export type AdminPsychologistCoveragePatientPost = Prisma.community_postGetPayload<{
  select: typeof coveragePatientPostSelect;
}>;

export type AdminPsychologistEngagementReply = Prisma.post_replyGetPayload<{
  select: typeof replySelect;
}>;

export type CountByDateRecord = { createdAt: Date };

export class AdminPsychologistEngagementRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistEngagementProfile | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: psychologistSelect,
    });
  }

  async listProfileConversionBenchmarkProfiles() {
    return prisma.psychologist_profile.findMany({
      select: {
        user: {
          select: {
            createdAt: true,
            id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listWhatsappClickCountsByPsychologist(from: Date, to: Date) {
    return prisma.contact_request.groupBy({
      by: ["psychologist_id"],
      where: {
        channel: "whatsapp",
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  async listPublicProfileAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const views = await prisma.page_view_event.findMany({
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
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: {
          in: psychologistIds,
        },
        target_type: "psychologist",
      },
    });
    const attentionSecondsByPsychologist = new Map<string, number>();

    for (const view of views) {
      if (!view.target_id) continue;
      if (view.user_id && view.user_id === view.target_id) continue;

      attentionSecondsByPsychologist.set(
        view.target_id,
        (attentionSecondsByPsychologist.get(view.target_id) ?? 0) + (view.duration_seconds ?? 0),
      );
    }

    return [...attentionSecondsByPsychologist].map(([psychologist_id, attention_seconds]) => ({
      attention_seconds,
      psychologist_id,
    }));
  }

  async listCommunityContentAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const records = await prisma.content_attention_session.groupBy({
      by: ["psychologist_id"],
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
        target_type: {
          in: ["post", "reply"],
        },
      },
      _sum: {
        attention_seconds: true,
      },
    });

    return records.map((record) => ({
      attention_seconds: record._sum.attention_seconds ?? 0,
      psychologist_id: record.psychologist_id,
    }));
  }

  async listProfileVideoAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const records = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
        watched_seconds: {
          gt: 0,
        },
      },
      _sum: {
        watched_seconds: true,
      },
    });

    return records.map((record) => ({
      attention_seconds: record._sum.watched_seconds ?? 0,
      psychologist_id: record.psychologist_id,
    }));
  }

  async listProfileViews(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        source: PROFILE_PAGE_SOURCE,
      },
      select: {
        createdAt: true,
        device_id: true,
        viewer_id: true,
      },
    });
  }

  async listPlatformPageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformSessions(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<AdminPsychologistPlatformSessionRecord[]> {
    return prisma.visitor_session.findMany({
      orderBy: {
        last_seen_at: "asc",
      },
      select: platformSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: to,
        },
        last_seen_at: {
          gte: from,
        },
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async findPwaInstallAction(userId: string) {
    return prisma.important_action_event.findFirst({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPublicProfilePageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        traffic_source: true,
        user_id: true,
        visitor_id: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: userId,
        target_type: "psychologist",
      },
    });
  }

  async listPublicProfileAttentionSessions(psychologistId: string, from: Date, to: Date) {
    const views = await prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        occurred_at: true,
        user_id: true,
      },
      where: {
        deleted: false,
        duration_seconds: {
          gt: 0,
        },
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: psychologistId,
        target_type: "psychologist",
      },
    });

    return views.flatMap((view) => {
      if (view.user_id && view.user_id === psychologistId) return [];

      return [
        {
          attention_seconds: view.duration_seconds ?? 0,
          createdAt: view.occurred_at,
        },
      ];
    });
  }

  async listCommunityContentAttentionSessions(psychologistId: string, from: Date, to: Date) {
    return prisma.content_attention_session.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        attention_seconds: true,
        community_id: true,
        createdAt: true,
        target_type: true,
      },
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        target_type: {
          in: ["post", "reply"],
        },
      },
    });
  }

  async listSearchResultImpressions(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        source: SEARCH_RESULT_SOURCE,
      },
      select: {
        createdAt: true,
        search_result_position: true,
      },
    });
  }

  async listWhatsappClicks(psychologistId: string, from: Date, to: Date) {
    return prisma.contact_request.findMany({
      where: {
        channel: "whatsapp",
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        createdAt: true,
        user_id: true,
      },
    });
  }

  async listFavorites(psychologistId: string, from: Date, to: Date) {
    return prisma.psychologist_favorite.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        createdAt: true,
        user_id: true,
      },
    });
  }

  async listImportantPsychologistWhatsappActions(psychologistId: string, from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        user_id: true,
        visitor_id: true,
      },
      where: {
        action_type: "whatsapp_click",
        deleted: false,
        occurred_at: { gte: from, lte: to },
        target_id: psychologistId,
        target_type: "psychologist",
      },
    });
  }

  async listWhatsappTrafficActions(from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        action_type: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        target_id: true,
        target_type: true,
        user_id: true,
      },
      where: {
        action_type: {
          in: ["psychologist_video_whatsapp_click", "whatsapp_click"],
        },
        deleted: false,
        occurred_at: { gte: from, lte: to },
      },
    });
  }

  async listCommunityTrafficPlatformMetricDataset(psychologistId: string, from: Date, to: Date) {
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
          author_id: psychologistId,
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          createdAt: {
            lte: to,
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
          author_id: psychologistId,
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          createdAt: {
            lte: to,
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

    pageViewTargets.push({
      page_kind: "psychologist_profile",
      target_id: psychologistId,
      target_type: "psychologist",
    });

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
              createdAt: { gte: from, lte: to },
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
              createdAt: { gte: from, lte: to },
              deleted: false,
              OR: commentTargets,
            },
          })
        : Promise.resolve([]),
      prisma.page_view_event.findMany({
        orderBy: [{ session_id: "asc" }, { occurred_at: "asc" }, { id: "asc" }],
        select: {
          occurred_at: true,
          session_id: true,
          target_id: true,
          target_type: true,
        },
        where: {
          deleted: false,
          occurred_at: { gte: from, lte: to },
          OR: pageViewTargets,
        },
      }),
      postIds.length > 0
        ? prisma.post_save.findMany({
            select: {
              post_id: true,
            },
            where: {
              createdAt: { gte: from, lte: to },
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
              createdAt: { gte: from, lte: to },
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
              createdAt: { gte: from, lte: to },
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
              createdAt: { gte: from, lte: to },
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
              createdAt: { gte: from, lte: to },
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

  async listProfileTrafficPlatformMetricDataset(psychologistId: string, from: Date, to: Date) {
    const [favorites, pageViews, profileViews, tabActions, videoActions, videoWatchSessions] =
      await Promise.all([
        prisma.psychologist_favorite.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: { gte: from, lte: to },
            deleted: false,
            psychologist_id: psychologistId,
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
            occurred_at: { gte: from, lte: to },
            page_kind: "psychologist_profile",
            target_id: psychologistId,
            target_type: "psychologist",
          },
        }),
        prisma.profile_view_event.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: { gte: from, lte: to },
            deleted: false,
            psychologist_id: psychologistId,
            source: PROFILE_PAGE_SOURCE,
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
            occurred_at: { gte: from, lte: to },
            target_id: psychologistId,
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
            occurred_at: { gte: from, lte: to },
            target_id: psychologistId,
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
            createdAt: { gte: from, lte: to },
            deleted: false,
            psychologist_id: psychologistId,
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

  async listReviews(psychologistId: string, from: Date, to: Date) {
    return prisma.professional_review.findMany({
      where: {
        author: {
          active: true,
          deleted: false,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: { createdAt: true },
    });
  }

  async listVideoSessions(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_video_watch_session.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        completed: true,
        createdAt: true,
        duration_seconds: true,
        last_event_at: true,
        max_position_seconds: true,
        milestone_100: true,
        milestone_25: true,
        milestone_50: true,
        milestone_75: true,
        replay_count: true,
        retention_buckets: true,
        video_url: true,
        viewer_id: true,
        watched_seconds: true,
      },
    });
  }

  async listVideoActionEvents(psychologistId: string, from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      where: {
        action_type: { in: [...PROFILE_VIDEO_ACTION_TYPES] },
        deleted: false,
        occurred_at: { gte: from, lte: to },
        target_id: psychologistId,
        target_type: "psychologist",
      },
      select: {
        action_type: true,
        occurred_at: true,
      },
    });
  }

  async listAuthoredPosts(psychologistId: string, from?: Date, to?: Date) {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "desc" },
      select: postSelect,
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: psychologistId,
        deleted: false,
        status: "publicado",
        community: { deleted: false },
      },
    });
  }

  async listAuthoredReplies(psychologistId: string, from?: Date, to?: Date) {
    return prisma.post_reply.findMany({
      orderBy: { createdAt: "desc" },
      select: replySelect,
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: psychologistId,
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: { deleted: false },
        },
      },
    });
  }

  async countPatientPostsByCommunity(from: Date, to: Date) {
    return prisma.community_post.groupBy({
      by: ["community_id"],
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        community: { deleted: false },
        createdAt: { gte: from, lte: to },
        deleted: false,
        status: "publicado",
      },
      _count: { _all: true },
    });
  }

  async listPatientPostsByCommunityForCoverage(from: Date, to: Date) {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "asc" },
      select: coveragePatientPostSelect,
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        community: { deleted: false },
        createdAt: { gte: from, lte: to },
        deleted: false,
        status: "publicado",
      },
    });
  }

  async listPostSaves(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_save.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listReplySaves(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_reply_save.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true },
    });
  }

  async listCommentsReceived(postIds: string[], psychologistId: string, from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_reply.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: { not: psychologistId },
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listPostVotes(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_vote.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true, value: true },
    });
  }

  async listReplyVotes(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_vote.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true, value: true },
    });
  }

  async listPostShareEvents(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_share.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
        reply_id: null,
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listReplyShareEvents(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_share.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true },
    });
  }

  async listPostSavesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_save.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, post_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        user_id: userId,
      },
    });
  }

  async listReplySavesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_reply_save.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, reply_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        user_id: userId,
      },
    });
  }

  async listPostVotesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_vote.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        post_id: true,
        value: true,
        post: {
          select: {
            community: {
              select: communitySelect,
            },
          },
        },
      },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        post_id: { not: null },
        user_id: userId,
        value: { in: [1, -1] },
      },
    });
  }

  async listReplyVotesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_vote.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        reply_id: true,
        value: true,
        reply: {
          select: {
            post: {
              select: {
                community: {
                  select: communitySelect,
                },
              },
            },
          },
        },
      },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: { not: null },
        user_id: userId,
        value: { in: [1, -1] },
      },
    });
  }

  async listPostShareEventsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_share.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, post_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        reply_id: null,
        user_id: userId,
      },
    });
  }

  async listReplyShareEventsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_share.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, reply_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: { not: null },
        user_id: userId,
      },
    });
  }

  async listReportsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_report.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        OR: [
          {
            reply_id: null,
            target_type: "post",
            post: {
              community: { deleted: false },
              deleted: false,
              status: "publicado",
            },
          },
          {
            reply_id: { not: null },
            reply: {
              deleted: false,
              post: {
                community: { deleted: false },
                deleted: false,
                status: "publicado",
              },
            },
          },
        ],
        reporter_id: userId,
      },
    });
  }

  async countReplyChildren(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.post_reply.groupBy({
      by: ["parent_reply_id"],
      where: {
        deleted: false,
        parent_reply_id: { in: replyIds },
      },
      _count: { _all: true },
    });
  }

  async countPostShares(postIds: string[]) {
    if (postIds.length === 0) return [];

    return prisma.post_share.groupBy({
      by: ["post_id"],
      where: {
        deleted: false,
        post_id: { in: postIds },
        reply_id: null,
      },
      _count: { _all: true },
    });
  }

  async countReplyShares(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.post_share.groupBy({
      by: ["reply_id"],
      where: {
        deleted: false,
        reply_id: { in: replyIds },
      },
      _count: { _all: true },
    });
  }

  async countPostViews(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async countReplyViews(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      },
      _count: { _all: true },
    });
  }

  async countPostWhatsappClicks(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        action_type: "whatsapp_click",
        deleted: false,
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async countReplyWhatsappClicks(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        action_type: "whatsapp_click",
        deleted: false,
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      },
      _count: { _all: true },
    });
  }

  async listCommunities(psychologistId: string) {
    return prisma.community_member.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        community: {
          select: communitySelect,
        },
      },
      where: {
        deleted: false,
        user_id: psychologistId,
        community: { deleted: false },
      },
    });
  }

  async listCommunityPsychologistParticipantIds(communityIds: string[]) {
    const uniqueCommunityIds = [...new Set(communityIds.filter(Boolean))];
    const participantIdsByCommunityId = new Map<string, Set<string>>();

    if (uniqueCommunityIds.length === 0) return participantIdsByCommunityId;

    const ensureCommunity = (communityId: string) => {
      const existing = participantIdsByCommunityId.get(communityId);
      if (existing) return existing;

      const next = new Set<string>();
      participantIdsByCommunityId.set(communityId, next);

      return next;
    };

    const [members, posts, replies] = await Promise.all([
      prisma.community_member.findMany({
        select: {
          community_id: true,
          user_id: true,
        },
        where: {
          community_id: { in: uniqueCommunityIds },
          deleted: false,
          community: { deleted: false },
          user: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
        },
      }),
      prisma.community_post.findMany({
        select: {
          author_id: true,
          community_id: true,
        },
        where: {
          community_id: { in: uniqueCommunityIds },
          deleted: false,
          community: { deleted: false },
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
        where: {
          deleted: false,
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          post: {
            community_id: { in: uniqueCommunityIds },
            community: { deleted: false },
            deleted: false,
          },
        },
      }),
    ]);

    for (const member of members) {
      ensureCommunity(member.community_id).add(member.user_id);
    }

    for (const post of posts) {
      ensureCommunity(post.community_id).add(post.author_id);
    }

    for (const reply of replies) {
      ensureCommunity(reply.post.community_id).add(reply.author_id);
    }

    return participantIdsByCommunityId;
  }

  async getCommunityMentorRankingSignals(communityId: string, mentorIds: string[]) {
    return getCommunityMentorRankingSignals(communityId, mentorIds);
  }

  async listTopMentorEligiblePsychologistIds() {
    const mentors = await prisma.user.findMany({
      where: {
        active: true,
        deleted: false,
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            published: true,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
            ...verifiedProfessionalProfileWhere(),
          },
        },
      },
      select: {
        id: true,
      },
    });

    return mentors.map((mentor) => mentor.id);
  }
}
