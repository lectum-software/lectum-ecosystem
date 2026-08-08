import type { AdminPsychologistsDashboardProfileConversionBehaviorResults } from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type { ProfileConversionBehaviorRowContext } from "./context";
import {
  buildProfileConversionBehaviorCellId,
  buildProfileConversionBehaviorMetric,
  classifyProfileConversionBehaviorHigherIsBetterTone,
  classifyProfileConversionBehaviorPositionTone,
  formatProfileConversionBehaviorOpeningsValue,
  formatProfileConversionBehaviorPerPsychologistValue,
  formatProfileConversionBehaviorSeconds,
  PROFILE_CONVERSION_BEHAVIOR_SOURCE,
} from "./support";

export const buildPresentationVideoBehaviorCell = (
  context: ProfileConversionBehaviorRowContext,
): AdminPsychologistsDashboardProfileConversionBehaviorResults["cells"][number] => {
  const {
    row,
    averageVideoRankingPosition,
    emptyRowReason,
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
  } = context;

  return {
    element_id: "presentation_video",
    headline: videoHeadline,
    id: buildProfileConversionBehaviorCellId(row.id, "presentation_video"),
    metrics: [
      buildProfileConversionBehaviorMetric({
        description: "Media de cliques de WhatsApp originados por video por profissional da faixa.",
        display_value: formatProfileConversionBehaviorPerPsychologistValue(
          videoWhatsappClicksPerPsychologist,
        ),
        id: "presentation_video_whatsapp_clicks_per_psychologist",
        label: "WhatsApp",
        source:
          "important_action_event.action_type=psychologist_video_whatsapp_click|whatsapp_click",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          videoWhatsappClicksPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: videoWhatsappClicksPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Percentual médio assistido nas sessões do vídeo de apresentação.",
        id: "presentation_video_retention",
        label: "Reten\u00e7\u00e3o",
        source: "profile_video_watch_session.watched_seconds/duration_seconds",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoRetention, [30, 60]),
        unit: "percentage",
        unavailable_reason:
          videoRetention === null && !videoUnavailableReason
            ? "Sem sessões do vídeo com duração no período."
            : videoUnavailableReason,
        value: videoRetention,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Visualizações do vídeo por vídeo publicado na categoria.",
        id: "presentation_video_views_per_video",
        label: "Views",
        source: "profile_video_watch_session",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoViewsPerVideo, [1, 5]),
        unavailable_reason: videoUnavailableReason,
        value: videoViewsPerVideo,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Permanência média por sessão do vídeo de apresentação.",
        id: "presentation_video_average_watch_seconds",
        label: "Perman\u00eancia",
        source: "profile_video_watch_session.watched_seconds",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          videoAverageWatchSeconds,
          [10, 45],
        ),
        unit: "seconds",
        unavailable_reason:
          videoAverageWatchSeconds === null && !videoUnavailableReason
            ? "Sem sessões do vídeo no período."
            : videoUnavailableReason,
        value: videoAverageWatchSeconds,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de acessos ao perfil gerados por video de apresentacao na categoria.",
        id: "presentation_video_profile_accesses_per_video",
        label: "Acesso ao perfil",
        source: "important_action_event.action_type=psychologist_video_profile_access",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          videoProfileAccessesPerVideo,
          [1, 3],
        ),
        unavailable_reason: videoUnavailableReason,
        value: videoProfileAccessesPerVideo,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de favoritos gerados por video de apresentacao na categoria.",
        id: "presentation_video_favorites_per_video",
        label: "Favoritado",
        source: "important_action_event.action_type=psychologist_video_favorite",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoFavoritesPerVideo, [1, 3]),
        unavailable_reason: videoUnavailableReason,
        value: videoFavoritesPerVideo,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de compartilhamentos gerados por video de apresentacao na categoria.",
        id: "presentation_video_shares_per_video",
        label: "Compartilhado",
        source: "important_action_event.action_type=psychologist_video_share",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoSharesPerVideo, [1, 3]),
        unavailable_reason: videoUnavailableReason,
        value: videoSharesPerVideo,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          videoRankingRangeSignal?.description ??
          "Faixa predominante de posicao dos profissionais com video na lista publica ranqueada.",
        display_value: videoUnavailableReason ? null : (videoRankingRangeSignal?.label ?? null),
        id: "presentation_video_average_ranking_position",
        label: "Posi\u00e7\u00e3o",
        source: "shared_psychologist_public_ranking_helper",
        tone:
          videoRankingRangeSignal?.tone ??
          classifyProfileConversionBehaviorPositionTone(averageVideoRankingPosition),
        unit: "position",
        unavailable_reason: videoUnavailableReason,
        value: averageVideoRankingPosition,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          "Cliques de WhatsApp classificados como originados pela navegação de vídeos em Explorar ou Busca/filtros.",
        id: "presentation_video_whatsapp_clicks",
        label: "WhatsApp via vídeo",
        source:
          "important_action_event.action_type=psychologist_video_whatsapp_click|whatsapp_click",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: videoWhatsappClicks,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Classificacao da media de acoes de engajamento no video por video publicado.",
        display_value: videoEngagementSignal.label,
        id: "presentation_video_engagement_level",
        label: "Engajamento",
        source:
          "important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share",
        tone: videoEngagementSignal.tone,
        unavailable_reason: videoUnavailableReason,
        value: videoEngagementPerVideo,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          "Ações no vídeo que indicam interesse: acesso ao perfil, favorito e compartilhamento.",
        id: "presentation_video_engagement_actions",
        label: "Engajamento",
        source:
          "important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share",
        unavailable_reason: videoUnavailableReason,
        value: videoEngagementActions,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Percentual de sessoes do video com ao menos um replay registrado.",
        id: "presentation_video_replay_rate",
        label: "Replay",
        source: "profile_video_watch_session.replay_count",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoReplayRate, [10, 25]),
        unit: "percentage",
        unavailable_reason:
          videoReplayRate === null && !videoUnavailableReason
            ? "Sem sessões do vídeo no período."
            : videoUnavailableReason,
        value: videoReplayRate,
      }),
    ],
    row_id: row.id,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason: videoUnavailableReason,
  };
};

