import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type {
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsCommunityActivityDiagnosis,
  PsychologistAnalyticsCommunityContentBreakdownId,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsPresentationVideoMetric,
} from "../../DTOs/IAnalyticsDTO";

import {
  COMMUNITY_ANALYTICS_SOURCE,
  PROFILE_VIDEO_ACTION_TYPES,
  type PresentationVideoActionEvent,
  type ProfileVideoActionType,
  type PsychologistCommunityReference,
  RETENTION_BUCKETS,
  TOP_MENTOR_COMMUNITIES_LIMIT,
} from "./traffic";

export { percentage } from "./math";

export const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

export const deriveRetentionBucketsFromPosition = (
  maxPositionSeconds: number,
  durationSeconds: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (durationSeconds <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPositionSeconds / durationSeconds) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
};

export const toPresentationVideoCards = (
  metrics: PsychologistAnalyticsPresentationVideo["metrics"],
): PsychologistAnalyticsPresentationVideoMetric[] => [
  {
    id: "views",
    label: "Visualizações",
    value: metrics.views,
    unit: "count",
    description: "Sessões em que o vídeo de apresentação foi reproduzido.",
  },
  {
    id: "average_watch_seconds",
    label: "Tempo médio assistido",
    value: metrics.average_watch_seconds,
    unit: "seconds",
    description: "Média do tempo único assistido por visualização.",
  },
  {
    id: "completion_rate",
    label: "Taxa de conclusão",
    value: metrics.completion_rate,
    unit: "percent",
    description: "Percentual de visualizações que chegaram ao fim do vídeo.",
  },
  {
    id: "replay_rate",
    label: "Taxa de replays",
    value: metrics.replay_rate,
    unit: "percent",
    description: "Percentual de visualizações com reprodução repetida.",
  },
  {
    id: "abandonment_rate",
    label: "Taxa de abandono",
    value: metrics.abandonment_rate,
    unit: "percent",
    description: "Visualizações que não chegaram ao fim do vídeo.",
  },
];

export const countVideoActionEvents = (
  actions: PresentationVideoActionEvent[],
): Pick<
  PsychologistAnalyticsPresentationVideo["metrics"],
  | "favorites_from_video"
  | "profile_accesses_from_video"
  | "shares_from_video"
  | "whatsapp_clicks_from_video"
> => {
  const counts = new Map<ProfileVideoActionType, number>(
    PROFILE_VIDEO_ACTION_TYPES.map((actionType) => [actionType, 0]),
  );

  for (const action of actions) {
    const actionType = action.action_type as ProfileVideoActionType;
    if (!counts.has(actionType)) continue;
    counts.set(actionType, (counts.get(actionType) ?? 0) + 1);
  }

  return {
    favorites_from_video: counts.get("psychologist_video_favorite") ?? 0,
    profile_accesses_from_video: counts.get("psychologist_video_profile_access") ?? 0,
    shares_from_video: counts.get("psychologist_video_share") ?? 0,
    whatsapp_clicks_from_video: counts.get("psychologist_video_whatsapp_click") ?? 0,
  };
};

export const COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS: Array<
  Pick<
    PsychologistAnalyticsCommunities["content"]["whatsapp_clicks_by_content"][number],
    "content_type" | "id" | "label" | "media_scope"
  >
> = [
  {
    id: "post_with_video",
    label: "Posts com vídeo",
    content_type: "post",
    media_scope: "with_video",
  },
  {
    id: "post_without_video",
    label: "Posts sem vídeo",
    content_type: "post",
    media_scope: "without_video",
  },
  {
    id: "reply_with_video",
    label: "Respostas com vídeo",
    content_type: "reply",
    media_scope: "with_video",
  },
  {
    id: "reply_without_video",
    label: "Respostas sem vídeo",
    content_type: "reply",
    media_scope: "without_video",
  },
];

export const emptyCommunityContentTotals = () => ({
  total: 0,
  with_video: 0,
  without_video: 0,
});

export const emptyCommunityContentSummary = (): PsychologistAnalyticsCommunities["content"] => ({
  posts: emptyCommunityContentTotals(),
  replies: emptyCommunityContentTotals(),
  whatsapp_clicks_by_content: COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => ({
    ...item,
    content_count: 0,
    whatsapp_clicks: 0,
  })),
});

export const emptyCommunityTopMentors = (): PsychologistAnalyticsCommunities["top_mentors"] => ({
  communities: [],
  message: "Você ainda não está no Top 5 de nenhuma comunidade.",
  source: "community_mentor_ranking+important_action_event",
  status: "not_in_top_5",
  whatsapp_clicks: 0,
});

