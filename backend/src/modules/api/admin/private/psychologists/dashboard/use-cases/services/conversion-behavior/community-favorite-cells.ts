import { ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE } from "@/utils/admin-profile-engagement-favorites";
import type { AdminPsychologistsDashboardProfileConversionBehaviorResults } from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import { PROFILE_ACTIVITY_SOURCE } from "../support/constants";
import type { ProfileConversionBehaviorRowContext } from "./context";
import {
  buildProfileConversionBehaviorCellId,
  buildProfileConversionBehaviorMetric,
  classifyProfileConversionBehaviorHigherIsBetterTone,
  formatProfileConversionBehaviorPerPsychologistValue,
  PROFILE_CONVERSION_BEHAVIOR_SOURCE,
} from "./support";

export const buildCommunitiesBehaviorCell = (
  context: ProfileConversionBehaviorRowContext,
): AdminPsychologistsDashboardProfileConversionBehaviorResults["cells"][number] => {
  const {
    row,
    activityPerPsychologist,
    activityUnavailableReason,
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
    positiveVotes,
    profileFollows,
    rowActivityActions,
    rowActivityAuthorIds,
    rowCommunityTrafficDataset,
  } = context;

  return {
    element_id: "communities",
    headline: communityHeadline,
    id: buildProfileConversionBehaviorCellId(row.id, "communities"),
    metrics: [
      buildProfileConversionBehaviorMetric({
        description:
          "Media de cliques de WhatsApp originados na comunidade por profissional da faixa.",
        display_value: formatProfileConversionBehaviorPerPsychologistValue(
          communityWhatsappClicksPerPsychologist,
        ),
        id: "community_whatsapp_clicks_per_psychologist",
        label: "WhatsApp",
        source: "important_action_event.action_type=whatsapp_click",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          communityWhatsappClicksPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: communityWhatsappClicksPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Classificacao da media de posts e respostas por profissional da faixa.",
        display_value: communityActivitySignal.label,
        id: "community_activity_level",
        label: "Atividade",
        source: PROFILE_ACTIVITY_SOURCE,
        tone: communityActivitySignal.tone,
        unavailable_reason: activityUnavailableReason,
        value: activityPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Classificacao da media de interacoes recebidas por profissional da faixa.",
        display_value: communityEngagementSignal.label,
        id: "community_engagement_level",
        label: "Engajamento",
        source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
        tone: communityEngagementSignal.tone,
        unavailable_reason: engagementUnavailableReason,
        value: communityEngagementPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Formato predominante dos posts autorais da faixa.",
        display_value: communityPostFormatSignal.label,
        id: "community_post_format",
        label: "Formato posts",
        source: "community_post.media_type",
        tone: communityPostFormatSignal.tone,
        unavailable_reason: activityUnavailableReason,
        value: rowCommunityTrafficDataset.posts.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Formato predominante das respostas autorais da faixa.",
        display_value: communityReplyFormatSignal.label,
        id: "community_reply_format",
        label: "Formato respostas",
        source: "post_reply.media_type",
        tone: communityReplyFormatSignal.tone,
        unavailable_reason: activityUnavailableReason,
        value: rowCommunityTrafficDataset.replies.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Posts e respostas autorais publicados por profissionais da categoria.",
        id: "community_content_count",
        label: "Conteúdos",
        source: "community_post.author_id+post_reply.author_id",
        unavailable_reason: communityUnavailableReason,
        value: communityContentCount,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Views médias por conteúdo autoral da categoria nas comunidades.",
        id: "community_views_per_content",
        label: "Views/conteúdo",
        source: "page_view_event.target_type=post|reply",
        unavailable_reason: communityContentUnavailableReason,
        value: communityViewsPerContent,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Permanencia media por conteudo autoral da categoria.",
        id: "community_attention_per_content",
        label: "Perman\u00eancia",
        source: "content_attention_session.attention_seconds",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          communityAttentionPerContent,
          [10, 45],
        ),
        unit: "seconds",
        unavailable_reason: communityContentUnavailableReason,
        value: communityAttentionPerContent,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Retenção média das sessões de vídeos publicados nas comunidades.",
        id: "community_video_retention",
        label: "Retenção vídeo",
        source: "content_video_watch_session.watched_seconds/duration_seconds",
        unit: "percentage",
        unavailable_reason:
          communityRetention === null && !communityUnavailableReason
            ? "Sem sessões de vídeo de comunidade com duração no período."
            : communityUnavailableReason,
        value: communityRetention,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          "Interações recebidas nos conteúdos: comentários, salvamentos, compartilhamentos e votos positivos.",
        id: "community_engagement_actions",
        label: "Interações",
        source: "post_reply+post_vote+post_save+post_reply_save+post_share",
        unavailable_reason: communityUnavailableReason,
        value: communityEngagementActions,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Votos negativos recebidos nos conteúdos da categoria.",
        id: "community_downvotes",
        label: "Downvotes",
        source: "post_vote.value=-1",
        unavailable_reason: communityUnavailableReason,
        value: communityDownvotes,
      }),
      buildProfileConversionBehaviorMetric({
        description:
          "Cliques de WhatsApp classificados como originados por posts, respostas ou Top Mentores.",
        id: "community_whatsapp_clicks",
        label: "WhatsApp comunidade",
        source: "important_action_event.action_type=whatsapp_click",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: communityWhatsappClicks,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Total de posts e respostas autorais no período.",
        id: "activity_actions",
        label: "Ações autorais",
        source: PROFILE_ACTIVITY_SOURCE,
        unavailable_reason: activityUnavailableReason,
        value: rowActivityActions,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Quantidade de posts publicados por psicólogos da categoria.",
        id: "activity_posts",
        label: "Posts",
        source: "community_post.author_id",
        unavailable_reason: activityUnavailableReason,
        value: rowCommunityTrafficDataset.posts.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Quantidade de respostas publicadas por psicólogos da categoria.",
        id: "activity_replies",
        label: "Respostas",
        source: "post_reply.author_id",
        unavailable_reason: activityUnavailableReason,
        value: rowCommunityTrafficDataset.replies.length,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Profissionais da categoria que publicaram post ou resposta no período.",
        id: "activity_active_psychologists",
        label: "Profissionais ativos",
        source: PROFILE_ACTIVITY_SOURCE,
        unavailable_reason: activityUnavailableReason,
        value: rowActivityAuthorIds.size,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Média de posts e respostas por profissional da categoria.",
        id: "activity_actions_per_psychologist",
        label: "Ações/psicólogo",
        source: PROFILE_ACTIVITY_SOURCE,
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: activityPerPsychologist,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Score ponderado de engajamento recebido em comunidades.",
        id: "engagement_score",
        label: "Score",
        source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
        unit: "score",
        unavailable_reason: engagementUnavailableReason,
        value: engagementScore,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Comentários recebidos em conteúdos de autoria dos psicólogos da categoria.",
        id: "engagement_comments_received",
        label: "Comentários",
        source: "post_reply.received.user.role=paciente",
        unavailable_reason: engagementUnavailableReason,
        value: commentsReceived,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Compartilhamentos recebidos nos conteúdos da categoria.",
        id: "engagement_content_shares",
        label: "Compartilhamentos",
        source: "post_share.received.user.role=paciente",
        unavailable_reason: engagementUnavailableReason,
        value: contentShares,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Salvamentos recebidos nos conteúdos da categoria.",
        id: "engagement_content_saves",
        label: "Salvamentos",
        source: "post_save+post_reply_save",
        unavailable_reason: engagementUnavailableReason,
        value: contentSaves,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Votos positivos recebidos nos conteúdos da categoria.",
        id: "engagement_positive_votes",
        label: "Votos positivos",
        source: "post_vote.value=1.received.user.role=paciente",
        unavailable_reason: engagementUnavailableReason,
        value: positiveVotes,
      }),
      buildProfileConversionBehaviorMetric({
        description: "Seguidores recebidos pelos profissionais da categoria.",
        id: "engagement_profile_follows",
        label: "Seguidores",
        source: "psychologist_follow.user.role=paciente",
        unavailable_reason: row.count <= 0 ? emptyRowReason : null,
        value: profileFollows,
      }),
    ],
    row_id: row.id,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason: communityUnavailableReason,
  };
};