export const buildProfileBehaviorCell = (
  context: ProfileConversionBehaviorRowContext,
): AdminPsychologistsDashboardProfileConversionBehaviorResults["cells"][number] => {
  const {
    row,
    emptyRowReason,
    profileAverageStaySeconds,
    profileContentTabOpensPerPsychologist,
    profileDominantPlanSignal,
    profileDominantTabSignal,
    profileFavorites,
    profileFavoritesPerPsychologist,
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
    videoRetention,
    videoUnavailableReason,
  } = context;

  return {
    element_id: "profile",
    headline: profileHeadline,
    id: buildProfileConversionBehaviorCellId(row.id, "profile"),
    metrics: [
      buildProfileConversionBehaviorMetric({
        description:
          "Media de cliques de WhatsApp originados no perfil publico por profissional da faixa.",
        display_value: formatProfileConversionBehaviorPerPsychologistValue(
          profileWhatsappClicksPerPsychologist,
        ),
        id: "profile_whatsapp_clicks_per_psychologist",
        label: "WhatsApp",
        source: "important_action_event.page_kind=psychologist_profile",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileWhatsappClicksPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileWhatsappClicksPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Plano ativo predominante entre os profissionais da faixa.",
        display_value: profileDominantPlanSignal.label,
        id: "profile_dominant_plan",
        label: "Plano predominante",
        source: "professional_subscription+subscription_plan",
        tone: profileDominantPlanSignal.tone,
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileDominantPlanSignal.value,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Total de aberturas do perfil público dos profissionais da faixa.",
        id: "profile_openings",
        label: "Aberturas",
        source: "profile_view_event.source=profile_page",
        unavailable_reason: profileUnavailableReason,
        value: profileViews.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Média de aberturas do perfil por profissional da faixa.",
        display_value: formatProfileConversionBehaviorOpeningsValue(profileOpeningsPerPsychologist),
        id: "profile_openings_per_psychologist",
        label: "Aberturas",
        source: "profile_view_event.source=profile_page",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileOpeningsPerPsychologist,
          [1, 5],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileOpeningsPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Permanência média registrada nas visualizações do perfil público.",
        display_value: formatProfileConversionBehaviorSeconds(profileAverageStaySeconds, "0s"),
        id: "profile_average_stay_seconds",
        label: "Perman\u00eancia",
        source: "page_view_event.page_kind=psychologist_profile.duration_seconds",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileAverageStaySeconds,
          [10, 45],
        ),
        unit: "seconds",
        unavailable_reason:
          profileAverageStaySeconds === null && !profileUnavailableReason
            ? "Sem duração registrada nas visualizações de perfil no período."
            : profileUnavailableReason,
        value: profileAverageStaySeconds ?? 0,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de aberturas da aba Avaliacoes por profissional da faixa.",
        id: "profile_reviews_tab_opens_per_psychologist",
        label: "Aba Avalia\u00e7\u00f5es",
        source: "important_action_event.action_type=psychologist_profile_reviews_tab_open",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileReviewsTabOpensPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileReviewsTabOpensPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de aberturas da aba Conteudo por profissional da faixa.",
        id: "profile_content_tab_opens_per_psychologist",
        label: "Aba Conte\u00fado",
        source: "important_action_event.action_type=psychologist_profile_publications_tab_open",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileContentTabOpensPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileContentTabOpensPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Media de views do video de apresentacao por profissional da faixa.",
        id: "profile_video_views_per_psychologist",
        label: "Views v\u00eddeo",
        source: "profile_video_watch_session",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileVideoViewsPerPsychologist,
          [1, 5],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileVideoViewsPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Retencao media do video de apresentacao nos perfis da faixa.",
        id: "profile_video_retention",
        label: "Reten\u00e7\u00e3o v\u00eddeo",
        source: "profile_video_watch_session.watched_seconds/duration_seconds",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoRetention, [30, 60]),
        unit: "percentage",
        unavailable_reason:
          videoRetention === null && !videoUnavailableReason
            ? "Sem sessões do vídeo com duração no período."
            : videoUnavailableReason,
        value: profileVideoRetention,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Aba interna predominante nas aberturas do perfil publico.",
        display_value: profileDominantTabSignal.label,
        id: "profile_dominant_tab",
        label: "Aba predominante",
        source:
          "important_action_event.action_type=psychologist_profile_publications_tab_open|psychologist_profile_reviews_tab_open",
        tone: profileDominantTabSignal.tone,
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profilePublicationTabOpens + profileReviewsTabOpens,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Aberturas da aba Publicações dentro do perfil público.",
        id: "profile_publications_tab_opens",
        label: "Aba Publicações",
        source: "important_action_event.action_type=psychologist_profile_publications_tab_open",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profilePublicationTabOpens,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Aberturas da aba Avaliações dentro do perfil público.",
        id: "profile_reviews_tab_opens",
        label: "Aba Avaliações",
        source: "important_action_event.action_type=psychologist_profile_reviews_tab_open",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileReviewsTabOpens,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          "Media de favoritos recebidos pelos perfis publicos por profissional da faixa.",
        id: "profile_favorites_per_psychologist",
        label: "Favoritado",
        source: "psychologist_favorite.user.role=paciente",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          profileFavoritesPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileFavoritesPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Favoritos recebidos pelos perfis públicos da faixa.",
        id: "profile_favorites",
        label: "Favoritos desses perfis",
        source: "psychologist_favorite.user.role=paciente",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileFavorites.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Cliques de WhatsApp classificados como originados do perfil público.",
        id: "profile_whatsapp_clicks",
        label: "WhatsApp via perfil",
        source: "important_action_event.page_kind=psychologist_profile",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileWhatsappClicks,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Proporção entre cliques de WhatsApp e aberturas do perfil.",
        id: "profile_whatsapp_rate",
        label: "WhatsApp/abertura",
        source: "important_action_event.page_kind=psychologist_profile/profile_view_event",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(profileWhatsappRate, [5, 15]),
        unit: "percentage",
        unavailable_reason:
          profileWhatsappRate === null && !profileUnavailableReason
            ? "Sem aberturas do perfil para calcular a taxa de WhatsApp."
            : profileUnavailableReason,
        value: profileWhatsappRate,
      }),
    ],
    row_id: row.id,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason: profileUnavailableReason,
  };
};
