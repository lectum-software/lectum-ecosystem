import {
  psychologistTrafficOriginDefinitions,
  summarizePsychologistWhatsappTrafficOrigins,
  trafficOriginFromPageViewSource,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistStatisticsDTO,
  AdminPsychologistTrafficQualityLevelId,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import type { AdminPsychologistEngagementRepository } from "../../repositories/AdminPsychologistEngagementRepository";
import {
  roundPercent,
  safePercentage,
  TRAFFIC_QUALITY_LEVEL_CONFIG,
  TRAFFIC_QUALITY_LEVEL_ORDER,
  TRAFFIC_QUALITY_SOURCE,
} from "./business-content";
import type {
  CommunityTrafficPlatformMetricDataset,
  ProfileTrafficPlatformMetricDataset,
  WhatsappTrafficActions,
} from "./community-traffic";
import { buildTrafficPlatformMetrics } from "./profile-traffic";

export const buildTrafficSources = (params: {
  actions: WhatsappTrafficActions;
  communityDataset: CommunityTrafficPlatformMetricDataset;
  profile: { user: { id: string }; user_id: string; video_url: string | null };
  profileDataset: ProfileTrafficPlatformMetricDataset;
}): AdminPsychologistStatisticsDTO["traffic_sources"] => {
  const trafficPlatformMetrics = buildTrafficPlatformMetrics({
    communityDataset: params.communityDataset,
    profile: params.profile,
    profileDataset: params.profileDataset,
  });
  const summary = summarizePsychologistWhatsappTrafficOrigins({
    actions: params.actions,
    allowedPsychologistIds: new Set([params.profile.user.id]),
    communityPlatformMetrics: trafficPlatformMetrics.metrics,
    platformMetricsConsideredCounts: trafficPlatformMetrics.consideredCounts,
    communityPosts: params.communityDataset.posts,
    communityReplies: params.communityDataset.replies,
  });

  return {
    ...summary,
    description:
      "Entenda em quais superfícies os pacientes clicam no WhatsApp deste psicólogo e veja a somatória de engajamento por origem.",
    source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click",
  };
};

export type TrafficQualityPageView = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listPublicProfilePageViews"]>
>[number];

export type TrafficQualityProfileView = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listProfileViews"]>
>[number];

export type TrafficQualityFavorite = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listFavorites"]>
>[number];

export type TrafficQualityWhatsappClick = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listWhatsappClicks"]>
>[number];

export type TrafficQualityImportantWhatsappAction = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listImportantPsychologistWhatsappActions"]>
>[number];

export type TrafficQualityActorOrigin = {
  favorites: number;
  originId: string;
  profileViews: number;
  sessions: Set<string>;
  whatsappSignals: number;
};

export const TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN = {
  description: "Sinais sem informações suficientes para atribuir o contato a um canal de origem.",
  id: "unattributed",
  label: "Origem não atribuída",
} as const;

export const trafficQualityOriginDefinitions = [
  ...psychologistTrafficOriginDefinitions,
  TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN,
];

export const actorKeyFromTrafficEvent = (event: {
  session_id?: string | null;
  user_id?: string | null;
  visitor_id?: string | null;
}) => {
  if (event.user_id) return `user:${event.user_id}`;
  if (event.visitor_id) return `visitor:${event.visitor_id}`;
  if (event.session_id) return `session:${event.session_id}`;

  return null;
};

export const actorKeyFromProfileView = (event: {
  device_id?: string | null;
  viewer_id?: string | null;
}) => {
  if (event.viewer_id) return `user:${event.viewer_id}`;
  if (event.device_id) return `device:${event.device_id}`;

  return null;
};

export const trafficQualityOriginLabel = (originId: string) =>
  trafficQualityOriginDefinitions.find((definition) => definition.id === originId)?.label ??
  "Origem não atribuída";

export const buildTrafficQuality = (params: {
  favorites: TrafficQualityFavorite[];
  importantWhatsappActions: TrafficQualityImportantWhatsappAction[];
  pageViews: TrafficQualityPageView[];
  profileViews: TrafficQualityProfileView[];
  whatsappClicks: TrafficQualityWhatsappClick[];
}): AdminPsychologistStatisticsDTO["traffic_quality"] => {
  const groups = new Map<string, TrafficQualityActorOrigin>();
  const originsByActor = new Map<string, Set<string>>();

  const getGroup = (actorKey: string, originId: string) => {
    const key = `${actorKey}:${originId}`;
    const current = groups.get(key);
    if (current) return current;

    const next: TrafficQualityActorOrigin = {
      favorites: 0,
      originId,
      profileViews: 0,
      sessions: new Set<string>(),
      whatsappSignals: 0,
    };
    groups.set(key, next);

    if (!originsByActor.has(actorKey)) originsByActor.set(actorKey, new Set());
    originsByActor.get(actorKey)?.add(originId);

    return next;
  };

  const getOriginIdsForActor = (actorKey: string) => {
    const origins = originsByActor.get(actorKey);
    if (origins && origins.size > 0) return [...origins];

    return [TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN.id];
  };

  for (const pageView of params.pageViews) {
    const actorKey = actorKeyFromTrafficEvent(pageView);
    if (!actorKey) continue;

    const originId = trafficOriginFromPageViewSource(pageView.traffic_source);
    const group = getGroup(actorKey, originId);
    group.profileViews += 1;
    group.sessions.add(pageView.session_id);
  }

  for (const profileView of params.profileViews) {
    const actorKey = actorKeyFromProfileView(profileView);
    if (!actorKey) continue;

    for (const originId of getOriginIdsForActor(actorKey)) {
      const group = getGroup(actorKey, originId);
      if (group.profileViews === 0) group.profileViews += 1;
    }
  }

  for (const favorite of params.favorites) {
    const actorKey = `user:${favorite.user_id}`;

    for (const originId of getOriginIdsForActor(actorKey)) {
      getGroup(actorKey, originId).favorites += 1;
    }
  }

  for (const action of params.importantWhatsappActions) {
    const actorKey = actorKeyFromTrafficEvent(action);
    if (!actorKey) continue;

    for (const originId of getOriginIdsForActor(actorKey)) {
      getGroup(actorKey, originId).whatsappSignals += 1;
    }
  }

  let attributedWhatsappClicks = 0;

  params.whatsappClicks.forEach((click, index) => {
    const actorKey = click.user_id ? `user:${click.user_id}` : `contact:${index}`;
    const originIds = getOriginIdsForActor(actorKey);
    const hasAttributedOrigin = originIds.some(
      (originId) => originId !== TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN.id,
    );

    if (hasAttributedOrigin) attributedWhatsappClicks += 1;

    for (const originId of originIds) {
      getGroup(actorKey, originId).whatsappSignals += 1;
    }
  });

  const flowCounts = new Map<string, number>();
  const qualityCounts = new Map<AdminPsychologistTrafficQualityLevelId, number>(
    TRAFFIC_QUALITY_LEVEL_ORDER.map((id) => [id, 0]),
  );
  const originActorCounts = new Map<string, number>();
  const originProfileViews = new Map<string, number>();
  const originQualifiedActors = new Map<string, number>();

  for (const group of groups.values()) {
    const qualityId: AdminPsychologistTrafficQualityLevelId =
      group.whatsappSignals > 0
        ? "qualified"
        : group.favorites > 0 || group.profileViews > 1
          ? "interested"
          : group.profileViews > 0
            ? "visited"
            : "unidentified";
    const flowKey = `${group.originId}_${qualityId}`;

    flowCounts.set(flowKey, (flowCounts.get(flowKey) ?? 0) + 1);
    qualityCounts.set(qualityId, (qualityCounts.get(qualityId) ?? 0) + 1);
    originActorCounts.set(group.originId, (originActorCounts.get(group.originId) ?? 0) + 1);
    originProfileViews.set(
      group.originId,
      (originProfileViews.get(group.originId) ?? 0) + group.profileViews,
    );
    if (qualityId === "qualified") {
      originQualifiedActors.set(
        group.originId,
        (originQualifiedActors.get(group.originId) ?? 0) + 1,
      );
    }
  }

  const totalActors = [...originActorCounts.values()].reduce((sum, count) => sum + count, 0);
  const totalProfileViews = params.pageViews.length || params.profileViews.length;
  const totalWhatsappClicks = params.whatsappClicks.length;
  const qualityLevels = TRAFFIC_QUALITY_LEVEL_ORDER.map((id) => {
    const count = qualityCounts.get(id) ?? 0;

    return {
      count,
      description: TRAFFIC_QUALITY_LEVEL_CONFIG[id].description,
      id,
      label: TRAFFIC_QUALITY_LEVEL_CONFIG[id].label,
      percentage: safePercentage(count, totalActors),
    };
  });
  const origins = trafficQualityOriginDefinitions
    .map((definition) => {
      const actors = originActorCounts.get(definition.id) ?? 0;

      return {
        actors,
        id: definition.id,
        label: definition.label,
        percentage: safePercentage(actors, totalActors),
        profile_views: originProfileViews.get(definition.id) ?? 0,
        qualified_actors: originQualifiedActors.get(definition.id) ?? 0,
      };
    })
    .filter((origin) => origin.actors > 0 || origin.profile_views > 0);
  const predominantQuality =
    [...qualityLevels].sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return right.percentage - left.percentage;
    })[0] ?? null;
  const primaryQualifiedOrigin =
    [...origins]
      .filter((origin) => origin.qualified_actors > 0)
      .sort((left, right) => {
        if (right.qualified_actors !== left.qualified_actors) {
          return right.qualified_actors - left.qualified_actors;
        }

        return right.profile_views - left.profile_views;
      })[0] ?? null;

  return {
    absorption_rate:
      totalProfileViews > 0 ? roundPercent((totalWhatsappClicks / totalProfileViews) * 100) : null,
    attributed_whatsapp_clicks: Math.min(attributedWhatsappClicks, totalWhatsappClicks),
    attribution_note:
      "O total de contatos considera solicitações registradas; a origem usa as informações de navegação disponíveis.",
    flows: trafficQualityOriginDefinitions
      .flatMap((origin) =>
        TRAFFIC_QUALITY_LEVEL_ORDER.map((qualityId) => {
          const count = flowCounts.get(`${origin.id}_${qualityId}`) ?? 0;

          return {
            count,
            id: `${origin.id}_${qualityId}` as const,
            origin_id: origin.id,
            origin_label: trafficQualityOriginLabel(origin.id),
            percentage: safePercentage(count, totalActors),
            quality_id: qualityId,
            quality_label: TRAFFIC_QUALITY_LEVEL_CONFIG[qualityId].label,
          };
        }),
      )
      .filter((flow) => flow.count > 0),
    origins,
    predominant_quality: predominantQuality?.count ? predominantQuality : null,
    primary_qualified_origin: primaryQualifiedOrigin,
    quality_levels: qualityLevels,
    source: TRAFFIC_QUALITY_SOURCE,
    total_actors: totalActors,
    total_profile_views: totalProfileViews,
    total_whatsapp_clicks: totalWhatsappClicks,
    unattributed_whatsapp_clicks: Math.max(
      0,
      totalWhatsappClicks - Math.min(attributedWhatsappClicks, totalWhatsappClicks),
    ),
    unavailable_reason:
      totalActors > 0
        ? null
        : "Nenhum acesso com origem identificada foi encontrado para este psicólogo no período.",
  };
};
