import {
  ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS,
  ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG,
  calculateAdminPatientCommunityEngagementScore,
} from "@/utils/admin-community-engagement-diagnosis";
import type {
  AdminPatientsDashboardDateRange,
  AdminPatientsDashboardEngagementSegmentId,
  AdminPatientsDashboardIntentEngagement,
  AdminPatientsDashboardIntentSegmentId,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import type { AdminPatientSnapshotRecord } from "../../repositories/AdminPatientsDashboardRepository";

import {
  classifyPatientCommunityEngagement,
  classifyPatientIntent,
  createCommunityEngagementCounts,
  createIntentCounts,
  getCommunityEngagementCountsForPatient,
  getIntentCountsForPatient,
  getPatientActiveDaysInRange,
  normalizeCountToThirtyDays,
  PATIENT_COMMUNITY_ENGAGEMENT_SOURCE,
  PATIENT_ENGAGEMENT_SEGMENT_LABELS,
  PATIENT_ENGAGEMENT_SEGMENT_ORDER,
  PATIENT_INTENT_ENGAGEMENT_HIGH_ENGAGEMENT_SEGMENTS,
  PATIENT_INTENT_ENGAGEMENT_HIGH_INTENT_SEGMENTS,
  PATIENT_INTENT_ENGAGEMENT_SOURCE,
  PATIENT_INTENT_SEGMENT_DESCRIPTIONS,
  PATIENT_INTENT_SEGMENT_LABELS,
  PATIENT_INTENT_SEGMENT_ORDER,
  PATIENT_INTENT_SOURCE,
  type PatientsDashboardCommunityEngagementCounts,
  type PatientsDashboardCommunityEngagementSignals,
  type PatientsDashboardEngagementClassification,
  type PatientsDashboardIntentClassification,
  type PatientsDashboardIntentCounts,
  type PatientsDashboardIntentSignals,
  roundPercent,
  safePercentage,
} from "./intent-support";

export const buildPatientIntentClassification = (
  patients: AdminPatientSnapshotRecord[],
  signals: PatientsDashboardIntentSignals,
): PatientsDashboardIntentClassification => {
  const patientIds = new Set(patients.map((patient) => patient.id));
  const countsByPatient = new Map<string, PatientsDashboardIntentCounts>();
  const profilePsychologistsByPatient = new Map<string, Set<string>>();

  for (const view of signals.profileViews) {
    if (!view.viewer_id || !patientIds.has(view.viewer_id)) continue;

    const counts = getIntentCountsForPatient(countsByPatient, view.viewer_id);
    counts.profile_views += 1;

    if (!profilePsychologistsByPatient.has(view.viewer_id)) {
      profilePsychologistsByPatient.set(view.viewer_id, new Set());
    }
    profilePsychologistsByPatient.get(view.viewer_id)?.add(view.psychologist_id);
  }

  for (const [patientId, psychologists] of profilePsychologistsByPatient.entries()) {
    const counts = getIntentCountsForPatient(countsByPatient, patientId);
    counts.repeated_profile_views = Math.max(0, counts.profile_views - psychologists.size);
  }

  for (const favorite of signals.favorites) {
    if (!patientIds.has(favorite.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, favorite.user_id).favorites += 1;
  }

  for (const click of signals.whatsappClicks) {
    if (!click.user_id || !patientIds.has(click.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, click.user_id).whatsapp_clicks += 1;
  }

  const segmentCounts = new Map<AdminPatientsDashboardIntentSegmentId, number>(
    PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const segmentByPatientId = new Map<string, AdminPatientsDashboardIntentSegmentId>();
  const signalTotals = createIntentCounts();

  for (const patient of patients) {
    const counts = countsByPatient.get(patient.id) ?? createIntentCounts();
    const segmentId = classifyPatientIntent(counts);
    segmentByPatientId.set(patient.id, segmentId);
    segmentCounts.set(segmentId, (segmentCounts.get(segmentId) ?? 0) + 1);
    signalTotals.profile_views += counts.profile_views;
    signalTotals.repeated_profile_views += counts.repeated_profile_views;
    signalTotals.favorites += counts.favorites;
    signalTotals.whatsapp_clicks += counts.whatsapp_clicks;
  }

  const totalSignals =
    signalTotals.profile_views + signalTotals.favorites + signalTotals.whatsapp_clicks;
  const coldPatients = segmentCounts.get("cold") ?? 0;

  return {
    analysis: {
      coverage_note:
        "Distribuição dos pacientes existentes no fim do período, considerando sinais de descoberta e contato dentro do site.",
      items: PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => ({
        count: segmentCounts.get(segmentId) ?? 0,
        description: PATIENT_INTENT_SEGMENT_DESCRIPTIONS[segmentId],
        id: segmentId,
        label: PATIENT_INTENT_SEGMENT_LABELS[segmentId],
        percentage: safePercentage(segmentCounts.get(segmentId) ?? 0, patients.length),
      })),
      patients_with_signals: Math.max(0, patients.length - coldPatients),
      privacy_note:
        "Indicador agregado interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
      signal_totals: signalTotals,
      source: PATIENT_INTENT_SOURCE,
      total_patients: patients.length,
      total_signals: totalSignals,
    },
    segmentByPatientId,
  };
};

export const buildPatientCommunityEngagementClassification = (params: {
  patients: AdminPatientSnapshotRecord[];
  range: AdminPatientsDashboardDateRange;
  signals: PatientsDashboardCommunityEngagementSignals;
}): PatientsDashboardEngagementClassification => {
  const patientIds = new Set(params.patients.map((patient) => patient.id));
  const countsByPatient = new Map<string, PatientsDashboardCommunityEngagementCounts>();

  for (const event of params.signals) {
    if (!patientIds.has(event.patient_id)) continue;

    const counts = getCommunityEngagementCountsForPatient(countsByPatient, event.patient_id);
    counts.interactions += 1;

    if (event.type === "post") counts.posts += 1;
    else if (event.type === "reply") counts.replies += 1;
    else if (event.type === "vote") counts.votes += 1;
    else counts.saves += 1;
  }

  const segmentCounts = new Map<AdminPatientsDashboardEngagementSegmentId, number>(
    PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const engagementSegmentByPatientId = new Map<string, AdminPatientsDashboardEngagementSegmentId>();

  for (const patient of params.patients) {
    const counts = countsByPatient.get(patient.id) ?? createCommunityEngagementCounts();
    const activeDays = getPatientActiveDaysInRange(patient, params.range);
    const weightedScore = calculateAdminPatientCommunityEngagementScore({
      activeDays,
      posts: counts.posts,
      replies: counts.replies,
      saves: counts.saves,
      votes: counts.votes,
    });
    counts.normalizedInteractions = normalizeCountToThirtyDays(counts.interactions, activeDays);
    counts.normalizedWeightedScore = weightedScore.weighted_score_30d;
    counts.uncappedNormalizedWeightedScore = weightedScore.uncapped_weighted_score_30d;

    const segmentId = classifyPatientCommunityEngagement(counts);
    engagementSegmentByPatientId.set(patient.id, segmentId);
    segmentCounts.set(segmentId, (segmentCounts.get(segmentId) ?? 0) + 1);
  }

  const patientsWithoutEngagement = segmentCounts.get("no_engagement") ?? 0;

  return {
    engagementAnalysis: {
      coverage_note:
        "Distribuição dos pacientes existentes no fim do período, considerando ações em comunidades.",
      items: PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => ({
        count: segmentCounts.get(segmentId) ?? 0,
        id: segmentId,
        label: PATIENT_ENGAGEMENT_SEGMENT_LABELS[segmentId],
        percentage: safePercentage(segmentCounts.get(segmentId) ?? 0, params.patients.length),
      })),
      patients_with_engagement: Math.max(0, params.patients.length - patientsWithoutEngagement),
      privacy_note:
        "Indicador agregado interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
      source: PATIENT_COMMUNITY_ENGAGEMENT_SOURCE,
      thresholds: {
        engaged_score_30d: ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS.engaged_score_30d,
        minimum_signal_score_30d:
          ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS.minimum_signal_score_30d,
        passive_saves_score_cap_30d: ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG.caps_30d.saves,
        passive_votes_score_cap_30d: ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG.caps_30d.votes,
        very_engaged_score_30d: ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS.very_engaged_score_30d,
        weights: ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG.weights,
      },
      total_patients: params.patients.length,
    },
    engagementSegmentByPatientId,
  };
};

export const buildPatientIntentEngagement = (params: {
  engagementSegmentByPatientId: Map<string, AdminPatientsDashboardEngagementSegmentId>;
  patients: AdminPatientSnapshotRecord[];
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
}): AdminPatientsDashboardIntentEngagement => {
  const cellCounts = new Map<string, number>();
  const intentTotals = new Map<AdminPatientsDashboardIntentSegmentId, number>(
    PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const engagementTotals = new Map<AdminPatientsDashboardEngagementSegmentId, number>(
    PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const comparison = {
    high_engagement: {
      high_intent_count: 0,
      high_intent_rate: null as number | null,
      patients: 0,
    },
    low_engagement: {
      high_intent_count: 0,
      high_intent_rate: null as number | null,
      patients: 0,
    },
    rate_difference_points: null as number | null,
  };
  let highIntentPatients = 0;

  for (const patient of params.patients) {
    const intentId = params.segmentByPatientId.get(patient.id) ?? "cold";
    const engagementId = params.engagementSegmentByPatientId.get(patient.id) ?? "no_engagement";
    const cellId = `${intentId}_${engagementId}`;
    const hasHighIntent = PATIENT_INTENT_ENGAGEMENT_HIGH_INTENT_SEGMENTS.has(intentId);
    const hasHighEngagement = PATIENT_INTENT_ENGAGEMENT_HIGH_ENGAGEMENT_SEGMENTS.has(engagementId);
    const comparisonBucket = hasHighEngagement
      ? comparison.high_engagement
      : comparison.low_engagement;

    cellCounts.set(cellId, (cellCounts.get(cellId) ?? 0) + 1);
    intentTotals.set(intentId, (intentTotals.get(intentId) ?? 0) + 1);
    engagementTotals.set(engagementId, (engagementTotals.get(engagementId) ?? 0) + 1);
    comparisonBucket.patients += 1;
    if (hasHighIntent) {
      highIntentPatients += 1;
      comparisonBucket.high_intent_count += 1;
    }
  }

  comparison.high_engagement.high_intent_rate =
    comparison.high_engagement.patients > 0
      ? safePercentage(
          comparison.high_engagement.high_intent_count,
          comparison.high_engagement.patients,
        )
      : null;
  comparison.low_engagement.high_intent_rate =
    comparison.low_engagement.patients > 0
      ? safePercentage(
          comparison.low_engagement.high_intent_count,
          comparison.low_engagement.patients,
        )
      : null;
  comparison.rate_difference_points =
    typeof comparison.high_engagement.high_intent_rate === "number" &&
    typeof comparison.low_engagement.high_intent_rate === "number"
      ? roundPercent(
          comparison.high_engagement.high_intent_rate - comparison.low_engagement.high_intent_rate,
        )
      : null;

  return {
    cells: PATIENT_INTENT_SEGMENT_ORDER.flatMap((intentId) =>
      PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((engagementId) => {
        const count = cellCounts.get(`${intentId}_${engagementId}`) ?? 0;

        return {
          column_percentage: safePercentage(count, engagementTotals.get(engagementId) ?? 0),
          count,
          engagement_id: engagementId,
          engagement_label: PATIENT_ENGAGEMENT_SEGMENT_LABELS[engagementId],
          id: `${intentId}_${engagementId}` as const,
          intent_id: intentId,
          intent_label: PATIENT_INTENT_SEGMENT_LABELS[intentId],
          percentage: safePercentage(count, params.patients.length),
          row_percentage: safePercentage(count, intentTotals.get(intentId) ?? 0),
        };
      }),
    ),
    comparison,
    description:
      "Relação observacional entre intenção de busca e engajamento comunitário dos pacientes no período selecionado; não indica causalidade, diagnóstico, atendimento ou conversa.",
    source: PATIENT_INTENT_ENGAGEMENT_SOURCE,
    totals: {
      high_engagement_patients: comparison.high_engagement.patients,
      high_intent_patients: highIntentPatients,
      low_engagement_patients: comparison.low_engagement.patients,
      patients: params.patients.length,
    },
    unavailable_reason:
      params.patients.length === 0
        ? "Sem pacientes no período selecionado para comparar intenção e engajamento."
        : null,
  };
};
