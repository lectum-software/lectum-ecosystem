import type {
  AdminTrafficRankingItem,
  AdminTrafficSummary,
} from "../../DTOs/IAdminTrafficSummaryDTO";
import type {
  IAdminTrafficRepository,
  TrafficPageViewRecord,
} from "../../repositories/interfaces/IAdminTrafficRepository";

import {
  averageTime,
  bounceRate,
  getVisitorIds,
  importantActionRate,
  metric,
  pagesPerSession,
  returnRate,
  returnVisitors,
  safePercentage,
  sessionKey,
  type TrafficStats,
  uniqueValues,
} from "./overview";

export const buildQuality = (current: TrafficStats, previous: TrafficStats) => {
  const currentAverageTime = averageTime(current);
  const previousAverageTime = averageTime(previous);
  const currentPagesPerSession = pagesPerSession(current);
  const previousPagesPerSession = pagesPerSession(previous);
  const currentBounceRate = bounceRate(current);
  const previousBounceRate = bounceRate(previous);
  const currentReturnRate = returnRate(current);
  const previousReturnRate = returnRate(previous);
  const currentImportantActionRate = importantActionRate(current);
  const previousImportantActionRate = importantActionRate(previous);
  const currentUniqueVisitors = getVisitorIds(current).size;
  const previousUniqueVisitors = getVisitorIds(previous).size;

  return {
    items: [
      metric({
        current: currentAverageTime.value,
        description: "Tempo médio por visualização com duração registrada.",
        id: "average_time",
        label: "Tempo médio na plataforma",
        previous: previousAverageTime.value,
        source: "page_view_event.duration_seconds",
        unavailable: currentAverageTime.unavailable,
        unavailableReason: currentAverageTime.unavailableReason,
        unit: "seconds",
      }),
      metric({
        current: currentPagesPerSession.value,
        description: "Visualizações por sessão com pelo menos uma página acessada.",
        id: "pages_per_session",
        label: "Páginas por sessão",
        previous: previousPagesPerSession.value,
        source: "page_view_event.session_id",
        unit: "decimal",
      }),
      metric({
        current: currentBounceRate.value,
        description: "Sessões com uma única visualização e sem ação importante.",
        id: "bounce_rate",
        label: "Taxa de rejeição",
        previous: previousBounceRate.value,
        source: "page_view_event+important_action_event",
        unavailable: currentBounceRate.unavailable,
        unavailableReason: currentBounceRate.unavailableReason,
        unit: "percentage",
      }),
      metric({
        current: currentReturnRate.value,
        description: "Visitantes com sessão anterior ou mais de uma sessão no período.",
        id: "return_rate",
        label: "Taxa de retorno",
        previous: previousReturnRate.value,
        source: "visitor_session",
        unit: "percentage",
      }),
      metric({
        current: safePercentage(returnVisitors(current).length, currentUniqueVisitors),
        description: "Participação de visitantes recorrentes entre visitantes únicos.",
        id: "recurring_users",
        label: "Usuários recorrentes",
        previous: safePercentage(returnVisitors(previous).length, previousUniqueVisitors),
        source: "visitor_session",
        unit: "percentage",
      }),
      metric({
        current: currentImportantActionRate.value,
        description: "Sessões com pelo menos uma ação importante registrada.",
        id: "important_action_sessions",
        label: "Sessões com ação importante",
        previous: previousImportantActionRate.value,
        source: "important_action_event.session_id",
        unavailable: currentImportantActionRate.unavailable,
        unavailableReason: currentImportantActionRate.unavailableReason,
        unit: "percentage",
      }),
    ],
    source: "page_view_event+important_action_event+visitor_session" as const,
  };
};

export const isPostPageView = (pageView: TrafficPageViewRecord) =>
  Boolean(
    pageView.target_id &&
      (pageView.page_kind === "community_post" ||
        pageView.target_type === "community_post" ||
        pageView.target_type === "post"),
  );

export type TrafficRankingTarget = "community" | "community_post" | "psychologist";

export const adminPathSegment = (value: string) => encodeURIComponent(value);

export const rankingPath = (targetType: TrafficRankingTarget, id: string) => {
  if (targetType === "community") return `/comunidades/${adminPathSegment(id)}`;
  if (targetType === "psychologist") return `/psicologos/${adminPathSegment(id)}`;

  return null;
};

