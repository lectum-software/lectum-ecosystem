import type {
  AdminProfileEngagementFavoritesCategoryId,
  AdminProfileEngagementFavoritesCommunityCategoryId,
  AdminProfileEngagementFavoritesFavoriteCategoryId,
} from "@/utils/admin-profile-engagement-favorites";
import {
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
  buildAdminProfileEngagementFavoritesBenchmark,
  buildAdminProfileEngagementFavoritesCombinationId,
  calculateAdminProfileEngagementFavoritesCommunityScore,
  classifyAdminProfileEngagementFavoritesCommunityCategory,
  classifyAdminProfileEngagementFavoritesFavoriteCategory,
  getAdminProfileEngagementFavoritesCombinationConfig,
} from "@/utils/admin-profile-engagement-favorites";
import { roundOneDecimal } from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileEngagementFavoritesResults,
  AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistReceivedEngagementEventRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { safePercentage } from "../support/metrics";
import { countEventsByPsychologist, getProfileAgeDaysUntil } from "./conversion";

type ReceivedEngagementSignalCounts = {
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  interactions: number;
  normalizedInteractions: number;
  normalizedWeightedScore: number;
  positiveVotes: number;
  profileFavorites: number;
  profileFollows: number;
  uncappedNormalizedWeightedScore: number;
};

export const emptyReceivedEngagementSignalCounts = (): ReceivedEngagementSignalCounts => ({
  commentsReceived: 0,
  contentSaves: 0,
  contentShares: 0,
  interactions: 0,
  normalizedInteractions: 0,
  normalizedWeightedScore: 0,
  positiveVotes: 0,
  profileFavorites: 0,
  profileFollows: 0,
  uncappedNormalizedWeightedScore: 0,
});

export const countReceivedEngagementEventsByPsychologist = (
  events: AdminPsychologistReceivedEngagementEventRecord[],
) => {
  const counts = new Map<string, ReceivedEngagementSignalCounts>();

  for (const event of events) {
    const current = counts.get(event.psychologist_id) ?? emptyReceivedEngagementSignalCounts();

    current.interactions += 1;
    if (event.type === "comment_received") current.commentsReceived += 1;
    if (event.type === "content_save") current.contentSaves += 1;
    if (event.type === "content_share") current.contentShares += 1;
    if (event.type === "positive_vote") current.positiveVotes += 1;
    if (event.type === "profile_favorite") current.profileFavorites += 1;
    if (event.type === "profile_follow") current.profileFollows += 1;

    counts.set(event.psychologist_id, current);
  }

  return counts;
};

export const emptyProfileEngagementFavoritesTotals =
  (): AdminPsychologistsDashboardProfileEngagementFavoritesTotals => ({
    comments_received: 0,
    community_engagement_score: 0,
    content_saves: 0,
    content_shares: 0,
    favorites: 0,
    positive_votes: 0,
    received_community_interactions: 0,
    whatsapp_clicks: 0,
  });

export const addProfileEngagementFavoritesTotals = (
  target: AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
  source: AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
) => {
  target.comments_received += source.comments_received;
  target.community_engagement_score = roundOneDecimal(
    target.community_engagement_score + source.community_engagement_score,
  );
  target.content_saves += source.content_saves;
  target.content_shares += source.content_shares;
  target.favorites += source.favorites;
  target.positive_votes += source.positive_votes;
  target.received_community_interactions += source.received_community_interactions;
  target.whatsapp_clicks += source.whatsapp_clicks;
};

export const buildProfileEngagementFavoritesSignalTotals = (input: {
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  favorites: number;
  positiveVotes: number;
  whatsappClicks: number;
}): AdminPsychologistsDashboardProfileEngagementFavoritesTotals => {
  const communityEngagementScore = calculateAdminProfileEngagementFavoritesCommunityScore({
    commentsReceived: input.commentsReceived,
    contentSaves: input.contentSaves,
    contentShares: input.contentShares,
    positiveVotes: input.positiveVotes,
  });

  return {
    comments_received: input.commentsReceived,
    community_engagement_score: communityEngagementScore,
    content_saves: input.contentSaves,
    content_shares: input.contentShares,
    favorites: input.favorites,
    positive_votes: input.positiveVotes,
    received_community_interactions:
      input.commentsReceived + input.contentSaves + input.contentShares + input.positiveVotes,
    whatsapp_clicks: input.whatsappClicks,
  };
};