export const formatCommunityTopMentorLabels = (
  communities: PsychologistAnalyticsCommunities["top_mentors"]["communities"],
) => {
  const labels = communities.map((community) => `${community.name} (#${community.position})`);

  if (labels.length <= 1) return labels[0] ?? "";

  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}`;
};

export const buildCommunityTopMentorsMessage = (
  totalCommunities: number,
  displayedCommunities: PsychologistAnalyticsCommunities["top_mentors"]["communities"],
) => {
  if (totalCommunities === 0) {
    return "Você ainda não está no Top 5 de nenhuma comunidade.";
  }

  const labels = formatCommunityTopMentorLabels(displayedCommunities);

  if (totalCommunities === 1) return `Você está no Top 5 em ${labels}.`;

  if (totalCommunities > displayedCommunities.length) {
    return `Você está no Top 5 em ${totalCommunities} comunidades, incluindo ${labels}.`;
  }

  return `Você está no Top 5 em ${totalCommunities} comunidades: ${labels}.`;
};

export const topMentorEligiblePsychologistWhere = (): Prisma.userWhereInput => ({
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
});

export const buildCommunityTopMentors = async (
  userId: string,
  communities: PsychologistCommunityReference[],
  whatsappClicks: number,
): Promise<PsychologistAnalyticsCommunities["top_mentors"]> => {
  const empty = {
    ...emptyCommunityTopMentors(),
    whatsapp_clicks: whatsappClicks,
  };

  if (communities.length === 0) return empty;

  const eligibleMentors = await prisma.user.findMany({
    where: topMentorEligiblePsychologistWhere(),
    select: {
      id: true,
    },
  });
  const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

  if (!eligibleMentorIds.includes(userId)) return empty;

  const rankedCommunities = (
    await Promise.all(
      communities.map(async (community) => {
        const ranking = await getCommunityMentorRankingSignals(community.id, eligibleMentorIds);
        const signal = ranking.get(userId);

        if (!signal || signal.position > TOP_MENTOR_COMMUNITIES_LIMIT) return null;

        return {
          id: community.id,
          name: community.name,
          position: signal.position,
          score: signal.score,
          slug: community.slug,
        };
      }),
    )
  )
    .filter(
      (
        community,
      ): community is PsychologistAnalyticsCommunities["top_mentors"]["communities"][number] =>
        community !== null,
    )
    .sort((a, b) => {
      const positionDiff = a.position - b.position;
      if (positionDiff !== 0) return positionDiff;

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const nameDiff = a.name.localeCompare(b.name, "pt-BR");
      if (nameDiff !== 0) return nameDiff;

      return a.id.localeCompare(b.id);
    });
  const displayedCommunities = rankedCommunities.slice(0, TOP_MENTOR_COMMUNITIES_LIMIT);

  return {
    communities: displayedCommunities,
    message: buildCommunityTopMentorsMessage(rankedCommunities.length, displayedCommunities),
    source: "community_mentor_ranking+important_action_event",
    status: rankedCommunities.length > 0 ? "in_top_5" : "not_in_top_5",
    whatsapp_clicks: whatsappClicks,
  };
};

export const isVideoCommunityContent = (mediaType: string | null) => mediaType === "video";

export const toCommunityContentBreakdownId = (
  contentType: "post" | "reply",
  mediaType: string | null,
): PsychologistAnalyticsCommunityContentBreakdownId => {
  const mediaSuffix = isVideoCommunityContent(mediaType) ? "with_video" : "without_video";

  return `${contentType}_${mediaSuffix}`;
};

export const toCommunityActivityDiagnosis = (
  totals: Pick<
    PsychologistAnalyticsCommunityActivityDiagnosis,
    "active_communities" | "total_posts" | "total_replies" | "total_whatsapp_clicks"
  >,
  participatingCommunities: number,
): PsychologistAnalyticsCommunityActivityDiagnosis => {
  const participationEvents = totals.total_posts + totals.total_replies;
  const score =
    totals.total_posts * 2 +
    totals.total_replies +
    totals.total_whatsapp_clicks * 3 +
    totals.active_communities * 2;

  if (participationEvents === 0 && totals.total_whatsapp_clicks === 0) {
    return {
      ...totals,
      description:
        participatingCommunities > 0
          ? "Você participa de comunidades, mas ainda não teve posts, respostas ou cliques de WhatsApp registrados neste período."
          : "Você ainda não segue comunidades nem tem participação comunitária registrada.",
      label: "Sem atividade recente",
      level: "none",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  if (score >= 18 || (totals.active_communities >= 3 && participationEvents >= 8)) {
    return {
      ...totals,
      description:
        "Sua presença nas comunidades está alta: há participação distribuída e sinais de interesse chegando ao WhatsApp.",
      label: "Alta atividade",
      level: "high",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  if (score >= 8 || totals.active_communities >= 2 || participationEvents >= 4) {
    return {
      ...totals,
      description:
        "Você mantém uma participação consistente. Responder com frequência e acompanhar comunidades com demanda pode ampliar seus contatos.",
      label: "Atividade consistente",
      level: "moderate",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  return {
    ...totals,
    description:
      "Sua presença comunitária ainda está inicial neste período. Priorize responder dúvidas recentes nas comunidades que você já acompanha.",
    label: "Atividade inicial",
    level: "low",
    score,
    source: COMMUNITY_ANALYTICS_SOURCE,
  };
};
