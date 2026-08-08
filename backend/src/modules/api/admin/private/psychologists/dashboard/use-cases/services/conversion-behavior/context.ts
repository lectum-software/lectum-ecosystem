import { calculateAdminProfileEngagementFavoritesCommunityScore } from "@/utils/admin-profile-engagement-favorites";
import {
  roundOneDecimal,
  summarizePsychologistWhatsappTrafficOrigins,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileConversionBehaviorResults,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
  AdminPsychologistReceivedEngagementEventRecord,
  AdminPsychologistTrafficCommunityPostRecord,
  AdminPsychologistTrafficCommunityReplyRecord,
  AdminPsychologistWhatsappTrafficActionRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  filterCommunityTrafficPlatformMetricDataset,
  isCommunityTrafficVideoMedia,
} from "../traffic/community";
import {
  buildTrafficPlatformMetrics,
  PRESENTATION_VIDEO_FAVORITE_ACTION,
  PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION,
  PRESENTATION_VIDEO_SHARE_ACTION,
} from "../traffic/presentation-video";
import {
  filterProfileTrafficPlatformMetricDataset,
  hasProfileTrafficVideoViewSignal,
  PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION,
  PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION,
} from "../traffic/profile";
import {
  averageProfileConversionBehaviorValue,
  describeProfileConversionBehaviorActivitySignal,
  describeProfileConversionBehaviorDominantContentFormat,
  describeProfileConversionBehaviorDominantPlan,
  describeProfileConversionBehaviorDominantProfileTab,
  describeProfileConversionBehaviorDominantTabSignal,
  describeProfileConversionBehaviorEngagementSignal,
  describeProfileConversionBehaviorPositionRange,
  describeProfileConversionBehaviorRankingRange,
  describeProfileConversionBehaviorVolume,
  formatProfileConversionBehaviorCount,
  formatProfileConversionBehaviorMetricNumber,
  formatProfileConversionBehaviorNumber,
  formatProfileConversionBehaviorPercentage,
  formatProfileConversionBehaviorSeconds,
  PROFILE_CONVERSION_BEHAVIOR_COMMUNITY_SOURCE_IDS,
  PROFILE_CONVERSION_BEHAVIOR_FAVORITES_SOURCE_IDS,
  PROFILE_CONVERSION_BEHAVIOR_PROFILE_SOURCE_IDS,
  PROFILE_CONVERSION_BEHAVIOR_VIDEO_SOURCE_IDS,
} from "./support";

export type ProfileConversionBehaviorParams = {
  communityTrafficPlatformMetricDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  profileTrafficPlatformMetricDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  rankingPositionsByPsychologistId: Map<string, number>;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  trafficCommunityPosts: AdminPsychologistTrafficCommunityPostRecord[];
  trafficCommunityReplies: AdminPsychologistTrafficCommunityReplyRecord[];
  whatsappContactRequests: AdminPsychologistEventRecord[];
  whatsappTrafficActions: AdminPsychologistWhatsappTrafficActionRecord[];
};