export const getProfileEngagementFavoritesCategoryConfig = (
  id: AdminProfileEngagementFavoritesCategoryId,
) => {
  if (id === "insufficient_data") {
    return {
      description: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG.description,
      engagement_id: null,
      engagement_label: null,
      favorites_id: null,
      favorites_label: null,
      label: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG.label,
    };
  }

  const communityId = ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER.find(
    (candidate) => id.startsWith(`${candidate}_`),
  ) as AdminProfileEngagementFavoritesCommunityCategoryId;
  const favoritesId = id.slice(
    `${communityId}_`.length,
  ) as AdminProfileEngagementFavoritesFavoriteCategoryId;
  const config = getAdminProfileEngagementFavoritesCombinationConfig({
    communityCategoryId: communityId,
    favoriteCategoryId: favoritesId,
  });

  return {
    description: config.description,
    engagement_id: communityId,
    engagement_label:
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG[communityId].label,
    favorites_id: favoritesId,
    favorites_label: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG[favoritesId].label,
    label: config.label,
  };
};

export const buildProfileEngagementFavoritesResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileEngagementFavoritesResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileEngagementFavoritesTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const counts =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();

    signalsByPsychologistId.set(
      psychologistId,
      buildProfileEngagementFavoritesSignalTotals({
        commentsReceived: counts.commentsReceived,
        contentSaves: counts.contentSaves,
        contentShares: counts.contentShares,
        favorites: counts.profileFavorites,
        positiveVotes: counts.positiveVotes,
        whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileEngagementFavoritesBenchmark({
    communityEngagementScores: eligibleProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.community_engagement_score ?? 0,
    ),
    eligiblePsychologists: eligibleProfiles.length,
    favoriteCounts: eligibleProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.favorites ?? 0,
    ),
  });
  const categories = new Map(
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileEngagementFavoritesTotals(),
    adaptation_psychologists: params.profiles.length - eligibleProfiles.length,
    eligible_psychologists: eligibleProfiles.length,
    engaged_psychologists: 0,
    favorited_psychologists: 0,
    psychologists: params.profiles.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const signals =
      signalsByPsychologistId.get(psychologistId) ?? emptyProfileEngagementFavoritesTotals();
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const communityCategoryId = classifyAdminProfileEngagementFavoritesCommunityCategory({
      benchmark,
      engagementScore: signals.community_engagement_score,
      profileAgeDays,
    });
    const favoriteCategoryId = classifyAdminProfileEngagementFavoritesFavoriteCategory({
      benchmark,
      favorites: signals.favorites,
      profileAgeDays,
    });
    const categoryId =
      communityCategoryId === "insufficient_data" || favoriteCategoryId === "insufficient_data"
        ? "insufficient_data"
        : buildAdminProfileEngagementFavoritesCombinationId({
            communityCategoryId,
            favoriteCategoryId,
          });
    const category = categories.get(categoryId);

    addProfileEngagementFavoritesTotals(totalSignals, signals);
    if (signals.community_engagement_score > 0) totalSignals.engaged_psychologists += 1;
    if (signals.favorites > 0) totalSignals.favorited_psychologists += 1;
    if (category) {
      category.count += 1;
      addProfileEngagementFavoritesTotals(category.totals, signals);
    }
  }

  return {
    benchmark,
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER.map((id) => {
      const config = getProfileEngagementFavoritesCategoryConfig(id);
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        engagement_id: config.engagement_id,
        engagement_label: config.engagement_label,
        favorites_id: config.favorites_id,
        favorites_label: config.favorites_label,
        id,
        label: config.label,
        percentage: safePercentage(values.count, params.profiles.length),
        totals: values.totals,
      };
    }),
    description:
      "Classificação interna e agregada que cruza relacionamento recebido na comunidade com favoritos recebidos no período; usada para entender o funil até WhatsApp sem alterar ranking público ou punir psicólogos.",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
    thresholds: {
      ...ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
      score: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG,
    },
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Engajamento e Favoritos."
        : null,
  };
};
