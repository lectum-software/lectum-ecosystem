import { hasSearchFilterTrafficParams as hasSearchFilterTrafficParamsFromPath } from "@/utils/analytics-traffic-path";

import {
  type AdminPsychologistWhatsappTrafficAction,
  type AdminPsychologistWhatsappTrafficCommunityPost,
  type AdminPsychologistWhatsappTrafficCommunityReply,
  type AdminPsychologistWhatsappTrafficOriginSource,
  type AdminPsychologistWhatsappTrafficOriginSourceId,
  type AdminPsychologistWhatsappTrafficPlatformMetric,
  roundOneDecimal,
} from "./subscription-conversion";

export const psychologistWhatsappTrafficOriginDefinitions: Array<
  Pick<AdminPsychologistWhatsappTrafficOriginSource, "description" | "id" | "label">
> = [
  {
    description: "Cliques realizados no CTA de WhatsApp dentro do perfil público do psicólogo.",
    id: "profile",
    label: "Perfil",
  },
  {
    description: "Cliques originados pela página de psicólogos e navegação pelos vídeos.",
    id: "explore",
    label: "Explorar",
  },
  {
    description:
      "Cliques originados após pesquisas de nome, especialidades, abordagem, convênio e demais filtros.",
    id: "search_filters",
    label: "Busca e filtros",
  },
  {
    description:
      "Cliques originados na área de psicólogos favoritos de usuários que já favoritaram perfis antes.",
    id: "favorites",
    label: "Favoritos",
  },
  {
    description: "Cliques em CTAs de posts profissionais com vídeo nas comunidades.",
    id: "community_post_video",
    label: "Comunidades · Posts com vídeo",
  },
  {
    description: "Cliques em CTAs de posts profissionais sem vídeo nas comunidades.",
    id: "community_post_text",
    label: "Comunidades · Posts sem vídeo",
  },
  {
    description: "Cliques em CTAs de respostas profissionais com vídeo nas comunidades.",
    id: "community_reply_video",
    label: "Comunidades · Respostas com vídeo",
  },
  {
    description: "Cliques em CTAs de respostas profissionais sem vídeo nas comunidades.",
    id: "community_reply_text",
    label: "Comunidades · Respostas sem vídeo",
  },
  {
    description: "Cliques originados pela navegação do Ranking Top Mentores.",
    id: "community_top_mentors",
    label: "Comunidades · Ranking Top Mentores",
  },
];

export const WHATSAPP_TRAFFIC_DEFINITION_INDEX = new Map(
  psychologistWhatsappTrafficOriginDefinitions.map((definition, index) => [definition.id, index]),
);

export const WHATSAPP_TRAFFIC_CLICK_ACTOR_BREAKDOWN_SOURCE =
  "important_action_event.user_id+community_post.author_id+post_reply.author_id" as const;

export const COMMUNITY_CONTENT_WHATSAPP_TRAFFIC_SOURCE_IDS =
  new Set<AdminPsychologistWhatsappTrafficOriginSourceId>([
    "community_post_text",
    "community_post_video",
    "community_reply_text",
    "community_reply_video",
  ]);

export const hasSearchFilterTrafficParams = hasSearchFilterTrafficParamsFromPath;

export const normalizeTrafficActionPath = (path: string | null) => (path ?? "").toLowerCase();

export const trafficActionPathIncludes = (
  action: AdminPsychologistWhatsappTrafficAction,
  value: string,
) => normalizeTrafficActionPath(action.path).includes(value);

export const isCommunityPostTarget = (targetType: string | null) =>
  targetType === "community_post" || targetType === "post";

export const isCommunityReplyTarget = (targetType: string | null) =>
  targetType === "post_reply" || targetType === "reply";

export const hasVideoMedia = (
  record:
    | AdminPsychologistWhatsappTrafficCommunityPost
    | AdminPsychologistWhatsappTrafficCommunityReply
    | null
    | undefined,
) => {
  if (!record) return false;
  if (record.media_type === "video") return true;

  return (
    "media_items" in record &&
    (record.media_items?.some((item) => item.media_type === "video") ?? false)
  );
};

