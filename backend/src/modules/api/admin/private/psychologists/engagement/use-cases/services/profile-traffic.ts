import type {
  AdminPsychologistWhatsappTrafficOriginSourceId,
  AdminPsychologistWhatsappTrafficPlatformMetric,
} from "@/utils/admin-psychologist-analytics";
import {
  hasSearchFilterTrafficParams,
  roundOneDecimal,
} from "@/utils/admin-psychologist-analytics";

import {
  buildCommunityTrafficPlatformMetrics,
  buildTrafficPlatformMetric,
  type CommunityTrafficPlatformMetricDataset,
  PRESENTATION_VIDEO_FAVORITE_ACTION,
  PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION,
  PRESENTATION_VIDEO_SHARE_ACTION,
  PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE,
  PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE,
  PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION,
  PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION,
  type ProfileTrafficPlatformMetricDataset,
} from "./community-traffic";

export const buildProfileTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
) => buildTrafficPlatformMetric(PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE, metric);

export const hasProfileTrafficVideoViewSignal = (
  session: ProfileTrafficPlatformMetricDataset["videoWatchSessions"][number],
) =>
  session.watched_seconds > 0 ||
  session.max_position_seconds > 0 ||
  session.completed ||
  session.milestone_100;

export const buildProfileTrafficPlatformMetrics = (
  dataset: ProfileTrafficPlatformMetricDataset,
) => {
  const pageViewDurations = dataset.pageViews.flatMap((view) => {
    if (!view.target_id) return [];
    if (view.user_id && view.user_id === view.target_id) return [];
    if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

    return [view.duration_seconds];
  });
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
      hasProfileTrafficVideoViewSignal(session),
  );
  const retentionSamples = videoWatchSessions.flatMap((session) => {
    if (session.duration_seconds <= 0) return [];

    return [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)];
  });
  const publicationTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION &&
      event.target_id &&
      event.user_id !== event.target_id,
  );
  const reviewsTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
      event.target_id &&
      event.user_id !== event.target_id,
  );
  const totalDuration = pageViewDurations.reduce((total, value) => total + value, 0);
  const averageRetention =
    retentionSamples.length > 0
      ? roundOneDecimal(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;

  const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
    buildProfileTrafficPlatformMetric({
      id: "profile_openings",
      label: "Aberturas de perfil",
      unit: "count",
      value: dataset.profileViews.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_stay_time",
      label: "Tempo de permanência",
      unit: "seconds",
      value: totalDuration,
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_views",
      label: "Views do vídeo de apresentação",
      unit: "count",
      value: videoWatchSessions.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_retention",
      label: "Retenção",
      unavailable_reason:
        averageRetention === null
          ? "Sem sessões do vídeo de apresentação com duração no período."
          : null,
      unit: "percentage",
      value: averageRetention,
    }),
    buildProfileTrafficPlatformMetric({
      id: "favorites",
      label: "Favoritado",
      unit: "count",
      value: dataset.favorites.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_publications_tab_opens",
      label: "Abertura da aba Publicações",
      unit: "count",
      value: publicationTabOpens.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_reviews_tab_opens",
      label: "Abertura da aba Avaliações",
      unit: "count",
      value: reviewsTabOpens.length,
    }),
  ];

  return { consideredCount: 1, metrics };
};

export const buildPresentationVideoTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
) => buildTrafficPlatformMetric(PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE, metric);

