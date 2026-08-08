import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { ADMIN_PROFILE_CONVERSION_SOURCE } from "@/utils/admin-profile-conversion";
import { summarizeConversionCohort } from "@/utils/admin-psychologist-analytics";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsDashboardQuery,
  AdminPsychologistsDashboardSummary,
  IAdminPsychologistsDashboardDTO,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import { AdminPsychologistsDashboardRepository } from "../repositories/AdminPsychologistsDashboardRepository";
import {
  buildPlanSegmentSummaries,
  buildPsychologistsList,
  getAllPeriodStartDate,
  roundRankingScore,
} from "./services/dashboard/plan-summary";
import { buildConversionBySignupMethod } from "./services/dashboard/statistics";
import { buildFilterSearches } from "./services/directory/filters";
import {
  collectWhatsappTrafficTargetIds,
  hasActiveCourtesyAt,
  hasActiveSubscriberAt,
  hasCurrentFreePlanAt,
  profileCreatedUntil,
} from "./services/plan/segments";
import {
  buildOperatingSystemUsage,
  buildPsychologistVisitorIds,
  collectPreSignupConversionVisitorIds,
  dateInRange,
  latestPsychologistSignupDate,
  normalizeName,
  summarizePreSignupConversion,
} from "./services/pre-signup/conversion";
import { buildTimeline, calculateChurnPercent } from "./services/subscriptions/timeline";
import { metric, resolvePeriod } from "./services/support/metrics";