export const resolveWhatsappTrafficPsychologistId = (
  action: AdminPsychologistWhatsappTrafficAction,
  postsById: Map<string, AdminPsychologistWhatsappTrafficCommunityPost>,
  repliesById: Map<string, AdminPsychologistWhatsappTrafficCommunityReply>,
) => {
  const targetId = action.target_id;
  const targetType = action.target_type;

  if (targetType === "psychologist" && targetId) return targetId;
  if (targetId && isCommunityPostTarget(targetType))
    return postsById.get(targetId)?.author_id ?? null;
  if (targetId && isCommunityReplyTarget(targetType)) {
    return repliesById.get(targetId)?.author_id ?? null;
  }

  return null;
};

export const isCommunityContentWhatsappTrafficSource = (
  sourceId: AdminPsychologistWhatsappTrafficOriginSourceId,
) => COMMUNITY_CONTENT_WHATSAPP_TRAFFIC_SOURCE_IDS.has(sourceId);

export const resolveWhatsappTrafficContentAuthorId = (
  sourceId: AdminPsychologistWhatsappTrafficOriginSourceId,
  action: AdminPsychologistWhatsappTrafficAction,
  postsById: Map<string, AdminPsychologistWhatsappTrafficCommunityPost>,
  repliesById: Map<string, AdminPsychologistWhatsappTrafficCommunityReply>,
) => {
  const targetId = action.target_id;
  if (!targetId) return null;

  if (sourceId === "community_post_text" || sourceId === "community_post_video") {
    return postsById.get(targetId)?.author_id ?? null;
  }

  if (sourceId === "community_reply_text" || sourceId === "community_reply_video") {
    return repliesById.get(targetId)?.author_id ?? null;
  }

  return null;
};

export const classifyWhatsappTrafficAction = (
  action: AdminPsychologistWhatsappTrafficAction,
  postsById: Map<string, AdminPsychologistWhatsappTrafficCommunityPost>,
  repliesById: Map<string, AdminPsychologistWhatsappTrafficCommunityReply>,
): AdminPsychologistWhatsappTrafficOriginSourceId | null => {
  const targetId = action.target_id;
  const targetType = action.target_type;

  if (
    trafficActionPathIncludes(action, "/community/top-mentors") ||
    trafficActionPathIncludes(action, "/comunidades/top-mentores")
  ) {
    return "community_top_mentors";
  }

  if (targetId && isCommunityPostTarget(targetType)) {
    return hasVideoMedia(postsById.get(targetId)) ? "community_post_video" : "community_post_text";
  }

  if (targetId && isCommunityReplyTarget(targetType)) {
    return hasVideoMedia(repliesById.get(targetId))
      ? "community_reply_video"
      : "community_reply_text";
  }

  if (
    trafficActionPathIncludes(action, "/favorites") ||
    trafficActionPathIncludes(action, "/favoritos")
  ) {
    return "favorites";
  }

  if (action.page_kind === "psychologist_profile") return "profile";

  if (action.page_kind === "psychologists" && hasSearchFilterTrafficParams(action.path)) {
    return "search_filters";
  }

  if (
    action.action_type === "psychologist_video_whatsapp_click" ||
    action.page_kind === "psychologists"
  ) {
    return "explore";
  }

  return null;
};