export const buildPresentationVideoTrafficPlatformMetrics = (
  profile: { user_id: string; video_url: string | null },
  dataset: ProfileTrafficPlatformMetricDataset,
) => {
  const videoCount = profile.video_url?.trim() ? 1 : 0;
  const noVideoReason = "Sem vídeo de apresentação publicado até o fim do período selecionado.";
  const countUnavailableReason = videoCount > 0 ? null : noVideoReason;
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      session.psychologist_id === profile.user_id &&
      (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
      hasProfileTrafficVideoViewSignal(session),
  );
  const retentionSamples = videoWatchSessions.flatMap((session) => {
    if (session.duration_seconds <= 0) return [];

    return [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)];
  });
  const videoStaySeconds = videoWatchSessions.map((session) =>
    Math.max(0, session.watched_seconds),
  );
  const averageRetention =
    retentionSamples.length > 0
      ? roundOneDecimal(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;
  const totalStaySeconds = roundOneDecimal(
    videoStaySeconds.reduce((total, value) => total + value, 0),
  );
  const replayRate =
    videoWatchSessions.length > 0
      ? roundOneDecimal(
          (videoWatchSessions.filter((session) => session.replay_count > 0).length /
            videoWatchSessions.length) *
            100,
        )
      : null;
  const videoActions = dataset.videoActions.filter(
    (event) =>
      event.target_id &&
      event.target_id === profile.user_id &&
      (!event.user_id || event.user_id !== event.target_id),
  );
  const videoActionsBySource = new Map<
    Extract<AdminPsychologistWhatsappTrafficOriginSourceId, "explore" | "search_filters">,
    Map<string, number>
  >([
    ["explore", new Map<string, number>()],
    ["search_filters", new Map<string, number>()],
  ]);

  for (const event of videoActions) {
    const sourceId = hasSearchFilterTrafficParams(event.path) ? "search_filters" : "explore";
    const sourceTotals = videoActionsBySource.get(sourceId);
    if (!sourceTotals) continue;

    sourceTotals.set(event.action_type, (sourceTotals.get(event.action_type) ?? 0) + 1);
  }

  const sourceUnavailableReason = (metricUnavailableReason: string) =>
    videoCount <= 0 ? noVideoReason : metricUnavailableReason;
  const countValue = (value: number) => (videoCount > 0 ? value : null);

  const metrics = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    (["explore", "search_filters"] as const).map((sourceId) => {
      const actionTotals = videoActionsBySource.get(sourceId) ?? new Map<string, number>();
      const sourceMetrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildPresentationVideoTrafficPlatformMetric({
          id: "views",
          label: "Visualizações",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(videoWatchSessions.length),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_retention",
          label: "Retenção",
          unavailable_reason:
            averageRetention === null
              ? sourceUnavailableReason(
                  "Sem sessões do vídeo de apresentação com duração no período.",
                )
              : null,
          unit: "percentage",
          value: averageRetention,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_visibility",
          label: "Tempo de permanência",
          unavailable_reason:
            videoStaySeconds.length === 0
              ? sourceUnavailableReason("Sem sessões do vídeo de apresentação no período.")
              : null,
          unit: "seconds",
          value: videoCount > 0 ? totalStaySeconds : null,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "replay_rate",
          label: "Taxa de replay",
          unavailable_reason:
            replayRate === null
              ? sourceUnavailableReason("Sem sessões do vídeo de apresentação no período.")
              : null,
          unit: "percentage",
          value: replayRate,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "profile_accesses",
          label: "Acessos ao perfil",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "favorites",
          label: "Favoritado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_FAVORITE_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "shares",
          label: "Compartilhado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_SHARE_ACTION) ?? 0),
        }),
      ];

      return [sourceId, sourceMetrics];
    }),
  );
  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>([
    ["explore", videoCount],
    ["search_filters", videoCount],
  ]);

  return { consideredCounts, metrics };
};

export const buildTrafficPlatformMetrics = (params: {
  communityDataset: CommunityTrafficPlatformMetricDataset;
  profile: { user_id: string; video_url: string | null };
  profileDataset: ProfileTrafficPlatformMetricDataset;
}) => {
  const community = buildCommunityTrafficPlatformMetrics(params.communityDataset);
  const profile = buildProfileTrafficPlatformMetrics(params.profileDataset);
  const presentationVideo = buildPresentationVideoTrafficPlatformMetrics(
    params.profile,
    params.profileDataset,
  );
  const metrics = new Map(community.metrics);
  const consideredCounts = new Map(community.consideredCounts);

  metrics.set("profile", profile.metrics);
  consideredCounts.set("profile", profile.consideredCount);
  for (const [sourceId, sourceMetrics] of presentationVideo.metrics) {
    metrics.set(sourceId, sourceMetrics);
  }
  for (const [sourceId, consideredCount] of presentationVideo.consideredCounts) {
    consideredCounts.set(sourceId, consideredCount);
  }

  return { consideredCounts, metrics };
};
