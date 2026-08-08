import type {
  AdminModerationOperationalAlertDTO,
  AdminModerationOperationalAlertsDTO,
  AdminModerationOperationalAlertsQuery,
} from "../../DTOs/IAdminModerationDTO";
import type { AdminModerationRepository } from "../../repositories/AdminModerationRepository";
import type { AdminOperationalPsychologistRecord } from "../../repositories/interfaces/IAdminModerationRepository";
import {
  buildPatientCommunityEngagementByTarget,
  countMap,
  createPatientCommunityEngagementCounts,
  hasRegistryApproval,
  hasValidWhatsapp,
  isProfessionalSubscription,
  mapRegistrationFailureAlert,
  mapReportAlert,
  mapUncoveredPatientPostAlert,
  missingRequiredPublishingSettings,
  patientCommunityEngagementKey,
  patientCommunityEngagementSummary,
  pickCurrentSubscription,
  profileStartedAt,
  psychologistAlertUser,
  psychologistLabel,
  psychologistRoleLabel,
  subscriptionPlanLabel,
  whatsappStatusLabel,
} from "./alert-signals";
import { DAY_IN_MS, HOUR_IN_MS, POST_COVERAGE_HOURS, PSYCHOLOGIST_ADAPTATION_DAYS } from "./events";

import { excludedOperationalDimensions, hoursSince, humanAge, priorityWeight } from "./reports";

