import prisma from "@/infra/database/prisma";
import { hasDirectorySelectedFilterParams } from "@/utils/analytics-traffic-path";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsPresentationVideoRetentionPoint,
  PsychologistAnalyticsResponse,
} from "../../DTOs/IAnalyticsDTO";
import {
  countVideoActionEvents,
  deriveRetentionBucketsFromPosition,
  normalizeRetentionBuckets,
  percentage,
  toPresentationVideoCards,
} from "../support/community";
import {
  buildPresentationVideoSearchTerms,
  buildSearchFilterLabelLookup,
  PROFILE_VIDEO_ACTION_TYPES,
  RETENTION_BUCKETS,
  toCards,
  toTrafficSources,
} from "../support/traffic";

import type { PsychologistAnalyticsCommunityRepository } from "./PsychologistAnalyticsCommunityRepository";

export class PsychologistAnalyticsSummaryRepository {
  constructor(protected readonly dependency: PsychologistAnalyticsCommunityRepository) {}

  async index(
    data: IPsychologistAnalyticsIndexDTO,
    period: PsychologistAnalyticsPeriod,
    hasProfessionalEntitlement: boolean,
  ): Promise<PsychologistAnalyticsResponse> {
    const userId = data.auth.id!;
    const createdAtWindow = {
      gte: period.start_at,
      lte: period.end_at,
    };

    const [
      profileViews,
      presentationVideoSearchImpressions,
      whatsappClicks,
      reviewsReceived,
      profile,
      postsAggregate,
      presentationVideoSessions,
      presentationVideoActionEvents,
      psychologistWhatsappActionEvents,
      favoriteEvents,
      communities,
      searchFilterLabelLookup,
    ] = await Promise.all([
      prisma.profile_view_event.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          source: "profile_page",
          OR: [
            {
              viewer_id: null,
            },
            {
              viewer_id: {
                not: userId,
              },
            },
          ],
        },
      }),
      prisma.profile_view_event.findMany({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          search_context_path: {
            contains: "?",
          },
          source: "search_result",
          OR: [
            {
              viewer_id: null,
            },
            {
              viewer_id: {
                not: userId,
              },
            },
          ],
        },
        select: {
          search_context_path: true,
        },
      }),
      prisma.contact_request.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          channel: "whatsapp",
          createdAt: createdAtWindow,
          OR: [
            {
              user_id: null,
            },
            {
              user_id: {
                not: userId,
              },
            },
          ],
        },
      }),
      prisma.professional_review.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          status: "publicada",
          createdAt: createdAtWindow,
        },
      }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: userId,
          deleted: false,
        },
        select: {
          rating_avg: true,
          rating_count: true,
          video_cover_url: true,
          video_url: true,
        },
      }),
      prisma.community_post.aggregate({
        where: {
          author_id: userId,
          deleted: false,
          status: "publicado",
          createdAt: createdAtWindow,
        },
        _count: { _all: true },
        _sum: {
          upvotes_count: true,
          replies_count: true,
        },
      }),
      prisma.profile_video_watch_session.findMany({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          AND: [
            {
              OR: [
                {
                  viewer_id: null,
                },
                {
                  viewer_id: {
                    not: userId,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  watched_seconds: {
                    gt: 0,
                  },
                },
                {
                  max_position_seconds: {
                    gt: 0,
                  },
                },
              ],
            },
          ],
        },
        select: {
          video_url: true,
          watched_seconds: true,
          duration_seconds: true,
          max_position_seconds: true,
          completed: true,
          replay_count: true,
          milestone_25: true,
          milestone_50: true,
          milestone_75: true,
          milestone_100: true,
          retention_buckets: true,
          last_event_at: true,
        },
      }),
      prisma.important_action_event.findMany({
        where: {
          action_type: { in: [...PROFILE_VIDEO_ACTION_TYPES] },
          deleted: false,
          occurred_at: createdAtWindow,
          target_id: userId,
          target_type: "psychologist",
          OR: [
            {
              user_id: null,
            },
            {
              user_id: {
                not: userId,
              },
            },
          ],
        },
        select: {
          action_type: true,
          occurred_at: true,
          path: true,
        },
      }),
      prisma.important_action_event.findMany({
        where: {
          action_type: "whatsapp_click",
          deleted: false,
          occurred_at: createdAtWindow,
          target_id: userId,
          target_type: "psychologist",
          OR: [
            {
              user_id: null,
            },
            {
              user_id: {
                not: userId,
              },
            },
          ],
        },
        select: {
          occurred_at: true,
          page_kind: true,
          path: true,
        },
      }),
      prisma.psychologist_favorite.findMany({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          user_id: {
            not: userId,
          },
        },
        select: {
          createdAt: true,
        },
      }),
      this.dependency.buildCommunities(userId, createdAtWindow),
      buildSearchFilterLabelLookup(),
    ]);
    const trackedSearchResultImpressions = presentationVideoSearchImpressions.filter((impression) =>
      hasDirectorySelectedFilterParams(impression.search_context_path),
    );
    const searchResults = trackedSearchResultImpressions.length;
    const currentPresentationVideoSessions = profile?.video_url
      ? presentationVideoSessions.filter((session) => session.video_url === profile.video_url)
      : [];

    const postUpvotes = postsAggregate._sum.upvotes_count || 0;
    const postReplies = postsAggregate._sum.replies_count || 0;
    const metrics = {
      search_results: searchResults,
      profile_views: profileViews,
      favorites_received: favoriteEvents.length,
      whatsapp_clicks: whatsappClicks,
      reviews_received: reviewsReceived,
      rating_average: profile?.rating_avg || 0,
      rating_count_total: profile?.rating_count || 0,
      posts_published: postsAggregate._count._all,
      post_engagement: postUpvotes + postReplies,
      post_upvotes: postUpvotes,
      post_replies: postReplies,
    };
    const videoViews = currentPresentationVideoSessions.length;
    const totalWatchedSeconds = currentPresentationVideoSessions.reduce(
      (sum, session) => sum + session.watched_seconds,
      0,
    );
    const sessionRetentionBuckets = currentPresentationVideoSessions.map((session) => {
      const persistedBuckets = normalizeRetentionBuckets(session.retention_buckets);
      const derivedBuckets = deriveRetentionBucketsFromPosition(
        session.max_position_seconds,
        session.duration_seconds,
        session.completed || session.milestone_100,
      );
      const legacyMilestones = [
        session.milestone_25 ? 25 : null,
        session.milestone_50 ? 50 : null,
        session.milestone_75 ? 75 : null,
        session.milestone_100 ? 100 : null,
      ].filter((bucket): bucket is number => typeof bucket === "number");

      return new Set([...persistedBuckets, ...derivedBuckets, ...legacyMilestones]);
    });
    const completedViews = sessionRetentionBuckets.filter((buckets) => buckets.has(100)).length;
    const replayedViews = currentPresentationVideoSessions.filter(
      (session) => session.replay_count > 0,
    ).length;
    const durationSeconds =
      currentPresentationVideoSessions.reduce(
        (max, session) => Math.max(max, session.duration_seconds),
        0,
      ) || null;
    const actionMetrics = countVideoActionEvents(presentationVideoActionEvents);
    const latestVideoEventAt =
      [
        ...currentPresentationVideoSessions.map((session) => session.last_event_at),
        ...presentationVideoActionEvents.map((action) => action.occurred_at),
      ].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const retentionPoints: PsychologistAnalyticsPresentationVideoRetentionPoint[] =
      RETENTION_BUCKETS.map((bucket) => {
        const viewers = sessionRetentionBuckets.filter((buckets) => buckets.has(bucket)).length;

        return {
          milestone: bucket,
          viewers,
          rate: percentage(viewers, videoViews),
        };
      });
    const retentionTimeline: PsychologistAnalyticsPresentationVideoRetentionPoint[] = [
      {
        milestone: 0,
        viewers: videoViews,
        rate: videoViews > 0 ? 100 : 0,
      },
      ...retentionPoints,
    ];
    let retentionDropoff: PsychologistAnalyticsPresentationVideo["retention"]["dropoff"] = null;

    for (let index = 1; index < retentionTimeline.length; index += 1) {
      const previous = retentionTimeline[index - 1]!;
      const current = retentionTimeline[index]!;
      const rateDrop = Math.max(0, previous.rate - current.rate);

      if (rateDrop > (retentionDropoff?.rate_drop ?? 0)) {
        retentionDropoff = {
          from_milestone: previous.milestone,
          to_milestone: current.milestone,
          rate_drop: rateDrop,
          from_seconds: durationSeconds
            ? Math.round((durationSeconds * previous.milestone) / 100)
            : 0,
          to_seconds: durationSeconds ? Math.round((durationSeconds * current.milestone) / 100) : 0,
        };
      }
    }

    if (!retentionDropoff || retentionDropoff.rate_drop <= 0) {
      retentionDropoff = null;
    }

    const averageWatchSeconds = videoViews > 0 ? Math.round(totalWatchedSeconds / videoViews) : 0;
    const averageWatchPercent =
      videoViews > 0 && durationSeconds
        ? percentage(Math.min(averageWatchSeconds, durationSeconds), durationSeconds)
        : 0;
    const presentationVideoMetrics = {
      views: videoViews,
      total_watch_seconds: totalWatchedSeconds,
      average_watch_seconds: averageWatchSeconds,
      completed_views: completedViews,
      completion_rate: percentage(completedViews, videoViews),
      replay_rate: percentage(replayedViews, videoViews),
      abandonment_rate: videoViews > 0 ? percentage(videoViews - completedViews, videoViews) : 0,
      search_results_from_video: searchResults,
      ...actionMetrics,
    };
    const presentationVideo: PsychologistAnalyticsPresentationVideo = {
      updated_at: latestVideoEventAt,
      video_url: profile?.video_url ?? null,
      video_cover_url: profile?.video_cover_url ?? null,
      duration_seconds: durationSeconds,
      metrics: presentationVideoMetrics,
      cards: toPresentationVideoCards(presentationVideoMetrics),
      search_terms: buildPresentationVideoSearchTerms(
        trackedSearchResultImpressions,
        searchFilterLabelLookup,
      ),
      retention: {
        average_retention_rate: averageWatchPercent,
        dropoff: retentionDropoff,
        points: retentionPoints,
        source: "bucket_5_percent",
      },
    };

    return {
      access: {
        has_professional_entitlement: hasProfessionalEntitlement,
        mode: hasProfessionalEntitlement ? "full" : "preview",
      },
      period,
      metrics,
      cards: toCards(metrics),
      presentation_video: presentationVideo,
      communities,
      traffic_sources: toTrafficSources({
        communities,
        favoriteEvents,
        presentationVideoActions: presentationVideoActionEvents,
        profileViews,
        psychologistWhatsappActions: psychologistWhatsappActionEvents,
      }),
      unavailable: [],
    };
  }
}
