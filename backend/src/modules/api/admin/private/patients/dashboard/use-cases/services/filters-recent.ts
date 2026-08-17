import type {
  AdminPatientsDashboardIntentAnalysis,
  AdminPatientsDashboardIntentFilterId,
  AdminPatientsDashboardIntentSegmentId,
  AdminPatientsDashboardRecentActivity,
  AdminPatientsDashboardRecentPatient,
  AdminPatientsDashboardSummary,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import type {
  AdminPatientDeletedAccountRecord,
  AdminPatientLocationRecord,
  AdminPatientPageViewRecord,
  AdminPatientPlatformSessionRecord,
  AdminPatientRecentRecord,
  AdminPatientSnapshotRecord,
} from "../../repositories/AdminPatientsDashboardRepository";
import { buildPlatformUsage } from "./anonymous-platform";

import {
  buildDemographics,
  buildDeviceUsage,
  buildLocations,
  normalizeName,
  providerLabel,
} from "./device-demographics";
import { PATIENT_INTENT_FILTER_ORDER, PATIENT_INTENT_SOURCE } from "./intent-support";

export const matchesIntentFilter = (
  userId: string | null | undefined,
  filterId: AdminPatientsDashboardIntentFilterId,
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>,
) => {
  if (filterId === "all") return true;
  if (!userId) return false;

  return segmentByPatientId.get(userId) === filterId;
};

export const buildPatientIntentFilters = (params: {
  currentPatients: AdminPatientSnapshotRecord[];
  currentPeriodPatients: AdminPatientSnapshotRecord[];
  intentAnalysis: AdminPatientsDashboardIntentAnalysis;
  labels: string[];
  locations: AdminPatientLocationRecord[];
  pageViews: AdminPatientPageViewRecord[];
  platformSessions: AdminPatientPlatformSessionRecord[];
  pwaInstalledUserIds: string[];
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
}): AdminPatientsDashboardSummary["intent_filters"] => {
  const {
    currentPatients,
    currentPeriodPatients,
    intentAnalysis,
    labels,
    locations,
    pageViews,
    platformSessions,
    pwaInstalledUserIds,
    segmentByPatientId,
  } = params;
  const breakdownEntries = PATIENT_INTENT_FILTER_ORDER.map((filterId) => {
    const eligiblePatients = currentPatients.filter((patient) =>
      matchesIntentFilter(patient.id, filterId, segmentByPatientId),
    );
    const demographicPatients = currentPeriodPatients.filter((patient) =>
      matchesIntentFilter(patient.id, filterId, segmentByPatientId),
    );
    const filteredLocations = locations.filter((location) =>
      matchesIntentFilter(location.user_id, filterId, segmentByPatientId),
    );
    const filteredPageViews = pageViews.filter((view) =>
      matchesIntentFilter(view.user_id, filterId, segmentByPatientId),
    );
    const filteredPlatformSessions = platformSessions.filter((session) =>
      matchesIntentFilter(session.user_id, filterId, segmentByPatientId),
    );
    const filteredPwaInstalledUserIds = pwaInstalledUserIds.filter((userId) =>
      matchesIntentFilter(userId, filterId, segmentByPatientId),
    );

    return [
      filterId,
      {
        demographics: buildDemographics(demographicPatients),
        device_usage: buildDeviceUsage(filteredPlatformSessions),
        locations: buildLocations(filteredLocations),
        platform_usage: buildPlatformUsage({
          eligiblePatientsCount: eligiblePatients.length,
          labels,
          pageViews: filteredPageViews,
          pwaInstalledUserIds: filteredPwaInstalledUserIds,
        }),
      },
    ] as const;
  });

  return {
    breakdowns: Object.fromEntries(
      breakdownEntries,
    ) as AdminPatientsDashboardSummary["intent_filters"]["breakdowns"],
    default_filter: "all",
    options: [
      {
        count: intentAnalysis.total_patients,
        id: "all",
        label: "Todos",
      },
      ...intentAnalysis.items.map((segment) => ({
        count: segment.count,
        id: segment.id,
        label: segment.label,
      })),
    ],
    source: PATIENT_INTENT_SOURCE,
  };
};

export const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
};