export const buildFavoriteBehaviorCell = (
  context: ProfileConversionBehaviorRowContext,
): AdminPsychologistsDashboardProfileConversionBehaviorResults["cells"][number] => {
  const {
    row,
    favoriteHeadline,
    favoriteUnavailableReason,
    favoritesScreenWhatsappClicksPerPsychologist,
  } = context;

  return {
    element_id: "favorite",
    headline: favoriteHeadline,
    id: buildProfileConversionBehaviorCellId(row.id, "favorite"),
    metrics: [
      buildProfileConversionBehaviorMetric({
        description:
          "Media de cliques de WhatsApp originados em favoritos por profissional da faixa.",
        display_value: formatProfileConversionBehaviorPerPsychologistValue(
          favoritesScreenWhatsappClicksPerPsychologist,
        ),
        id: "favorites_screen_whatsapp_clicks_per_psychologist",
        label: "WhatsApp",
        source: "important_action_event.path=/favorites|/favoritos",
        tone: classifyProfileConversionBehaviorHigherIsBetterTone(
          favoritesScreenWhatsappClicksPerPsychologist,
          [1, 3],
        ),
        unavailable_reason: favoriteUnavailableReason,
        value: favoritesScreenWhatsappClicksPerPsychologist,
      }),
    ],
    row_id: row.id,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason: favoriteUnavailableReason,
  };
};