export const summarizePsychologistWhatsappTrafficOrigins = (params: {
  actions: AdminPsychologistWhatsappTrafficAction[];
  allowedPsychologistIds?: Set<string> | null;
  communityPlatformMetrics?: Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  > | null;
  platformMetricsConsideredCounts?: Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    number
  > | null;
  communityPosts: AdminPsychologistWhatsappTrafficCommunityPost[];
  communityReplies: AdminPsychologistWhatsappTrafficCommunityReply[];
}) => {
  const postsById = new Map(params.communityPosts.map((post) => [post.id, post]));
  const repliesById = new Map(params.communityReplies.map((reply) => [reply.id, reply]));
  const groups = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    {
      authorClicks: number;
      otherUsersClicks: number;
      sessions: Set<string>;
      whatsappClicks: number;
    }
  >(
    psychologistWhatsappTrafficOriginDefinitions.map((source) => [
      source.id,
      { authorClicks: 0, otherUsersClicks: 0, sessions: new Set<string>(), whatsappClicks: 0 },
    ]),
  );

  for (const action of params.actions) {
    const sourceId = classifyWhatsappTrafficAction(action, postsById, repliesById);
    if (!sourceId) continue;

    if (params.allowedPsychologistIds) {
      const psychologistId = resolveWhatsappTrafficPsychologistId(action, postsById, repliesById);
      if (!psychologistId || !params.allowedPsychologistIds.has(psychologistId)) continue;
    }

    const group = groups.get(sourceId);
    if (!group) continue;

    group.whatsappClicks += 1;
    group.sessions.add(action.session_id);

    if (isCommunityContentWhatsappTrafficSource(sourceId)) {
      const authorId = resolveWhatsappTrafficContentAuthorId(
        sourceId,
        action,
        postsById,
        repliesById,
      );

      if (action.user_id && authorId && action.user_id === authorId) {
        group.authorClicks += 1;
      } else {
        group.otherUsersClicks += 1;
      }
    }
  }

  const totalWhatsappClicks = [...groups.values()].reduce(
    (sum, group) => sum + group.whatsappClicks,
    0,
  );
  const totalSessions = new Set(
    [...groups.values()].flatMap((group) => [...group.sessions.values()]),
  ).size;
  const maxWhatsappClicks = Math.max(
    0,
    ...[...groups.values()].map((group) => group.whatsappClicks),
  );
  const primarySourceId =
    totalWhatsappClicks > 0
      ? (psychologistWhatsappTrafficOriginDefinitions.find(
          (definition) => (groups.get(definition.id)?.whatsappClicks ?? 0) === maxWhatsappClicks,
        )?.id ?? null)
      : null;
  const updatedAt =
    params.actions.length > 0
      ? params.actions.reduce<Date | null>(
          (latest, action) =>
            !latest || action.occurred_at > latest ? action.occurred_at : latest,
          null,
        )
      : null;

  const sources = psychologistWhatsappTrafficOriginDefinitions
    .map((definition) => {
      const group = groups.get(definition.id);
      const whatsappClicks = group?.whatsappClicks ?? 0;
      const whatsappClickActorBreakdown = isCommunityContentWhatsappTrafficSource(definition.id)
        ? {
            author_clicks: group?.authorClicks ?? 0,
            author_percentage:
              whatsappClicks > 0
                ? roundOneDecimal(((group?.authorClicks ?? 0) / whatsappClicks) * 100)
                : 0,
            other_users_clicks: group?.otherUsersClicks ?? 0,
            other_users_percentage:
              whatsappClicks > 0
                ? roundOneDecimal(((group?.otherUsersClicks ?? 0) / whatsappClicks) * 100)
                : 0,
            source: WHATSAPP_TRAFFIC_CLICK_ACTOR_BREAKDOWN_SOURCE,
          }
        : null;

      return {
        ...definition,
        badge: definition.id === primarySourceId ? ("primary_source" as const) : null,
        considered_count: params.platformMetricsConsideredCounts?.get(definition.id) ?? null,
        conversion_rate: null,
        percentage:
          totalWhatsappClicks > 0
            ? roundOneDecimal((whatsappClicks / totalWhatsappClicks) * 100)
            : 0,
        platform_metrics: params.communityPlatformMetrics?.get(definition.id) ?? null,
        profile_views: 0,
        sessions: group?.sessions.size ?? 0,
        whatsapp_click_actor_breakdown: whatsappClickActorBreakdown,
        whatsapp_clicks: whatsappClicks,
      };
    })
    .sort((left, right) => {
      if (right.whatsapp_clicks !== left.whatsapp_clicks) {
        return right.whatsapp_clicks - left.whatsapp_clicks;
      }

      return (
        (WHATSAPP_TRAFFIC_DEFINITION_INDEX.get(left.id) ?? 0) -
        (WHATSAPP_TRAFFIC_DEFINITION_INDEX.get(right.id) ?? 0)
      );
    });

  return {
    attribution_unavailable_reason:
      "A origem considera cliques de WhatsApp registrados; cliques sem informações de atribuição não entram nesta tabela.",
    description: "Entenda em quais superfícies os pacientes clicam no WhatsApp dos psicólogos.",
    sources,
    total_profile_views: 0,
    total_sessions: totalSessions,
    unavailable_reason:
      totalWhatsappClicks > 0
        ? null
        : "Nenhum clique de WhatsApp com origem identificada foi registrado no período.",
    updated_at: updatedAt,
  };
};