export const postUrl = (post: { community: { slug: string }; id: string }) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

export const replyUrl = (reply: {
  id: string;
  post: { community: { slug: string }; id: string };
}) => `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`;

export const pickRecentActivity = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentActivity | null => {
  const candidates: AdminPatientsDashboardRecentActivity[] = [
    {
      description: "Cadastro de paciente realizado na plataforma.",
      detail_url: null,
      label: "Cadastro realizado",
      occurred_at: patient.createdAt,
      source: "user.createdAt",
      type: "account_created",
    },
    ...patient.community_members.map((member) => ({
      description: `Entrou na comunidade ${member.community.name}.`,
      detail_url: `/comunidades/${member.community.slug}`,
      label: "Entrou em comunidade",
      occurred_at: member.createdAt,
      source: "community_member",
      type: "community_joined",
    })),
    ...patient.community_posts.map((post) => ({
      description: `Criou o post "${post.title}" na comunidade ${post.community.name}.`,
      detail_url: postUrl(post),
      label: "Criou um post",
      occurred_at: post.createdAt,
      source: "community_post",
      type: "post_created",
    })),
    ...patient.post_replies.map((reply) => ({
      description: `Comentou no post "${reply.post.title}": ${snippet(
        reply.content,
        "comentário sem texto",
      )}.`,
      detail_url: replyUrl(reply),
      label: "Comentou em um post",
      occurred_at: reply.createdAt,
      source: "post_reply",
      type: "post_reply_created",
    })),
    ...patient.post_votes.map((vote) => {
      const target = vote.reply ?? vote.post;
      const detailUrl = vote.reply ? replyUrl(vote.reply) : vote.post ? postUrl(vote.post) : null;

      return {
        description: `Reagiu a ${vote.reply ? "uma resposta" : "um post"}${
          target ? ` em "${vote.reply ? vote.reply.post.title : vote.post?.title}"` : ""
        }.`,
        detail_url: detailUrl,
        label: vote.value > 0 ? "Upvote registrado" : "Downvote registrado",
        occurred_at: vote.createdAt,
        source: "post_vote",
        type: "post_vote",
      };
    }),
    ...patient.post_saves.map((save) => ({
      description: `Salvou o post "${save.post.title}".`,
      detail_url: postUrl(save.post),
      label: "Salvou um post",
      occurred_at: save.createdAt,
      source: "post_save",
      type: "post_saved",
    })),
    ...patient.post_reply_saves.map((save) => ({
      description: `Salvou uma resposta no post "${save.reply.post.title}".`,
      detail_url: replyUrl(save.reply),
      label: "Salvou uma resposta",
      occurred_at: save.createdAt,
      source: "post_reply_save",
      type: "reply_saved",
    })),
  ];

  return (
    candidates.sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime())[0] ??
    null
  );
};

export const mapRecentPatient = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentPatient => {
  const hasLocation = Boolean(
    patient.patient_profile?.city?.trim() && patient.patient_profile?.state?.trim(),
  );

  return {
    avatar: patient.avatar,
    city: hasLocation ? (patient.patient_profile?.city ?? null) : null,
    country: hasLocation ? "BR" : null,
    created_at: patient.createdAt,
    detail_url: `/pacientes/${patient.id}`,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
    last_location_at: hasLocation ? (patient.patient_profile?.updatedAt ?? null) : null,
    name: normalizeName(patient.name),
    provider: patient.provider,
    provider_label: providerLabel(patient.provider),
    recent_activity: pickRecentActivity(patient),
    state: hasLocation ? (patient.patient_profile?.state ?? null) : null,
    status: patient.active ? "active" : "inactive",
    status_label: patient.active ? "Ativo" : "Inativo",
  };
};

export const getAllPeriodStartDate = (
  patients: AdminPatientSnapshotRecord[],
  deletedAccounts: AdminPatientDeletedAccountRecord[] = [],
) =>
  [
    ...patients.map((patient) => patient.createdAt),
    ...deletedAccounts.flatMap((account) => (account.deletedAt ? [account.deletedAt] : [])),
  ].reduce<Date | undefined>((earliest, date) => {
    if (!earliest || date < earliest) return date;

    return earliest;
  }, undefined);