export const buildPsychologistAlerts = (
  profiles: AdminOperationalPsychologistRecord[],
  profileViewCounts: Map<string, number>,
  whatsappClickCounts: Map<string, number>,
  now: Date,
) => {
  const alerts: AdminModerationOperationalAlertDTO[] = [];
  let professionalCrpPending = 0;
  let invalidWhatsapp = 0;
  let unpublishedRequiredSettings = 0;
  let psychologistNoConversionAfterAdaptation = 0;
  const adaptationCutoff = new Date(now.getTime() - PSYCHOLOGIST_ADAPTATION_DAYS * DAY_IN_MS);

  for (const profile of profiles) {
    const currentSubscription = pickCurrentSubscription(profile, now);
    if (!currentSubscription) continue;

    const name = psychologistLabel(profile);
    const href = `/psicologos/${profile.user_id}`;
    const isProfessional = isProfessionalSubscription(currentSubscription);
    const registryVerified = hasRegistryApproval(profile);
    const user = psychologistAlertUser(profile, name, registryVerified);
    const profileViews = profileViewCounts.get(profile.user_id) ?? 0;
    const whatsappClicks = whatsappClickCounts.get(profile.user_id) ?? 0;
    const currentPlanLabel = subscriptionPlanLabel(currentSubscription);
    const professional = {
      gender: profile.gender,
      id: profile.user_id,
      is_subscriber: isProfessional,
      name,
      registry_verified: registryVerified,
      role_label: psychologistRoleLabel(profile),
      show_verified_badge: isProfessional && registryVerified,
    };

    if (isProfessional && !registryVerified) {
      professionalCrpPending += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profileStartedAt(currentSubscription), now),
        community: null,
        created_at: profileStartedAt(currentSubscription),
        description: `${name} possui Plano Profissional ativo sem CRP/CFP aprovado ou cortesia administrativa reconhecida.`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Status CRP", value: profile.crp_status },
          { label: "Publicado", value: profile.published ? "sim" : "não" },
          { label: "Origem", value: currentSubscription.source },
          { label: "No plano há", value: humanAge(profileStartedAt(currentSubscription), now) },
        ],
        group: "compliance",
        id: `professional-crp-${profile.id}`,
        priority: "urgent",
        professional,
        source: "psychologist_profile+professional_subscription",
        title: "CRP não aprovado no Plano Profissional",
        type: "professional_crp_pending",
        user,
      });
    }

    if (!hasValidWhatsapp(profile.whatsapp)) {
      invalidWhatsapp += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profile.updatedAt, now),
        community: null,
        created_at: profile.updatedAt,
        description:
          "O perfil não possui número suficiente para gerar link wa.me confiável. Esta checagem é sintática e não valida entrega externa do WhatsApp.",
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "WhatsApp", value: whatsappStatusLabel(profile.whatsapp) },
          { label: "Publicado", value: profile.published ? "sim" : "não" },
          { label: "Origem", value: currentSubscription.source },
        ],
        group: "compliance",
        id: `invalid-whatsapp-${profile.id}`,
        priority: "high",
        professional,
        source: "psychologist_profile.whatsapp",
        title: "WhatsApp ausente ou inválido",
        type: "invalid_whatsapp",
        user,
      });
    }

    const missingSettings = missingRequiredPublishingSettings(profile, currentSubscription);
    if (!profile.published && missingSettings.length > 0) {
      unpublishedRequiredSettings += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profile.updatedAt, now),
        community: null,
        created_at: profile.updatedAt,
        description: `Perfil não publicado por pendências obrigatórias: ${missingSettings
          .slice(0, 5)
          .join(", ")}${missingSettings.length > 5 ? "…" : "."}`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Pendências", value: String(missingSettings.length) },
          { label: "Motivo inativo", value: missingSettings.join(", ") },
          { label: "Publicado", value: profile.published ? "sim" : "não" },
          { label: "Primeiras", value: missingSettings.slice(0, 3).join(", ") },
        ],
        group: "operacional",
        id: `unpublished-settings-${profile.id}`,
        priority: "medium",
        source: "psychologist_profile+catalog_relations",
        title: "Perfil não publicado por configurações obrigatórias",
        type: "unpublished_required_settings",
        user,
      });
    }

    if (
      isProfessional &&
      profile.published &&
      profileStartedAt(currentSubscription) <= adaptationCutoff &&
      profileViews === 0 &&
      whatsappClicks === 0
    ) {
      psychologistNoConversionAfterAdaptation += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profileStartedAt(currentSubscription), now),
        community: null,
        created_at: profileStartedAt(currentSubscription),
        description: `${name} está publicado no Plano Profissional há ${humanAge(
          profileStartedAt(currentSubscription),
          now,
        )} sem visitas de perfil e sem cliques no WhatsApp.`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Na plataforma", value: humanAge(profile.createdAt, now) },
          { label: "Visitas", value: String(profileViews) },
          { label: "Cliques WhatsApp", value: String(whatsappClicks) },
          { label: "Publicado", value: profile.published ? "sim" : "não" },
          { label: "Adaptação", value: `${PSYCHOLOGIST_ADAPTATION_DAYS} dias` },
          {
            label: "Critérios de adaptação",
            value: [
              "plano profissional ativo",
              "perfil publicado",
              `${PSYCHOLOGIST_ADAPTATION_DAYS} dias de adaptação concluídos`,
              `${profileViews} visitas de perfil`,
              `${whatsappClicks} cliques no WhatsApp`,
            ].join("; "),
          },
        ],
        group: "operacional",
        id: `no-conversion-${profile.id}`,
        priority: "medium",
        source: "professional_subscription+profile_view_event+contact_request",
        title: "Psicólogo sem conversão após adaptação",
        type: "psychologist_no_conversion",
        user,
      });
    }
  }

  return {
    alerts,
    counts: {
      invalidWhatsapp,
      professionalCrpPending,
      psychologistNoConversionAfterAdaptation,
      unpublishedRequiredSettings,
    },
  };
};

export const sortOperationalAlertsByLatest = (
  left: AdminModerationOperationalAlertDTO,
  right: AdminModerationOperationalAlertDTO,
) => {
  const dateDelta = right.created_at.getTime() - left.created_at.getTime();
  if (dateDelta !== 0) return dateDelta;

  const priorityDelta = priorityWeight[left.priority] - priorityWeight[right.priority];
  if (priorityDelta !== 0) return priorityDelta;

  return left.id.localeCompare(right.id);
};

export type BuildOperationalAlertsOptions = {
  itemLimit?: number;
};

export type NormalizedOperationalAlertsQuery = Required<
  Pick<
    AdminModerationOperationalAlertsQuery,
    | "alertType"
    | "contentType"
    | "group"
    | "plan"
    | "profileStatus"
    | "reason"
    | "reporter"
    | "status"
    | "userRole"
  >
> &
  Pick<AdminModerationOperationalAlertsQuery, "from" | "limit" | "page" | "q" | "to">;

