import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { bestAdminCommunityEngagementDiagnosis } from "@/utils/admin-community-engagement-diagnosis";
import type {
  AdminPatientDetailDTO,
  AdminPatientDetailPeriod,
  IAdminPatientDetailDTO,
} from "../../DTOs/IAdminPatientDetailDTO";
import {
  type AdminPatientDetailPlatformPageViewRecord,
  type AdminPatientDetailPlatformSessionRecord,
  type AdminPatientDetailRecord,
  AdminPatientDetailRepository,
  type AdminPatientEngagementBundle,
} from "../../repositories/AdminPatientDetailRepository";
import { buildActiveCommunities, buildActivities } from "./activity-community";

import {
  buildPatientIntentAnalysis,
  type PatientIntentSignals,
  providerLabel,
  resolvePeriod,
} from "./intent";
import { buildMetrics, buildSeries, countsFromBundle, normalizeName } from "./metrics-series";

import { buildPlatformUsage } from "./platform";
import { buildHeatmap, buildPublications } from "./publications";

export const buildHeader = (patient: AdminPatientDetailRecord): AdminPatientDetailDTO["header"] => {
  const latestToken = patient.user_tokens[0] ?? null;
  const lastAccessAt = latestToken
    ? latestToken.updatedAt > latestToken.createdAt
      ? latestToken.updatedAt
      : latestToken.createdAt
    : null;
  const declaredLocation =
    patient.patient_profile?.city?.trim() && patient.patient_profile?.state?.trim()
      ? {
          captured_at: patient.patient_profile.updatedAt,
          city: patient.patient_profile.city,
          country: "BR",
          source: "patient_profile",
          state: patient.patient_profile.state,
        }
      : null;

  return {
    active: patient.active,
    avatar: patient.avatar,
    created_at: patient.createdAt,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
    last_access_at: lastAccessAt,
    location: declaredLocation,
    name: normalizeName(patient.name),
    onboarding_completed_at: patient.patient_profile?.onboarding_completed_at ?? null,
    provider: patient.provider,
    provider_label: providerLabel(patient.provider),
    status: patient.active ? "active" : "inactive",
    status_label: patient.active ? "Ativo" : "Inativo",
  };
};