export const buildProfileConversionBehaviorRowContext = ({
  params,
  row,
  rowProfiles,
}: {
  params: ProfileConversionBehaviorParams;
  row: AdminPsychologistsDashboardProfileConversionBehaviorResults["rows"][number];
  rowProfiles: AdminPsychologistProfileRecord[];
}) => {
  const rowPsychologistIds = new Set(rowProfiles.map((profile) => profile.user.id));

  const rowProfileTrafficDataset = filterProfileTrafficPlatformMetricDataset(
    params.profileTrafficPlatformMetricDataset,
    rowPsychologistIds,
  );

  const rowCommunityTrafficDataset = filterCommunityTrafficPlatformMetricDataset(
    params.communityTrafficPlatformMetricDataset,
    rowPsychologistIds,
  );

  const rowTrafficPlatformMetrics = buildTrafficPlatformMetrics({
    communityDataset: rowCommunityTrafficDataset,
    profileDataset: rowProfileTrafficDataset,
    profiles: rowProfiles,
  });

  const rowTrafficSources = summarizePsychologistWhatsappTrafficOrigins({
    actions: params.whatsappTrafficActions,
    allowedPsychologistIds: rowPsychologistIds,
    communityPlatformMetrics: rowTrafficPlatformMetrics.metrics,
    platformMetricsConsideredCounts: rowTrafficPlatformMetrics.consideredCounts,
    communityPosts: params.trafficCommunityPosts,
    communityReplies: params.trafficCommunityReplies,
  }).sources;

  const rowReceivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    rowPsychologistIds.has(event.psychologist_id),
  );

  const emptyRowReason = `Sem profissionais na categoria ${row.label.toLocaleLowerCase("pt-BR")} no período selecionado.`;

  const videoProfiles = rowProfiles.filter(
    (profile) => profile.published && Boolean(profile.video_url?.trim()),
  );

  const videoProfileIds = new Set(videoProfiles.map((profile) => profile.user.id));

  const videoWatchSessions = rowProfileTrafficDataset.videoWatchSessions.filter(
    (session) =>
      videoProfileIds.has(session.psychologist_id) &&
      (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
      hasProfileTrafficVideoViewSignal(session),
  );

  const videoRetention = averageProfileConversionBehaviorValue(
    videoWatchSessions.flatMap((session) =>
      session.duration_seconds > 0
        ? [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)]
        : [],
    ),
  );

  const videoAverageWatchSeconds = averageProfileConversionBehaviorValue(
    videoWatchSessions.map((session) => Math.max(0, session.watched_seconds)),
  );

  const videoViewsPerVideo =
    videoProfiles.length > 0
      ? roundOneDecimal(videoWatchSessions.length / videoProfiles.length)
      : null;

  const videoReplayRate =
    videoWatchSessions.length > 0
      ? roundOneDecimal(
          (videoWatchSessions.filter((session) => session.replay_count > 0).length /
            videoWatchSessions.length) *
            100,
        )
      : null;

  const videoActionEvents = rowProfileTrafficDataset.videoActions.filter(
    (event) =>
      event.target_id &&
      videoProfileIds.has(event.target_id) &&
      (!event.user_id || event.user_id !== event.target_id),
  );

  const videoActionCount = (actionType: string) =>
    videoActionEvents.filter((event) => event.action_type === actionType).length;

  const videoProfileAccesses = videoActionCount(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION);

  const videoFavorites = videoActionCount(PRESENTATION_VIDEO_FAVORITE_ACTION);

  const videoShares = videoActionCount(PRESENTATION_VIDEO_SHARE_ACTION);

  const averageVideoActionPerVideo = (value: number) =>
    videoProfiles.length > 0 ? roundOneDecimal(value / videoProfiles.length) : null;

  const videoProfileAccessesPerVideo = averageVideoActionPerVideo(videoProfileAccesses);

  const videoFavoritesPerVideo = averageVideoActionPerVideo(videoFavorites);

  const videoSharesPerVideo = averageVideoActionPerVideo(videoShares);

  const videoSources = rowTrafficSources.filter((source) =>
    PROFILE_CONVERSION_BEHAVIOR_VIDEO_SOURCE_IDS.includes(source.id),
  );

  const videoWhatsappClicks = videoSources.reduce((sum, source) => sum + source.whatsapp_clicks, 0);

  const videoWhatsappClicksPerPsychologist =
    row.count > 0 ? roundOneDecimal(videoWhatsappClicks / row.count) : 0;

  const videoEngagementActions = videoProfileAccesses + videoFavorites + videoShares;

  const videoRankingPositionEntries = videoProfiles.map((profile) => {
    const position = params.rankingPositionsByPsychologistId.get(profile.user.id);

    return typeof position === "number" ? position : null;
  });

  const videoRankingPositions = videoRankingPositionEntries.filter(
    (position): position is number => typeof position === "number",
  );

  const averageVideoRankingPosition = averageProfileConversionBehaviorValue(videoRankingPositions);

  const videoRankingRangeSignal = describeProfileConversionBehaviorPositionRange(
    videoRankingPositionEntries,
  );

  const videoUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : videoProfiles.length === 0
        ? "Nenhum profissional desta categoria tem vídeo de apresentação publicado."
        : null;

  const profileViews = rowProfileTrafficDataset.profileViews.filter((event) =>
    rowPsychologistIds.has(event.psychologist_id),
  );

  const profilePageViewDurations = rowProfileTrafficDataset.pageViews.flatMap((view) => {
    if (!view.target_id || !rowPsychologistIds.has(view.target_id)) return [];
    if (view.user_id && view.user_id === view.target_id) return [];
    if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

    return [view.duration_seconds];
  });

  const profileAverageStaySeconds = averageProfileConversionBehaviorValue(profilePageViewDurations);

  const profileOpeningsPerPsychologist =
    row.count > 0 ? roundOneDecimal(profileViews.length / row.count) : null;

  const profileFavorites = rowProfileTrafficDataset.favorites.filter((event) =>
    rowPsychologistIds.has(event.psychologist_id),
  );

  const profileFavoritesPerPsychologist =
    row.count > 0 ? roundOneDecimal(profileFavorites.length / row.count) : null;

  const profilePublicationTabOpens = rowProfileTrafficDataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION &&
      event.target_id &&
      rowPsychologistIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  ).length;

  const profileReviewsTabOpens = rowProfileTrafficDataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
      event.target_id &&
      rowPsychologistIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  ).length;

  const profileContentTabOpensPerPsychologist =
    row.count > 0 ? roundOneDecimal(profilePublicationTabOpens / row.count) : 0;

  const profileReviewsTabOpensPerPsychologist =
    row.count > 0 ? roundOneDecimal(profileReviewsTabOpens / row.count) : 0;

  const profileVideoViewsPerPsychologist =
    row.count > 0 ? roundOneDecimal(videoWatchSessions.length / row.count) : 0;

  const profileVideoRetention = videoRetention ?? 0;

  const profileSources = rowTrafficSources.filter((source) =>
    PROFILE_CONVERSION_BEHAVIOR_PROFILE_SOURCE_IDS.includes(source.id),
  );

  const profileWhatsappClicks = profileSources.reduce(
    (sum, source) => sum + source.whatsapp_clicks,
    0,
  );

  const profileWhatsappClicksPerPsychologist =
    row.count > 0 ? roundOneDecimal(profileWhatsappClicks / row.count) : 0;

  const profileWhatsappRate =
    profileViews.length > 0
      ? roundOneDecimal((profileWhatsappClicks / profileViews.length) * 100)
      : null;

  const profileDominantPlanSignal = describeProfileConversionBehaviorDominantPlan(
    rowProfiles,
    params.range.end,
  );

  const profileSignalCount =
    profileViews.length +
    profilePageViewDurations.length +
    profileFavorites.length +
    profilePublicationTabOpens +
    profileReviewsTabOpens +
    profileWhatsappClicks;

  const profileUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : profileSignalCount === 0
        ? "Nenhum comportamento de usuários dentro do perfil público foi registrado para esta categoria no período."
        : null;

  const communityContentCount =
    rowCommunityTrafficDataset.posts.length + rowCommunityTrafficDataset.replies.length;

  const communityPostVideoCount = rowCommunityTrafficDataset.posts.filter(
    isCommunityTrafficVideoMedia,
  ).length;

  const communityReplyVideoCount = rowCommunityTrafficDataset.replies.filter(
    isCommunityTrafficVideoMedia,
  ).length;

  const communityPostTextCount = rowCommunityTrafficDataset.posts.length - communityPostVideoCount;

  const communityReplyTextCount =
    rowCommunityTrafficDataset.replies.length - communityReplyVideoCount;

  const communityVideoSessions = rowCommunityTrafficDataset.videoWatchSessions.filter(
    (session) => session.duration_seconds > 0,
  );

  const communityRetention = averageProfileConversionBehaviorValue(
    communityVideoSessions.map((session) =>
      Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100),
    ),
  );

  const communityAttentionSeconds = rowCommunityTrafficDataset.attentionSessions.reduce(
    (sum, session) => sum + Math.max(0, session.attention_seconds),
    0,
  );

  const communityViewsPerContent =
    communityContentCount > 0
      ? roundOneDecimal(rowCommunityTrafficDataset.pageViews.length / communityContentCount)
      : null;

  const communityAttentionPerContent =
    communityContentCount > 0
      ? roundOneDecimal(communityAttentionSeconds / communityContentCount)
      : null;

  const communityUpvotes = rowCommunityTrafficDataset.votes.filter(
    (vote) => vote.value === 1,
  ).length;

  const communityDownvotes = rowCommunityTrafficDataset.votes.filter(
    (vote) => vote.value === -1,
  ).length;

  const communityEngagementActions =
    rowCommunityTrafficDataset.comments.length +
    rowCommunityTrafficDataset.postSaves.length +
    rowCommunityTrafficDataset.replySaves.length +
    rowCommunityTrafficDataset.shares.length +
    communityUpvotes;

  const communitySources = rowTrafficSources.filter((source) =>
    PROFILE_CONVERSION_BEHAVIOR_COMMUNITY_SOURCE_IDS.includes(source.id),
  );

  const communityWhatsappClicks = communitySources.reduce(
    (sum, source) => sum + source.whatsapp_clicks,
    0,
  );

  const communityWhatsappClicksPerPsychologist =
    row.count > 0 ? roundOneDecimal(communityWhatsappClicks / row.count) : 0;

  const dominantCommunitySource =
    communitySources
      .filter((source) => source.whatsapp_clicks > 0 || (source.considered_count ?? 0) > 0)
      .toSorted((left, right) => {
        if (right.whatsapp_clicks !== left.whatsapp_clicks) {
          return right.whatsapp_clicks - left.whatsapp_clicks;
        }

        return (right.considered_count ?? 0) - (left.considered_count ?? 0);
      })[0] ?? null;

  const communityContentUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : communityContentCount === 0
        ? "Nenhum conteúdo autoral de comunidade foi publicado por esta categoria no período."
        : null;

  const rowActivityAuthorIds = new Set([
    ...rowCommunityTrafficDataset.posts.map((post) => post.author_id),
    ...rowCommunityTrafficDataset.replies.map((reply) => reply.author_id),
  ]);

  const rowActivityActions =
    rowCommunityTrafficDataset.posts.length + rowCommunityTrafficDataset.replies.length;

  const activityPerPsychologist =
    row.count > 0 ? roundOneDecimal(rowActivityActions / row.count) : null;

  const activityUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : rowActivityActions === 0
        ? "Nenhuma ação autoral em comunidades foi registrada para esta categoria no período."
        : null;

  const engagementCountByType = (type: AdminPsychologistReceivedEngagementEventRecord["type"]) =>
    rowReceivedEngagementEvents.filter((event) => event.type === type).length;

  const commentsReceived = engagementCountByType("comment_received");

  const contentSaves = engagementCountByType("content_save");

  const contentShares = engagementCountByType("content_share");

  const positiveVotes = engagementCountByType("positive_vote");

  const profileFollows = engagementCountByType("profile_follow");

  const engagementScore = calculateAdminProfileEngagementFavoritesCommunityScore({
    commentsReceived,
    contentSaves,
    contentShares,
    positiveVotes,
  });

  const engagementInteractions =
    commentsReceived + contentSaves + contentShares + positiveVotes + profileFollows;

  const engagementUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : engagementInteractions === 0
        ? "Nenhum engajamento recebido foi registrado para esta categoria no período."
        : null;

  const communityHasSignals =
    communityContentCount > 0 ||
    rowActivityActions > 0 ||
    engagementInteractions > 0 ||
    communityWhatsappClicks > 0;

  const communityUnavailableReason =
    row.count <= 0
      ? emptyRowReason
      : !communityHasSignals
        ? "Nenhum sinal de comunidade, atividade ou engajamento foi registrado para esta categoria no período."
        : null;

  const favoritesScreenSources = rowTrafficSources.filter((source) =>
    PROFILE_CONVERSION_BEHAVIOR_FAVORITES_SOURCE_IDS.includes(source.id),
  );

  const favoritesScreenWhatsappClicks = favoritesScreenSources.reduce(
    (sum, source) => sum + source.whatsapp_clicks,
    0,
  );

  const favoritesScreenWhatsappClicksPerPsychologist =
    row.count > 0 ? roundOneDecimal(favoritesScreenWhatsappClicks / row.count) : 0;

  const favoriteUnavailableReason = row.count <= 0 ? emptyRowReason : null;

  const videoEngagementPerVideo =
    videoProfiles.length > 0 ? roundOneDecimal(videoEngagementActions / videoProfiles.length) : 0;

  const videoEngagementSignal =
    describeProfileConversionBehaviorEngagementSignal(videoEngagementPerVideo);

  const videoEngagementLevel = describeProfileConversionBehaviorVolume(
    videoEngagementPerVideo,
    [3, 10],
  );

  const videoEngagementText =
    videoEngagementLevel === "sem sinal registrado"
      ? "sem engajamento registrado"
      : `com engajamento ${videoEngagementLevel}`;

  const videoConsumptionText =
    typeof videoAverageWatchSeconds === "number"
      ? `O consumo médio é de ${formatProfileConversionBehaviorSeconds(videoAverageWatchSeconds, "0s")}`
      : "Ainda não há base real de consumo médio";

  const videoReplayText =
    typeof videoReplayRate === "number"
      ? `replay em ${formatProfileConversionBehaviorPercentage(videoReplayRate, "0%")} das sessões`
      : "sem base de replay";

  const videoHeadline =
    videoUnavailableReason ??
    `${typeof videoRetention === "number" ? `Retenção média de ${formatProfileConversionBehaviorPercentage(videoRetention, "0%")}` : "Retenção média ainda sem base real"}, ${videoEngagementText} (${formatProfileConversionBehaviorCount(videoEngagementActions, "ação", "ações")} no vídeo) e ${describeProfileConversionBehaviorRankingRange(videoRankingRangeSignal, averageVideoRankingPosition)}. ${videoConsumptionText}, com ${formatProfileConversionBehaviorMetricNumber(videoViewsPerVideo, "sem base de views")} views por vídeo, ${videoReplayText} e ${formatProfileConversionBehaviorCount(videoWhatsappClicks, "clique de WhatsApp vindo do vídeo", "cliques de WhatsApp vindos do vídeo")}.`;

  const profileStayText =
    typeof profileAverageStaySeconds === "number"
      ? `permanência média de ${formatProfileConversionBehaviorSeconds(profileAverageStaySeconds, "0s")}`
      : "permanência média ainda sem base real";

  const profileWhatsappText =
    typeof profileWhatsappRate === "number"
      ? `${formatProfileConversionBehaviorCount(profileWhatsappClicks, "clique de WhatsApp via perfil", "cliques de WhatsApp via perfil")}, equivalentes a ${formatProfileConversionBehaviorPercentage(profileWhatsappRate, "0%")} das aberturas`
      : `${formatProfileConversionBehaviorCount(profileWhatsappClicks, "clique de WhatsApp via perfil", "cliques de WhatsApp via perfil")}, ainda sem taxa por abertura`;

  const profileHeadline =
    profileUnavailableReason ??
    `Perfil teve ${formatProfileConversionBehaviorCount(profileViews.length, "abertura real", "aberturas reais")} (${formatProfileConversionBehaviorMetricNumber(profileOpeningsPerPsychologist, "sem base")} por psicólogo), com ${profileStayText}. Na navegação interna, ${describeProfileConversionBehaviorDominantProfileTab({ publicationsTabOpens: profilePublicationTabOpens, reviewsTabOpens: profileReviewsTabOpens })}. Usuários também favoritaram esses perfis ${formatProfileConversionBehaviorCount(profileFavorites.length, "vez", "vezes")} (${formatProfileConversionBehaviorMetricNumber(profileFavoritesPerPsychologist, "sem base")} por psicólogo) e geraram ${profileWhatsappText}.`;

  const profileDominantTabSignal = describeProfileConversionBehaviorDominantTabSignal({
    publicationsTabOpens: profilePublicationTabOpens,
    reviewsTabOpens: profileReviewsTabOpens,
  });

  const communityEngagementPerPsychologist =
    row.count > 0 ? roundOneDecimal(engagementInteractions / row.count) : engagementInteractions;

  const communityActivitySignal =
    describeProfileConversionBehaviorActivitySignal(activityPerPsychologist);

  const communityEngagementSignal = describeProfileConversionBehaviorEngagementSignal(
    communityEngagementPerPsychologist,
  );

  const communityPostFormatSignal = describeProfileConversionBehaviorDominantContentFormat({
    text: communityPostTextCount,
    textLabel: "posts de texto",
    video: communityPostVideoCount,
    videoLabel: "posts com v\u00eddeo",
    zeroLabel: "Sem posts",
  });

  const communityReplyFormatSignal = describeProfileConversionBehaviorDominantContentFormat({
    text: communityReplyTextCount,
    textLabel: "respostas de texto",
    video: communityReplyVideoCount,
    videoLabel: "respostas com v\u00eddeo",
    zeroLabel: "Sem respostas",
  });

  const communityActivityPerPsychologistText =
    typeof activityPerPsychologist === "number"
      ? `${formatProfileConversionBehaviorNumber(activityPerPsychologist)} ações por psicólogo`
      : "ações por psicólogo ainda sem base";

  const communityRetentionText =
    typeof communityRetention === "number"
      ? `vídeos de comunidade têm retenção média de ${formatProfileConversionBehaviorPercentage(communityRetention, "0%")}`
      : "vídeos de comunidade ainda não têm base de retenção";

  const communityConsumptionText =
    communityContentCount > 0
      ? `O consumo médio é de ${formatProfileConversionBehaviorMetricNumber(communityViewsPerContent, "0")} views por conteúdo e ${formatProfileConversionBehaviorSeconds(communityAttentionPerContent, "0s")} de permanência`
      : "Sem conteúdo autoral, ainda não há base de consumo por conteúdo";

  const communityEngagementLevel = describeProfileConversionBehaviorVolume(
    communityEngagementPerPsychologist,
    [3, 10],
  );

  const communityEngagementText =
    communityEngagementLevel === "sem sinal registrado"
      ? "não tem sinal registrado"
      : `tem relacionamento recebido ${communityEngagementLevel}`;

  const communityDominantWhatsappText =
    communityWhatsappClicks <= 0
      ? "Não houve cliques de WhatsApp vindos da comunidade"
      : dominantCommunitySource
        ? `A origem predominante de WhatsApp é ${dominantCommunitySource.label}, com ${formatProfileConversionBehaviorCount(communityWhatsappClicks, "clique", "cliques")} via comunidade`
        : `${formatProfileConversionBehaviorCount(communityWhatsappClicks, "clique de WhatsApp", "cliques de WhatsApp")} vieram da comunidade`;

  const communityHeadline =
    communityUnavailableReason ??
    `Comunidade reúne ${formatProfileConversionBehaviorCount(communityContentCount, "conteúdo autoral", "conteúdos autorais")} (${formatProfileConversionBehaviorCount(rowCommunityTrafficDataset.posts.length, "post", "posts")} e ${formatProfileConversionBehaviorCount(rowCommunityTrafficDataset.replies.length, "resposta", "respostas")}), com ${formatProfileConversionBehaviorCount(rowActivityAuthorIds.size, "profissional ativo", "profissionais ativos")} e ${communityActivityPerPsychologistText}. ${communityConsumptionText}; ${communityRetentionText}. O relacionamento recebido ${communityEngagementText}, com ${formatProfileConversionBehaviorCount(engagementInteractions, "interação", "interações")} (score ${formatProfileConversionBehaviorNumber(engagementScore)}), incluindo ${formatProfileConversionBehaviorCount(commentsReceived, "comentário", "comentários")}, ${formatProfileConversionBehaviorCount(contentSaves, "salvamento", "salvamentos")}, ${formatProfileConversionBehaviorCount(contentShares, "compartilhamento", "compartilhamentos")} e ${formatProfileConversionBehaviorCount(positiveVotes, "voto positivo", "votos positivos")}. ${communityDominantWhatsappText}.`;

  const favoriteHeadline =
    favoriteUnavailableReason ??
    `Favoritos geraram ${formatProfileConversionBehaviorCount(favoritesScreenWhatsappClicks, "clique de WhatsApp", "cliques de WhatsApp")}, com média de ${formatProfileConversionBehaviorMetricNumber(favoritesScreenWhatsappClicksPerPsychologist, "0")} por psicólogo da categoria.`;

  return {
    row,
    activityPerPsychologist,
    activityUnavailableReason,
    averageVideoRankingPosition,
    commentsReceived,
    communityActivitySignal,
    communityAttentionPerContent,
    communityContentCount,
    communityContentUnavailableReason,
    communityDownvotes,
    communityEngagementActions,
    communityEngagementPerPsychologist,
    communityEngagementSignal,
    communityHeadline,
    communityPostFormatSignal,
    communityReplyFormatSignal,
    communityRetention,
    communityUnavailableReason,
    communityViewsPerContent,
    communityWhatsappClicks,
    communityWhatsappClicksPerPsychologist,
    contentSaves,
    contentShares,
    emptyRowReason,
    engagementScore,
    engagementUnavailableReason,
    favoriteHeadline,
    favoriteUnavailableReason,
    favoritesScreenWhatsappClicksPerPsychologist,
    positiveVotes,
    profileAverageStaySeconds,
    profileContentTabOpensPerPsychologist,
    profileDominantPlanSignal,
    profileDominantTabSignal,
    profileFavorites,
    profileFavoritesPerPsychologist,
    profileFollows,
    profileHeadline,
    profileOpeningsPerPsychologist,
    profilePublicationTabOpens,
    profileReviewsTabOpens,
    profileReviewsTabOpensPerPsychologist,
    profileUnavailableReason,
    profileVideoRetention,
    profileVideoViewsPerPsychologist,
    profileViews,
    profileWhatsappClicks,
    profileWhatsappClicksPerPsychologist,
    profileWhatsappRate,
    rowActivityActions,
    rowActivityAuthorIds,
    rowCommunityTrafficDataset,
    videoAverageWatchSeconds,
    videoEngagementActions,
    videoEngagementPerVideo,
    videoEngagementSignal,
    videoFavoritesPerVideo,
    videoHeadline,
    videoProfileAccessesPerVideo,
    videoRankingRangeSignal,
    videoReplayRate,
    videoRetention,
    videoSharesPerVideo,
    videoUnavailableReason,
    videoViewsPerVideo,
    videoWhatsappClicks,
    videoWhatsappClicksPerPsychologist,
  };
};

export type ProfileConversionBehaviorRowContext = ReturnType<
  typeof buildProfileConversionBehaviorRowContext
>;
