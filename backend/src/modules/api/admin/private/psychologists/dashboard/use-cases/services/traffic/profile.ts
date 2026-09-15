import type { AdminPsychologistWhatsappTrafficPlatformMetric } from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { roundTrafficMetricPercent } from "./community";

export const PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION =
  "psychologist_profile_publications_tab_open";

export const PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION = "psychologist_profile_reviews_tab_open";

const PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_view_event.source=profile_page+page_view_event.page_kind=psychologist_profile.duration_seconds+profile_video_watch_session+psychologist_favorite+important_action_event.action_type=psychologist_profile_publications_tab_open|psychologist_profile_reviews_tab_open";

const buildProfileTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

export const hasProfileTrafficVideoViewSignal = (
  session: AdminPsychologistProfileTrafficPlatformDataset["videoWatchSessions"][number],
) =>
  session.watched_seconds > 0 ||
  session.max_position_seconds > 0 ||
  session.completed ||
  session.milestone_100;

export const buildProfileTrafficPlatformMetrics = (
  profiles: AdminPsychologistProfileRecord[],
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
) => {
  const profileIds = new Set(profiles.map((profile) => profile.user.id));
  const profileCount = profileIds.size;
  const noProfilesReason = "Sem perfis de psicólogos no segmento até o fim do período selecionado.";
  const countUnavailableReason = profileCount > 0 ? null : noProfilesReason;
  const averagePerProfile = (total: number) =>
    profileCount > 0 ? roundTrafficMetricPercent(total / profileCount) : null;
  const profileViews = dataset.profileViews.filter((event) =>
    profileIds.has(event.psychologist_id),
  );
  const favorites = dataset.favorites.filter((event) => profileIds.has(event.psychologist_id));
  const pageViewDurations = dataset.pageViews.flatMap((view) => {
    if (!view.target_id || !profileIds.has(view.target_id)) return [];
    if (view.user_id && view.user_id === view.target_id) return [];
    if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

    return [view.duration_seconds];
  });
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      profileIds.has(session.psychologist_id) &&
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
      profileIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  );
  const reviewsTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
      event.target_id &&
      profileIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  );
  const averageDuration =
    pageViewDurations.length > 0
      ? roundTrafficMetricPercent(
          pageViewDurations.reduce((total, value) => total + value, 0) / pageViewDurations.length,
        )
      : null;
  const averageRetention =
    retentionSamples.length > 0
      ? roundTrafficMetricPercent(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;

  const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
    buildProfileTrafficPlatformMetric({
      id: "profile_openings",
      label: "Aberturas de perfil",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(profileViews.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_stay_time",
      label: "Tempo de permanência",
      unavailable_reason:
        averageDuration === null
          ? "Sem duração registrada nas visualizações de perfil no período."
          : null,
      unit: "seconds",
      value: averageDuration,
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_views",
      label: "Views do vídeo de apresentação",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(videoWatchSessions.length),
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
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(favorites.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_publications_tab_opens",
      label: "Abertura da aba Publicações",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(publicationTabOpens.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_reviews_tab_opens",
      label: "Abertura da aba Avaliações",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(reviewsTabOpens.length),
    }),
  ];

  return { consideredCount: profileCount, metrics };
};

export const filterProfileTrafficPlatformMetricDataset = (
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
  allowedPsychologistIds: Set<string>,
): AdminPsychologistProfileTrafficPlatformDataset => ({
  favorites: dataset.favorites.filter((event) => allowedPsychologistIds.has(event.psychologist_id)),
  pageViews: dataset.pageViews.filter((view) =>
    view.target_id ? allowedPsychologistIds.has(view.target_id) : false,
  ),
  profileViews: dataset.profileViews.filter((event) =>
    allowedPsychologistIds.has(event.psychologist_id),
  ),
  tabActions: dataset.tabActions.filter((event) =>
    event.target_id ? allowedPsychologistIds.has(event.target_id) : false,
  ),
  videoActions: dataset.videoActions.filter((event) =>
    event.target_id ? allowedPsychologistIds.has(event.target_id) : false,
  ),
  videoWatchSessions: dataset.videoWatchSessions.filter((session) =>
    allowedPsychologistIds.has(session.psychologist_id),
  ),
});
