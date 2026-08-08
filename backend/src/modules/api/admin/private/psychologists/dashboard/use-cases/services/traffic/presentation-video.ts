import {
  type AdminPsychologistWhatsappTrafficOriginSourceId,
  type AdminPsychologistWhatsappTrafficPlatformMetric,
  hasSearchFilterTrafficParams,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { buildCommunityTrafficPlatformMetrics, roundTrafficMetricPercent } from "./community";
import { buildProfileTrafficPlatformMetrics, hasProfileTrafficVideoViewSignal } from "./profile";

type PresentationVideoTrafficPlatformMetricSourceId = Extract<
  AdminPsychologistWhatsappTrafficOriginSourceId,
  "explore" | "search_filters"
>;

const PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS: PresentationVideoTrafficPlatformMetricSourceId[] =
  ["explore", "search_filters"];

export const PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION = "psychologist_video_profile_access";

export const PRESENTATION_VIDEO_FAVORITE_ACTION = "psychologist_video_favorite";

export const PRESENTATION_VIDEO_SHARE_ACTION = "psychologist_video_share";

const PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_video_watch_session+important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share";

const buildPresentationVideoTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

const buildPresentationVideoTrafficPlatformMetrics = (
  profiles: AdminPsychologistProfileRecord[],
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
) => {
  const videoProfileIds = new Set(
    profiles
      .filter((profile) => profile.published && Boolean(profile.video_url?.trim()))
      .map((profile) => profile.user.id),
  );
  const videoCount = videoProfileIds.size;
  const noVideoReason =
    "Sem vídeos de apresentação publicados no segmento até o fim do período selecionado.";
  const countUnavailableReason = videoCount > 0 ? null : noVideoReason;
  const averagePerVideo = (total: number) =>
    videoCount > 0 ? roundTrafficMetricPercent(total / videoCount) : null;
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      videoProfileIds.has(session.psychologist_id) &&
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
      ? roundTrafficMetricPercent(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;
  const averageStaySeconds =
    videoStaySeconds.length > 0
      ? roundTrafficMetricPercent(
          videoStaySeconds.reduce((total, value) => total + value, 0) / videoStaySeconds.length,
        )
      : null;
  const replayRate =
    videoWatchSessions.length > 0
      ? roundTrafficMetricPercent(
          (videoWatchSessions.filter((session) => session.replay_count > 0).length /
            videoWatchSessions.length) *
            100,
        )
      : null;
  const videoActions = dataset.videoActions.filter(
    (event) =>
      event.target_id &&
      videoProfileIds.has(event.target_id) &&
      (!event.user_id || event.user_id !== event.target_id),
  );
  const videoActionsBySource = new Map<
    PresentationVideoTrafficPlatformMetricSourceId,
    Map<string, number>
  >(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      new Map<string, number>(),
    ]),
  );
  for (const event of videoActions) {
    const sourceId: PresentationVideoTrafficPlatformMetricSourceId = hasSearchFilterTrafficParams(
      event.path,
    )
      ? "search_filters"
      : "explore";
    const sourceTotals = videoActionsBySource.get(sourceId);
    if (!sourceTotals) continue;

    sourceTotals.set(event.action_type, (sourceTotals.get(event.action_type) ?? 0) + 1);
  }
  const sourceUnavailableReason = (metricUnavailableReason: string) =>
    videoCount <= 0 ? noVideoReason : metricUnavailableReason;

  const metrics = new Map<
    PresentationVideoTrafficPlatformMetricSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => {
      const actionTotals = videoActionsBySource.get(sourceId) ?? new Map<string, number>();
      const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildPresentationVideoTrafficPlatformMetric({
          id: "views",
          label: "Visualizações",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(videoWatchSessions.length),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_retention",
          label: "Retenção",
          unavailable_reason:
            averageRetention === null
              ? sourceUnavailableReason(
                  "Sem sessões reais do vídeo de apresentação com duração no período.",
                )
              : null,
          unit: "percentage",
          value: averageRetention,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_visibility",
          label: "Tempo de permanência",
          unavailable_reason:
            averageStaySeconds === null
              ? sourceUnavailableReason("Sem sessões reais do vídeo de apresentação no período.")
              : null,
          unit: "seconds",
          value: averageStaySeconds,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "replay_rate",
          label: "Taxa de replay",
          unavailable_reason:
            replayRate === null
              ? sourceUnavailableReason("Sem sessões reais do vídeo de apresentação no período.")
              : null,
          unit: "percentage",
          value: replayRate,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "profile_accesses",
          label: "Acessos ao perfil",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "favorites",
          label: "Favoritado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_FAVORITE_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "shares",
          label: "Compartilhado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_SHARE_ACTION) ?? 0),
        }),
      ];

      return [sourceId, metrics];
    }),
  );

  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [sourceId, videoCount]),
  );

  return { consideredCounts, metrics };
};

export const buildTrafficPlatformMetrics = (params: {
  communityDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  profileDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profiles: AdminPsychologistProfileRecord[];
}) => {
  const community = buildCommunityTrafficPlatformMetrics(params.communityDataset);
  const profile = buildProfileTrafficPlatformMetrics(params.profiles, params.profileDataset);
  const presentationVideo = buildPresentationVideoTrafficPlatformMetrics(
    params.profiles,
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
