import prisma from "@/infra/database/prisma";

import {
  calculateVideoScoreWithLearningWindow,
  countSearchImpressionsSinceStart,
  getProfessionalStartDate,
  isQualifiedVideoView,
  mapGroupCounts,
  mergeLatestActivity,
  type PsychologistRankingCandidate,
  type RankingContext,
  SEARCH_RESULT_SOURCE,
  type VideoRankingStats,
  type VideoWatchSessionForRanking,
} from "./scoring";

export const getRankingContext = async (
  candidates: PsychologistRankingCandidate[],
  viewerId: string | null,
): Promise<RankingContext> => {
  const now = new Date();
  const latestActivityAt = new Map<string, Date>();
  const psychologistIds = candidates.map((item) => item.user.id);
  const professionalStartDates = new Map(
    candidates
      .map((item) => [item.user.id, getProfessionalStartDate(item)] as const)
      .filter((entry): entry is readonly [string, Date] => Boolean(entry[1])),
  );
  const earliestProfessionalStart = [...professionalStartDates.values()].reduce<Date | null>(
    (earliest, startedAt) => {
      if (!earliest || startedAt < earliest) return startedAt;

      return earliest;
    },
    null,
  );

  if (psychologistIds.length === 0) {
    return {
      favoriteCounts: new Map(),
      latestActivityAt,
      now,
      professionalStartDates,
      qualifiedVideoViewsSinceProfessionalStart: new Map(),
      seedDate: now.toISOString().slice(0, 10),
      searchImpressionsSinceProfessionalStart: new Map(),
      videoStats: new Map(),
      viewerId,
      whatsappClickCounts: new Map(),
    };
  }

  const [favoriteGroups, whatsappGroups, reviewGroups, videoSessions, searchImpressions] =
    await Promise.all([
      prisma.psychologist_favorite.groupBy({
        by: ["psychologist_id"],
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.contact_request.groupBy({
        by: ["psychologist_id"],
        where: {
          channel: "whatsapp",
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["psychologist_id"],
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
          status: "publicada",
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.profile_video_watch_session.findMany({
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
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
        select: {
          completed: true,
          createdAt: true,
          duration_seconds: true,
          last_event_at: true,
          max_position_seconds: true,
          milestone_100: true,
          psychologist_id: true,
          video_url: true,
          watched_seconds: true,
        },
      }),
      earliestProfessionalStart
        ? prisma.profile_view_event.findMany({
            where: {
              createdAt: {
                gte: earliestProfessionalStart,
              },
              deleted: false,
              psychologist_id: {
                in: psychologistIds,
              },
              source: SEARCH_RESULT_SOURCE,
            },
            select: {
              createdAt: true,
              psychologist_id: true,
            },
          })
        : Promise.resolve([]),
    ]);

  for (const group of [...favoriteGroups, ...whatsappGroups, ...reviewGroups]) {
    mergeLatestActivity(latestActivityAt, group.psychologist_id, group._max?.createdAt);
  }

  const sessionsByPsychologist = new Map<string, VideoWatchSessionForRanking[]>();
  const qualifiedVideoViewsSinceProfessionalStart = new Map<string, number>();

  for (const session of videoSessions) {
    const sessions = sessionsByPsychologist.get(session.psychologist_id) ?? [];
    sessions.push(session);
    sessionsByPsychologist.set(session.psychologist_id, sessions);
    mergeLatestActivity(latestActivityAt, session.psychologist_id, session.last_event_at);

    const professionalStartedAt = professionalStartDates.get(session.psychologist_id);

    if (
      professionalStartedAt &&
      session.createdAt >= professionalStartedAt &&
      isQualifiedVideoView(session)
    ) {
      qualifiedVideoViewsSinceProfessionalStart.set(
        session.psychologist_id,
        (qualifiedVideoViewsSinceProfessionalStart.get(session.psychologist_id) ?? 0) + 1,
      );
    }
  }

  const videoStats = new Map<string, VideoRankingStats>();

  for (const candidate of candidates) {
    videoStats.set(
      candidate.user.id,
      calculateVideoScoreWithLearningWindow(
        candidate.video_url,
        sessionsByPsychologist.get(candidate.user.id) ?? [],
      ),
    );
  }

  return {
    favoriteCounts: mapGroupCounts(favoriteGroups),
    latestActivityAt,
    now,
    professionalStartDates,
    qualifiedVideoViewsSinceProfessionalStart,
    seedDate: now.toISOString().slice(0, 10),
    searchImpressionsSinceProfessionalStart: countSearchImpressionsSinceStart(
      searchImpressions,
      professionalStartDates,
    ),
    videoStats,
    viewerId,
    whatsappClickCounts: mapGroupCounts(whatsappGroups),
  };
};