export const buildDetail = (
  patient: AdminPatientDetailRecord,
  period: AdminPatientDetailPeriod,
  labels: string[],
  currentBundle: AdminPatientEngagementBundle,
  previousBundle: AdminPatientEngagementBundle,
  currentIntentSignals: PatientIntentSignals,
  previousIntentSignals: PatientIntentSignals,
  platformPageViews: AdminPatientDetailPlatformPageViewRecord[],
  platformSessions: AdminPatientDetailPlatformSessionRecord[],
  postViews: Awaited<ReturnType<AdminPatientDetailRepository["countPostViews"]>>,
  pwaInstallAction: { occurred_at: Date } | null,
): AdminPatientDetailDTO => {
  const currentCounts = countsFromBundle(currentBundle);
  const previousCounts = countsFromBundle(previousBundle);
  const heatmap = buildHeatmap(currentBundle);
  const intentAnalysis = buildPatientIntentAnalysis(currentIntentSignals, previousIntentSignals);
  const platformUsage = buildPlatformUsage({
    bundle: currentBundle,
    pageViews: platformPageViews,
    period,
    pwaInstallAction,
    sessions: platformSessions,
  });
  const activeCommunities = buildActiveCommunities(currentBundle);
  const communityEngagementDiagnosis = bestAdminCommunityEngagementDiagnosis({
    diagnoses: activeCommunities.map((community) => community.engagement_diagnosis),
    source: "communities.items.engagement_diagnosis:max",
  });
  const unavailable = [
    ...(!patient.patient_profile?.city?.trim() || !patient.patient_profile?.state?.trim()
      ? [
          {
            description:
              "O paciente ainda não informou cidade e estado no perfil; nenhum endereço é inferido.",
            id: "location",
            label: "Localização do paciente",
            source: "patient_profile.city/state",
          },
        ]
      : []),
    ...(!heatmap.available
      ? [
          {
            description: heatmap.unavailable_reason ?? "Sem eventos suficientes no período.",
            id: "heatmap",
            label: "Horários de maior atividade",
            source: heatmap.source,
          },
        ]
      : []),
    ...(platformUsage.unavailable_reason
      ? [
          {
            description:
              "O uso da plataforma depende de visualizações autenticadas do paciente no período selecionado.",
            id: "platform_usage",
            label: "Uso da plataforma",
            source: "page_view_event",
          },
        ]
      : []),
    ...(platformUsage.duration_unavailable_reason
      ? [
          {
            description: platformUsage.duration_unavailable_reason,
            id: "platform_duration",
            label: "Tempo médio",
            source: "page_view_event.duration_seconds",
          },
        ]
      : []),
  ];

  return {
    activities: {
      coverage_note:
        "As atividades consideram posts, comentários, votos, salvamentos, entrada em comunidades e avaliações. Acesso à conta não é exibido porque não há histórico confiável por ocorrência.",
      items: buildActivities(currentBundle),
      source: "community_activity+professional_review",
    },
    communities: {
      engagement_diagnosis: communityEngagementDiagnosis,
      items: activeCommunities,
      source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save",
    },
    coverage_notes: [
      "Aba Conta possui suporte administrativo auditado de acesso, sessões, suspensão, desativação e exclusão; não há silenciamento, restrição parcial ou moderação automática de paciente.",
      "Status Ativo/Inativo representa user.active, não retenção nem engajamento recente.",
      "O e-mail é exibido apenas para administradores autenticados; telefone, nascimento, biografia, IP, coordenadas e endereço completo não são exibidos.",
      "O último acesso usa as informações de sessão disponíveis para o usuário.",
      "A localização exibida é declarada pelo paciente no perfil para apoiar proximidade com profissionais.",
      "Análise de intenção usa contagens derivadas de aberturas de perfil, favoritos e cliques WhatsApp; não expõe conversa, diagnóstico ou atendimento.",
    ],
    header: buildHeader(patient),
    heatmap,
    intent_analysis: intentAnalysis,
    metrics: buildMetrics(currentCounts, previousCounts),
    period,
    platform_usage: platformUsage,
    publications: {
      coverage_note:
        "As publicações listam posts criados pelo paciente e suas métricas de visualizações, votos, comentários, salvamentos, compartilhamentos e denúncias.",
      items: buildPublications(currentBundle, postViews),
      source:
        "community_post+post_reply+post_vote+post_save+post_share+page_view_event+post_report",
    },
    privacy: {
      omitted_fields: [
        "patient_profile.phone",
        "patient_profile.birthdate",
        "patient_profile.bio",
        "IP",
        "coordenadas",
        "endereço completo",
        "comentário textual de avaliações profissionais",
      ],
      visible_fields: [
        "user.id",
        "user.name",
        "user.email",
        "user.avatar",
        "user.active",
        "user_token.createdAt/updatedAt",
        "user.provider",
        "user.createdAt",
        "patient_profile.gender",
        "patient_profile.city/state",
        "contagens derivadas de profile_view_event/psychologist_favorite/contact_request",
      ],
    },
    series: {
      points: buildSeries(labels, currentBundle),
      source:
        "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report+verified_responses",
    },
    source: "user+patient_profile+community_activity+professional_review",
    unavailable,
  };
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});

export const showAdminPatient = async (data: IAdminPatientDetailDTO): Promise<Resolve> => {
  const repository = new AdminPatientDetailRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return notFound();

  const resolvedPeriod = resolvePeriod(data.q ?? {}, patient.createdAt);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;
  const [
    currentBundle,
    previousBundle,
    currentIntentSignals,
    previousIntentSignals,
    platformPageViews,
    platformSessions,
    pwaInstallAction,
  ] = await Promise.all([
    repository.listEngagementBundle(patient.id, current),
    repository.listEngagementBundle(patient.id, previous),
    repository.listIntentSignals(patient.id, current),
    repository.listIntentSignals(patient.id, previous),
    repository.listPlatformPageViews(patient.id, current),
    repository.listPlatformSessions(patient.id, current),
    repository.findPwaInstallAction(patient.id),
  ]);
  const postViews = await repository.countPostViews(currentBundle.posts.map((post) => post.id));

  return {
    status: 200,
    ...msg("index", {}),
    data: buildDetail(
      patient,
      period,
      labels,
      currentBundle,
      previousBundle,
      currentIntentSignals,
      previousIntentSignals,
      platformPageViews,
      platformSessions,
      postViews,
      pwaInstallAction,
    ),
  };
};