export const buildOperationalAlerts = async (
  repository: AdminModerationRepository,
  options: BuildOperationalAlertsOptions = {},
): Promise<AdminModerationOperationalAlertsDTO> => {
  const now = new Date();
  const uncoveredCutoff = new Date(now.getTime() - POST_COVERAGE_HOURS * HOUR_IN_MS);
  const itemLimit = options.itemLimit;
  const [
    pendingReports,
    latestReports,
    uncoveredPostsCount,
    uncoveredPosts,
    psychologistProfiles,
    registrationErrors,
    registrationFailureUsers,
  ] = await Promise.all([
    repository.countPendingPostReports(),
    repository.listPendingPostReports(itemLimit),
    repository.countUncoveredPatientPosts(uncoveredCutoff),
    repository.listUncoveredPatientPosts(uncoveredCutoff, itemLimit),
    repository.listOperationalPsychologistProfiles(),
    repository.countRegistrationFailureUsers(),
    repository.listRegistrationFailureUsers(itemLimit),
  ]);
  const psychologistIds = psychologistProfiles.map((profile) => profile.user_id);
  const patientCommunityEngagementTargets = uncoveredPosts.map((post) => ({
    communityId: post.community.id,
    userId: post.author.id,
  }));
  const [profileViews, whatsappClicks, patientCommunityEngagementSignals] = await Promise.all([
    repository.countProfileViewsByPsychologist(psychologistIds),
    repository.countWhatsappClicksByPsychologist(psychologistIds),
    repository.listPatientCommunityEngagementSignals(patientCommunityEngagementTargets),
  ]);
  const patientCommunityEngagementByTarget = buildPatientCommunityEngagementByTarget(
    patientCommunityEngagementTargets,
    patientCommunityEngagementSignals,
  );
  const psychologistAlerts = buildPsychologistAlerts(
    psychologistProfiles,
    countMap(profileViews),
    countMap(whatsappClicks),
    now,
  );
  const reportAlerts = latestReports.map((report) => mapReportAlert(report, now));
  const registrationAlerts = registrationFailureUsers.map((user) =>
    mapRegistrationFailureAlert(user, now),
  );
  const uncoveredPostAlerts = uncoveredPosts.map((post) =>
    mapUncoveredPatientPostAlert(
      post,
      now,
      patientCommunityEngagementByTarget.get(
        patientCommunityEngagementKey(post.author.id, post.community.id),
      ) ?? patientCommunityEngagementSummary(createPatientCommunityEngagementCounts()),
    ),
  );
  const complianceTotal =
    psychologistAlerts.counts.professionalCrpPending + psychologistAlerts.counts.invalidWhatsapp;
  const operationalTotal =
    uncoveredPostsCount +
    registrationErrors +
    psychologistAlerts.counts.unpublishedRequiredSettings +
    psychologistAlerts.counts.psychologistNoConversionAfterAdaptation;
  const urgentTotal = pendingReports + psychologistAlerts.counts.professionalCrpPending;
  const items = [
    ...reportAlerts,
    ...registrationAlerts,
    ...uncoveredPostAlerts,
    ...psychologistAlerts.alerts,
  ].sort(sortOperationalAlertsByLatest);

  return {
    counts: {
      compliance_total: complianceTotal,
      invalid_whatsapp: psychologistAlerts.counts.invalidWhatsapp,
      operational_total: operationalTotal,
      patient_posts_without_coverage_48h: uncoveredPostsCount,
      pending_reports: pendingReports,
      professional_crp_pending: psychologistAlerts.counts.professionalCrpPending,
      psychologist_no_conversion_after_adaptation:
        psychologistAlerts.counts.psychologistNoConversionAfterAdaptation,
      registration_errors: registrationErrors,
      total: pendingReports + complianceTotal + operationalTotal,
      unpublished_required_settings: psychologistAlerts.counts.unpublishedRequiredSettings,
      urgent_total: urgentTotal,
    },
    excluded_dimensions: excludedOperationalDimensions,
    items: typeof itemLimit === "number" ? items.slice(0, itemLimit) : items,
    source:
      "post_report+community_post+post_reply+user+psychologist_profile+professional_subscription+profile_view_event+contact_request+post_vote+post_save+post_reply_save+post_share",
    thresholds: {
      patient_post_without_coverage_hours: POST_COVERAGE_HOURS,
      psychologist_adaptation_days: PSYCHOLOGIST_ADAPTATION_DAYS,
    },
  };
};