export const buildPsychologistsDashboard = async (
  query: AdminPsychologistsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPsychologistsDashboardRepository();
  const [profiles, directoryFilters] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listDirectoryFilters(),
  ]);
  const resolvedPeriod = resolvePeriod(query ?? {}, getAllPeriodStartDate(profiles));
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;

  const currentNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, current),
  );
  const currentPeriodPsychologistIds = currentNewSignups.map((profile) => profile.user.id);
  const psychologistUserIds = profiles.map((profile) => profile.user.id);
  const [
    directoryFilterSearchActions,
    rankingCandidates,
    platformPageViews,
    platformSessions,
    platformPwaInstalls,
    whatsappTrafficActions,
    whatsappContactRequests,
    communityTrafficPlatformMetricDataset,
    profileTrafficPlatformMetricDataset,
    publishedReviews,
    preSignupConversionLinkedPageViews,
    preSignupConversionLinkedSessions,
    preSignupConversionSignupIdentities,
  ] = await Promise.all([
    repository.listDirectoryFilterSearchActions(current),
    repository.listPublicRankingCandidates(),
    repository.listPlatformPageViews(current),
    repository.listPlatformSessions(current),
    repository.listPlatformPwaInstallActions(current),
    repository.listWhatsappTrafficActions(current),
    repository.listWhatsappContactRequests(current),
    repository.listCommunityTrafficPlatformMetricDataset(current),
    repository.listProfileTrafficPlatformMetricDataset(current, psychologistUserIds),
    repository.listPublishedReviews(current),
    repository.listPreSignupConversionLinkedPageViews(currentPeriodPsychologistIds),
    repository.listPreSignupConversionLinkedSessions(currentPeriodPsychologistIds),
    repository.listPreSignupConversionSignupIdentities(currentPeriodPsychologistIds),
  ]);
  const [trafficCommunityPosts, trafficCommunityReplies] = await Promise.all([
    repository.listTrafficCommunityPosts(
      collectWhatsappTrafficTargetIds(whatsappTrafficActions, new Set(["community_post", "post"])),
    ),
    repository.listTrafficCommunityReplies(
      collectWhatsappTrafficTargetIds(whatsappTrafficActions, new Set(["post_reply", "reply"])),
    ),
  ]);
  const receivedEngagementEvents = await repository.listReceivedEngagementEvents(current);
  const [communityContentAttentionSeconds, profileAttentionSeconds, profileVideoAttentionSeconds] =
    await Promise.all([
      repository.listCommunityContentAttentionSeconds(current),
      repository.listProfileAttentionSeconds(current, psychologistUserIds),
      repository.listProfileVideoAttentionSeconds(current),
    ]);
  const preSignupConversionVisitorIds = collectPreSignupConversionVisitorIds(
    buildPsychologistVisitorIds({
      linkedPageViews: preSignupConversionLinkedPageViews,
      linkedSessions: preSignupConversionLinkedSessions,
      psychologistIds: new Set(currentPeriodPsychologistIds),
      signupIdentities: preSignupConversionSignupIdentities,
    }),
  );
  const preSignupConversionMaxSignupDate = latestPsychologistSignupDate(currentNewSignups);
  const [preSignupConversionPageViews, preSignupConversionSessions] = await Promise.all([
    repository.listPreSignupConversionPageViewsByVisitorIds(
      preSignupConversionVisitorIds,
      currentPeriodPsychologistIds,
      preSignupConversionMaxSignupDate,
    ),
    repository.listPreSignupConversionSessionsByVisitorIds(
      preSignupConversionVisitorIds,
      currentPeriodPsychologistIds,
      preSignupConversionMaxSignupDate,
    ),
  ]);

  const currentProfiles = profiles.filter((profile) => profileCreatedUntil(profile, current.end));
  const previousProfiles = profiles.filter((profile) => profileCreatedUntil(profile, previous.end));
  const previousNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, previous),
  );
  const currentFree = currentProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, current.end),
  );
  const previousFree = previousProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, previous.end),
  );
  const currentSubscribers = currentProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, current.end),
  );
  const previousSubscribers = previousProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, previous.end),
  );
  const currentCourtesy = currentProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, current.end),
  );
  const previousCourtesy = previousProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, previous.end),
  );
  const currentChurn = calculateChurnPercent(profiles, current);
  const previousChurn = calculateChurnPercent(profiles, previous);
  const rankedPsychologists = await rankPsychologistCandidates(rankingCandidates, null);
  const rankingPositionsByPsychologistId = new Map(
    rankedPsychologists.map(({ item }, index) => [item.user.id, index + 1]),
  );
  const conversion = summarizeConversionCohort(currentNewSignups);
  const preSignupConversion = summarizePreSignupConversion({
    linkedPageViews: preSignupConversionLinkedPageViews,
    linkedSessions: preSignupConversionLinkedSessions,
    pageViews: preSignupConversionPageViews,
    period,
    profiles: currentNewSignups,
    sessions: preSignupConversionSessions,
    signupIdentities: preSignupConversionSignupIdentities,
  });
  const planSegments = buildPlanSegmentSummaries({
    communityTrafficPlatformMetricDataset,
    communityContentAttentionSeconds,
    currentNewSignups,
    currentProfiles,
    date: current.end,
    labels,
    platformPageViews,
    platformPwaInstalls,
    platformSessions,
    period,
    preSignupConversionLinkedPageViews,
    preSignupConversionLinkedSessions,
    preSignupConversionPageViews,
    preSignupConversionSessions,
    preSignupConversionSignupIdentities,
    profileAttentionSeconds,
    profileTrafficPlatformMetricDataset,
    profileVideoAttentionSeconds,
    profiles,
    publishedReviews,
    rankingPositionsByPsychologistId,
    range: current,
    receivedEngagementEvents,
    trafficCommunityPosts,
    trafficCommunityReplies,
    whatsappTrafficActions,
    whatsappContactRequests,
  });
  const platformUsage = planSegments.all.platform_usage;
  const deviceUsage = planSegments.all.device_usage;
  const operatingSystemUsage = buildOperatingSystemUsage(platformSessions);
  const trafficSources = planSegments.all.traffic_sources;
  const profileActivity = planSegments.all.profile_activity;
  const profileCoverage = planSegments.all.profile_coverage;
  const profileConversionActivity = planSegments.all.profile_conversion_activity;
  const profileConversionBehavior = planSegments.all.profile_conversion_behavior;
  const profileConversionGoal = planSegments.all.profile_conversion_goal;
  const profileCrossMatrix = planSegments.all.profile_cross_matrix;
  const profileConversion = planSegments.all.profile_conversion;
  const profileConversionEngagement = planSegments.all.profile_conversion_engagement;
  const profileConversionEngagementFavorites =
    planSegments.all.profile_conversion_engagement_favorites;
  const profileConversionVisibility = planSegments.all.profile_conversion_visibility;
  const profileEngagementFavorites = planSegments.all.profile_engagement_favorites;
  const profileExposure = planSegments.all.profile_exposure;
  const statistics = planSegments.all.statistics;
  const profileNameByUserId = new Map(
    profiles.map((profile) => [profile.user.id, profile.user.name]),
  );

  const summary: AdminPsychologistsDashboardSummary = {
    cards: {
      churn: metric({
        current: currentChurn.value,
        description:
          "Cancelamentos de assinaturas profissionais Mercado Pago no período ÷ base paga ativa no início do período. Novas assinaturas do período não entram no denominador; cortesias e plano gratuito não entram.",
        id: "churn",
        label: "Churn",
        previous: previousChurn.value,
        previousValueCount: previousChurn.canceled,
        source: "professional_subscription.source=mercadopago/status=cancelada",
        unit: "percentage",
        unavailable: currentChurn.denominator === 0,
        valueCount: currentChurn.canceled,
        ...(currentChurn.denominator === 0
          ? {
              unavailableReason:
                "Não há base paga Mercado Pago ativa no início do período para calcular churn.",
            }
          : {}),
      }),
      courtesy_psychologists: metric({
        current: currentCourtesy.length,
        description:
          "Psicólogos com cortesia administrativa profissional ativa no fim do período selecionado.",
        id: "courtesy_psychologists",
        label: "Psicólogos cortesia",
        previous: previousCourtesy.length,
        source: "professional_subscription.source=admin_grant/status=ativa",
      }),
      free_psychologists: metric({
        current: currentFree.length,
        description:
          "Psicólogos cujo segmento ativo no fim do período é o plano gratuito; assinantes pagos e cortesias são contados separadamente.",
        id: "free_psychologists",
        label: "Psicólogos gratuitos",
        previous: previousFree.length,
        source: "professional_subscription.plan.slug=gratuito/status=ativa",
      }),
      new_signups: metric({
        current: currentNewSignups.length,
        description: "Novos usuários com role psicologo criados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewSignups.length,
        source: "user.createdAt/role=psicologo",
      }),
      subscriber_psychologists: metric({
        current: currentSubscribers.length,
        description:
          "Psicólogos com assinatura profissional paga Mercado Pago ativa no fim do período selecionado.",
        id: "subscriber_psychologists",
        label: "Psicólogos assinantes",
        previous: previousSubscribers.length,
        source: "professional_subscription.source=mercadopago/status=ativa",
      }),
      total_psychologists: metric({
        current: currentProfiles.length,
        description:
          "Usuários ativos com role psicologo e perfil profissional não deletado existentes até o fim do período.",
        id: "total_psychologists",
        label: "Total de psicólogos",
        previous: previousProfiles.length,
        source: "user.role=psicologo+psychologist_profile",
      }),
    },
    conversion: {
      ...conversion,
      cohort_from: period.from,
      cohort_to: period.to,
      source: "user.createdAt+professional_subscription+subscription_plan",
    },
    conversion_by_signup_method: buildConversionBySignupMethod(currentNewSignups),
    device_usage: deviceUsage,
    filters_searches: buildFilterSearches({
      actions: directoryFilterSearchActions,
      citySupplyItems: statistics.cities.items,
      directoryFilters,
    }),
    pre_signup_conversion: preSignupConversion,
    directory_filters: directoryFilters,
    operating_system_usage: operatingSystemUsage,
    plan_segments: planSegments,
    period,
    platform_usage: platformUsage,
    psychologists: {
      items: buildPsychologistsList(profiles, current.end),
      source: "user+psychologist_profile+professional_subscription",
      total: profiles.length,
    },
    ranking: {
      formula: "public_directory_psychologist_ranking",
      items: rankedPsychologists.slice(0, 5).map(({ item, ranking }, index) => ({
        avatar: item.user.avatar,
        base_score: roundRankingScore(ranking.baseScore),
        crp: item.crp,
        id: item.user.id,
        name: normalizeName(profileNameByUserId.get(item.user.id) ?? "Psicólogo"),
        position: index + 1,
        public_profile_url: `/psicologos/${item.user.id}`,
        score: roundRankingScore(ranking.score),
        verified: ranking.isVerified,
      })),
      source: "shared_psychologist_public_ranking_helper",
      total: rankedPsychologists.length,
    },
    signup_method: planSegments.all.signup_method,
    statistics,
    timeline: {
      points: buildTimeline({
        labels,
        profiles,
      }),
      source: "user+professional_subscription",
    },
    profile_activity: profileActivity,
    profile_coverage: profileCoverage,
    profile_conversion_activity: profileConversionActivity,
    profile_conversion_behavior: profileConversionBehavior,
    profile_conversion_goal: profileConversionGoal,
    profile_cross_matrix: profileCrossMatrix,
    profile_conversion: profileConversion,
    profile_engagement_favorites: profileEngagementFavorites,
    profile_conversion_engagement: profileConversionEngagement,
    profile_conversion_engagement_favorites: profileConversionEngagementFavorites,
    profile_conversion_visibility: profileConversionVisibility,
    profile_exposure: profileExposure,
    traffic_sources: {
      ...trafficSources,
      source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click",
    },
    unavailable: [
      ...(profileActivity.unavailable_reason
        ? [
            {
              description:
                "A Atividade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_activity",
              label: "Atividade dos psicólogos",
              source: profileActivity.source,
            },
          ]
        : []),
      ...(profileCoverage.unavailable_reason
        ? [
            {
              description:
                "A Cobertura depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_coverage",
              label: "Cobertura dos psicólogos",
              source: profileCoverage.source,
            },
          ]
        : []),
      ...(profileConversionActivity.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversao x Atividade depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_conversion_activity",
              label: "Conversao x Atividade",
              source: profileConversionActivity.source,
            },
          ]
        : []),
      ...(profileConversionBehavior.unavailable_reason
        ? [
            {
              description:
                "A tabela comportamental por Conversao depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_conversion_behavior",
              label: "Tabela comportamental por Conversao",
              source: profileConversionBehavior.source,
            },
          ]
        : []),
      ...(profileConversionGoal.unavailable_reason
        ? [
            {
              description:
                "A Meta de conversao depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_conversion_goal",
              label: "Meta de conversao",
              source: profileConversionGoal.source,
            },
          ]
        : []),
      ...(profileCrossMatrix.unavailable_reason
        ? [
            {
              description:
                "A matriz de cruzamento de dados depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_cross_matrix",
              label: "Matriz de cruzamento de dados",
              source: profileCrossMatrix.source,
            },
          ]
        : []),
      ...(profileConversion.unavailable_reason
        ? [
            {
              description:
                "A Conversão depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion",
              label: "Conversão dos psicólogos",
              source: ADMIN_PROFILE_CONVERSION_SOURCE,
            },
          ]
        : []),
      ...(profileExposure.unavailable_reason
        ? [
            {
              description:
                "A Visibilidade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_exposure",
              label: "Visibilidade dos psicólogos",
              source: profileExposure.source,
            },
          ]
        : []),
      ...(profileConversionEngagement.unavailable_reason
        ? [
            {
              description:
                "O comparativo Conversão x Engajamento depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion_engagement",
              label: "Conversão x Engajamento",
              source: profileConversionEngagement.source,
            },
          ]
        : []),
      ...(profileConversionEngagementFavorites.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversão x Engajamentos e Favoritos depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion_engagement_favorites",
              label: "Conversão x Engajamentos e Favoritos",
              source: profileConversionEngagementFavorites.source,
            },
          ]
        : []),
      ...(profileConversionVisibility.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversão x Visibilidade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion_visibility",
              label: "Conversão x Visibilidade",
              source: profileConversionVisibility.source,
            },
          ]
        : []),
      ...(profileEngagementFavorites.unavailable_reason
        ? [
            {
              description:
                "Engajamento e Favoritos depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_engagement_favorites",
              label: "Engajamento e Favoritos",
              source: profileEngagementFavorites.source,
            },
          ]
        : []),
      ...(trafficSources.unavailable_reason
        ? [
            {
              description:
                "Origem do tráfego agregada depende de important_action_event de WhatsApp no período selecionado.",
              id: "traffic_sources",
              label: "Origem do tráfego",
              source: "important_action_event",
            },
          ]
        : []),
      ...(preSignupConversion.unavailable_reason
        ? [
            {
              description: preSignupConversion.unavailable_reason,
              id: "pre_signup_conversion",
              label: "Conversão até o cadastro",
              source: preSignupConversion.source,
            },
          ]
        : []),
      ...(currentChurn.denominator === 0
        ? [
            {
              description:
                "Churn exige assinaturas profissionais Mercado Pago ativas no início do período; não há base para o período atual.",
              id: "churn_denominator_zero",
              label: "Churn de assinaturas",
              source: "professional_subscription",
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "Uso da plataforma por psicólogos depende de page_view_event autenticado no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
            },
          ]
        : []),
      ...(deviceUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de devices dos psicólogos depende de visitor_session autenticada com user.role=psicologo no período selecionado.",
              id: "psychologist_device_usage",
              label: "Devices dos psicólogos",
              source: "visitor_session",
            },
          ]
        : []),
      ...(operatingSystemUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de sistemas operacionais dos psicólogos depende de visitor_session autenticada com os normalizado no período selecionado.",
              id: "psychologist_operating_system_usage",
              label: "Sistema operacional dos psicólogos",
              source: "visitor_session",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminPsychologistsDashboardDTO): Promise<Resolve> => {
  return buildPsychologistsDashboard(data.q ?? {});
};