export const targetRanking = (
  stats: TrafficStats,
  targetType: TrafficRankingTarget,
  labels: Map<string, string>,
  paths = new Map<string, string>(),
) => {
  const pageViews = stats.pageViews.filter((pageView) => {
    if (targetType === "community_post") return isPostPageView(pageView);

    return pageView.target_type === targetType && pageView.target_id;
  });
  const groups = new Map<string, { pageViews: number; sessionKeys: Set<string> }>();

  for (const pageView of pageViews) {
    const id = pageView.target_id!;
    const current = groups.get(id) ?? {
      pageViews: 0,
      sessionKeys: new Set<string>(),
    };
    current.pageViews += 1;
    current.sessionKeys.add(sessionKey(pageView));
    groups.set(id, current);
  }

  const totalSessions = uniqueValues(pageViews.map((pageView) => sessionKey(pageView))).length;

  return [...groups.entries()]
    .map<AdminTrafficRankingItem>(([id, group]) => ({
      count: group.pageViews,
      id,
      label: labels.get(id) ?? id,
      path: paths.get(id) ?? rankingPath(targetType, id),
      percentage: safePercentage(group.sessionKeys.size, totalSessions),
      sessions: group.sessionKeys.size,
    }))
    .sort((left, right) => right.sessions - left.sessions)
    .slice(0, 5);
};

export const buildRankings = async (repository: IAdminTrafficRepository, stats: TrafficStats) => {
  const communitySlugs = uniqueValues(
    stats.pageViews
      .filter((pageView) => pageView.target_type === "community" && pageView.target_id)
      .map((pageView) => pageView.target_id!),
  );
  const psychologistIds = uniqueValues(
    stats.pageViews
      .filter((pageView) => pageView.target_type === "psychologist" && pageView.target_id)
      .map((pageView) => pageView.target_id!),
  );
  const postIds = uniqueValues(
    stats.pageViews.filter(isPostPageView).map((pageView) => pageView.target_id!),
  );
  const [communities, psychologists, posts] = await Promise.all([
    repository.listCommunitiesBySlugs(communitySlugs),
    repository.listPsychologistsByIds(psychologistIds),
    repository.listPostsByIds(postIds),
  ]);
  const communityLabels = new Map(communities.map((community) => [community.slug, community.name]));
  const psychologistLabels = new Map(
    psychologists.map((psychologist) => [psychologist.id, psychologist.name]),
  );
  const postLabels = new Map(posts.map((post) => [post.id, post.title]));
  const postPaths = new Map(
    posts.map((post) => [
      post.id,
      `/comunidades/${adminPathSegment(post.community.slug)}/conteudo/post/${adminPathSegment(
        post.id,
      )}`,
    ]),
  );
  const communityItems = targetRanking(stats, "community", communityLabels);
  const postItems = targetRanking(stats, "community_post", postLabels, postPaths);
  const psychologistItems = targetRanking(stats, "psychologist", psychologistLabels);

  return {
    topCommunities: {
      items: communityItems,
      source: "page_view_event.target_type=community" as const,
      total: communityItems.reduce((sum, item) => sum + item.sessions, 0),
    },
    topPosts: {
      items: postItems,
      source: "page_view_event.page_kind=community_post" as const,
      total: postItems.reduce((sum, item) => sum + item.sessions, 0),
    },
    topPsychologists: {
      items: psychologistItems,
      source: "page_view_event.target_type=psychologist" as const,
      total: psychologistItems.reduce((sum, item) => sum + item.sessions, 0),
    },
  };
};

export const unavailableMetrics = (summary: Pick<AdminTrafficSummary, "locations" | "quality">) => {
  const unavailable = summary.quality.items
    .filter((item) => item.unavailable)
    .map((item) => ({
      description: item.unavailable_reason ?? item.description,
      id: item.id,
      label: item.label,
      source: item.source,
    }));

  if (summary.locations.total === 0) {
    unavailable.push({
      description: "Nenhuma localização aproximada foi identificada para o período.",
      id: "locations",
      label: "Localização",
      source: summary.locations.source,
    });
  }

  unavailable.push({
    description:
      "O uso em dispositivos diferentes não é associado automaticamente; cada dispositivo permanece separado.",
    id: "cross_device_attribution",
    label: "Uso em dispositivos diferentes",
    source: "visitor_id",
  });

  return unavailable;
};
