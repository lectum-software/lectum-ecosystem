import {
  ADMIN_PROFILE_EXPOSURE_SOURCE,
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  buildAdminProfileExposureBenchmark,
  buildAdminProfileExposureCombinationId,
  calculateAdminProfileExposureScore,
  classifyAdminProfileExposureCommunityCategory,
  classifyAdminProfileExposureVideoCategory,
  getAdminProfileExposureCategoryConfig,
  roundAdminProfileExposureNumber,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileExposureCategoryId,
  AdminPsychologistsDashboardProfileExposureResults,
  AdminPsychologistsDashboardProfileExposureTotals,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistAttentionRecord,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistProfileRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { PROFILE_EXPOSURE_CATEGORY_ORDER } from "../support/constants";
import { safePercentage } from "../support/metrics";
import { getProfileAgeDaysUntil } from "./conversion";

export const emptyProfileExposureTotals = (): AdminPsychologistsDashboardProfileExposureTotals => ({
  community_post_attention_seconds: 0,
  community_post_views: 0,
  community_reply_attention_seconds: 0,
  community_reply_views: 0,
  exposure_score: 0,
  profile_attention_seconds: 0,
  profile_surface_attention_seconds: 0,
  profile_video_attention_seconds: 0,
  profile_views: 0,
  qualified_video_views: 0,
  search_result_impressions: 0,
  visibility_seconds: 0,
});

export const getProfileExposureCommunityVisibilitySeconds = (
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => signals.community_post_attention_seconds + signals.community_reply_attention_seconds;

export const getProfileExposureVideoVisibilitySeconds = (
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => signals.profile_video_attention_seconds;

export const addProfileExposureTotals = (
  totals: AdminPsychologistsDashboardProfileExposureTotals,
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => {
  totals.community_post_attention_seconds += signals.community_post_attention_seconds;
  totals.community_post_views += signals.community_post_views;
  totals.community_reply_attention_seconds += signals.community_reply_attention_seconds;
  totals.community_reply_views += signals.community_reply_views;
  totals.exposure_score = roundAdminProfileExposureNumber(
    totals.exposure_score + signals.exposure_score,
  );
  totals.profile_attention_seconds += signals.profile_attention_seconds;
  totals.profile_surface_attention_seconds += signals.profile_surface_attention_seconds;
  totals.profile_video_attention_seconds += signals.profile_video_attention_seconds;
  totals.profile_views += signals.profile_views;
  totals.qualified_video_views += signals.qualified_video_views;
  totals.search_result_impressions += signals.search_result_impressions;
  totals.visibility_seconds = roundAdminProfileExposureNumber(
    totals.visibility_seconds + signals.visibility_seconds,
  );
};

export const buildProfileExposureSignalTotals = (input: {
  communityPostAttentionSeconds: number;
  communityReplyAttentionSeconds: number;
  profileAttentionSeconds: number;
  profileVideoAttentionSeconds: number;
}): AdminPsychologistsDashboardProfileExposureTotals => {
  const profileSurfaceAttentionSeconds = Math.max(
    input.profileAttentionSeconds,
    input.profileVideoAttentionSeconds,
  );
  const visibilitySeconds = calculateAdminProfileExposureScore(input);

  return {
    community_post_attention_seconds: input.communityPostAttentionSeconds,
    community_post_views: 0,
    community_reply_attention_seconds: input.communityReplyAttentionSeconds,
    community_reply_views: 0,
    exposure_score: visibilitySeconds,
    profile_attention_seconds: input.profileAttentionSeconds,
    profile_surface_attention_seconds: profileSurfaceAttentionSeconds,
    profile_video_attention_seconds: input.profileVideoAttentionSeconds,
    profile_views: 0,
    qualified_video_views: 0,
    search_result_impressions: 0,
    visibility_seconds: visibilitySeconds,
  };
};

export const buildProfileExposureResults = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileExposureResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const attentionSecondsByPsychologist = (records: AdminPsychologistAttentionRecord[]) => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!analyzedPsychologistIds.has(record.psychologist_id)) continue;

      counts.set(
        record.psychologist_id,
        (counts.get(record.psychologist_id) ?? 0) + record.attention_seconds,
      );
    }

    return counts;
  };
  const contentAttentionByPsychologistAndType = (
    records: AdminPsychologistContentAttentionRecord[],
    targetType: AdminPsychologistContentAttentionRecord["target_type"],
  ) =>
    attentionSecondsByPsychologist(records.filter((record) => record.target_type === targetType));
  const profileAttentionCounts = attentionSecondsByPsychologist(params.profileAttentionSeconds);
  const profileVideoAttentionCounts = attentionSecondsByPsychologist(
    params.profileVideoAttentionSeconds,
  );
  const communityPostAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "post",
  );
  const communityReplyAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "reply",
  );
  const exposureSignalsByPsychologist = new Map<
    string,
    AdminPsychologistsDashboardProfileExposureTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    exposureSignalsByPsychologist.set(
      psychologistId,
      buildProfileExposureSignalTotals({
        communityPostAttentionSeconds: communityPostAttentionCounts.get(psychologistId) ?? 0,
        communityReplyAttentionSeconds: communityReplyAttentionCounts.get(psychologistId) ?? 0,
        profileAttentionSeconds: profileAttentionCounts.get(psychologistId) ?? 0,
        profileVideoAttentionSeconds: profileVideoAttentionCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureCommunityVisibilitySeconds(signals) : 0;
    }),
    eligiblePsychologists: eligibleProfiles.length,
    exposureScores: eligibleProfiles.map(
      (profile) => exposureSignalsByPsychologist.get(profile.user.id)?.exposure_score ?? 0,
    ),
    presentationVideoSeconds: eligibleProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureVideoVisibilitySeconds(signals) : 0;
    }),
  });
  const categories = new Map(
    PROFILE_EXPOSURE_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileExposureTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileExposureTotals(),
    adaptation_psychologists: params.profiles.length - benchmark.eligible_psychologists,
    community_visible_psychologists: 0,
    eligible_psychologists: benchmark.eligible_psychologists,
    exposed_psychologists: 0,
    psychologists: params.profiles.length,
    video_visible_psychologists: 0,
  };

  for (const profile of params.profiles) {
    const signals =
      exposureSignalsByPsychologist.get(profile.user.id) ?? emptyProfileExposureTotals();
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const communityVisibilitySeconds = getProfileExposureCommunityVisibilitySeconds(signals);
    const videoVisibilitySeconds = getProfileExposureVideoVisibilitySeconds(signals);
    const communityCategoryId = classifyAdminProfileExposureCommunityCategory({
      benchmark,
      profileAgeDays,
      visibilitySeconds: communityVisibilitySeconds,
    });
    const videoCategoryId = classifyAdminProfileExposureVideoCategory({
      benchmark,
      profileAgeDays,
      visibilitySeconds: videoVisibilitySeconds,
    });
    const categoryId: AdminPsychologistsDashboardProfileExposureCategoryId =
      communityCategoryId === "insufficient_data" || videoCategoryId === "insufficient_data"
        ? "insufficient_data"
        : buildAdminProfileExposureCombinationId({
            communityCategoryId,
            videoCategoryId,
          });
    const category = categories.get(categoryId);

    addProfileExposureTotals(totalSignals, signals);
    if (signals.exposure_score > 0) totalSignals.exposed_psychologists += 1;
    if (communityVisibilitySeconds > 0) totalSignals.community_visible_psychologists += 1;
    if (videoVisibilitySeconds > 0) totalSignals.video_visible_psychologists += 1;
    if (category) {
      category.count += 1;
      addProfileExposureTotals(category.totals, signals);
    }
  }

  return {
    benchmark,
    categories: PROFILE_EXPOSURE_CATEGORY_ORDER.map((id) => {
      const config = getAdminProfileExposureCategoryConfig(id);
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileExposureTotals(),
      };

      return {
        community_id: config.community_id,
        community_label: config.community_label,
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, params.profiles.length),
        totals: values.totals,
        video_id: config.video_id,
        video_label: config.video_label,
      };
    }),
    description:
      "Classificação interna e agregada que cruza a Visibilidade em conteúdo autoral nas comunidades (feed, páginas de comunidade e detalhes; texto, imagem ou vídeo) com o tempo assistido no vídeo de apresentação. Não conta aparição em listagem nem WhatsApp como Visibilidade.",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
    thresholds: ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Visibilidade."
        : null,
  };
};
