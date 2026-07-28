export type AdminCommunityEngagementDiagnosisId =
  | "ativo"
  | "muito_ativo"
  | "pouco_ativo"
  | "sem_base";

export type AdminCommunityEngagementDiagnosis = {
  id: AdminCommunityEngagementDiagnosisId;
  label: "Ativo" | "Muito ativo" | "Pouco ativo" | "Sem base";
  source: string;
};

export type AdminPsychologistCommunityEngagementDiagnosis = Omit<
  AdminCommunityEngagementDiagnosis,
  "label"
> & {
  label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem base";
};

export type AdminCommunityEngagementScoreContribution = {
  cap_30d: number | null;
  capped_score_30d: number;
  count: number;
  raw_score_30d: number;
  weight: number;
};

export type AdminPsychologistCommunityEngagementScoreInput = {
  activeDays: number;
  patientReplies: number;
  posts: number;
  replies: number;
  votes: number;
};

export type AdminPatientCommunityEngagementScoreInput = {
  activeDays: number;
  posts: number;
  replies: number;
  saves: number;
  votes: number;
};

export const ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS = {
  engaged_score_30d: 6,
  minimum_signal_score_30d: 3,
  very_engaged_score_30d: 12,
} as const;

export const ADMIN_PSYCHOLOGIST_COMMUNITY_ENGAGEMENT_SCORE_CONFIG = {
  caps_30d: {
    patient_replies: null,
    posts: 6,
    replies: 8,
    votes: 3,
  },
  very_engaged_min_patient_replies_30d: 2,
  weights: {
    patient_replies: 4,
    posts: 2,
    replies: 2,
    votes: 0.5,
  },
} as const;

export const ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG = {
  caps_30d: {
    posts: null,
    replies: null,
    saves: 6,
    votes: 3,
  },
  weights: {
    posts: 4,
    replies: 2,
    saves: 1.5,
    votes: 0.5,
  },
} as const;

const labelByDiagnosis: Record<
  AdminCommunityEngagementDiagnosisId,
  AdminCommunityEngagementDiagnosis["label"]
> = {
  ativo: "Ativo",
  muito_ativo: "Muito ativo",
  pouco_ativo: "Pouco ativo",
  sem_base: "Sem base",
};

const psychologistLabelByDiagnosis: Record<
  AdminCommunityEngagementDiagnosisId,
  AdminPsychologistCommunityEngagementDiagnosis["label"]
> = {
  ativo: "Engajado",
  muito_ativo: "Muito engajado",
  pouco_ativo: "Pouco engajado",
  sem_base: "Sem base",
};

const diagnosisPriority: Record<AdminCommunityEngagementDiagnosisId, number> = {
  sem_base: 0,
  pouco_ativo: 1,
  ativo: 2,
  muito_ativo: 3,
};

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

const normalizeScoreToThirtyDays = (score: number, activeDays: number) => {
  if (activeDays <= 0) return 0;

  return roundOneDecimal((score / activeDays) * 30);
};

const buildScoreContribution = (input: {
  activeDays: number;
  cap30d: number | null;
  count: number;
  weight: number;
}): AdminCommunityEngagementScoreContribution => {
  const count = Math.max(0, input.count);
  const rawScore30d = normalizeScoreToThirtyDays(count * input.weight, input.activeDays);
  const cappedScore30d =
    typeof input.cap30d === "number" ? Math.min(rawScore30d, input.cap30d) : rawScore30d;

  return {
    cap_30d: input.cap30d,
    capped_score_30d: roundOneDecimal(cappedScore30d),
    count,
    raw_score_30d: rawScore30d,
    weight: input.weight,
  };
};

export const diagnoseAdminCommunityEngagement = (input: {
  interactions: number;
  source: string;
}): AdminCommunityEngagementDiagnosis => {
  const interactions = Math.max(0, Math.trunc(input.interactions));
  let id: AdminCommunityEngagementDiagnosisId = "pouco_ativo";

  if (interactions < 3) {
    id = "sem_base";
  } else if (interactions >= 12) {
    id = "muito_ativo";
  } else if (interactions >= 6) {
    id = "ativo";
  }

  return {
    id,
    label: labelByDiagnosis[id],
    source: input.source,
  };
};

export const calculateAdminPsychologistCommunityEngagementScore = (
  input: AdminPsychologistCommunityEngagementScoreInput,
) => {
  const patientReplies = Math.max(0, Math.min(input.patientReplies, input.replies));
  const regularReplies = Math.max(0, input.replies - patientReplies);
  const { caps_30d: caps, weights } = ADMIN_PSYCHOLOGIST_COMMUNITY_ENGAGEMENT_SCORE_CONFIG;
  const contributions = {
    patient_replies: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.patient_replies,
      count: patientReplies,
      weight: weights.patient_replies,
    }),
    posts: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.posts,
      count: input.posts,
      weight: weights.posts,
    }),
    replies: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.replies,
      count: regularReplies,
      weight: weights.replies,
    }),
    votes: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.votes,
      count: input.votes,
      weight: weights.votes,
    }),
  };
  const weightedScore30d = roundOneDecimal(
    Object.values(contributions).reduce((total, item) => total + item.capped_score_30d, 0),
  );
  const uncappedWeightedScore30d = roundOneDecimal(
    Object.values(contributions).reduce((total, item) => total + item.raw_score_30d, 0),
  );

  return {
    contributions,
    normalized_patient_replies_30d: normalizeScoreToThirtyDays(patientReplies, input.activeDays),
    uncapped_weighted_score_30d: uncappedWeightedScore30d,
    weighted_score_30d: weightedScore30d,
  };
};

export const diagnoseAdminPsychologistWeightedCommunityEngagement = (input: {
  activeDays: number;
  patientReplies: number;
  posts: number;
  replies: number;
  source: string;
  votes: number;
}): AdminCommunityEngagementDiagnosis => {
  const score = calculateAdminPsychologistCommunityEngagementScore(input);
  const diagnosis = diagnoseAdminCommunityEngagement({
    interactions: score.weighted_score_30d,
    source: input.source,
  });
  const hasVeryEngagedPatientCoverage =
    score.normalized_patient_replies_30d >=
    ADMIN_PSYCHOLOGIST_COMMUNITY_ENGAGEMENT_SCORE_CONFIG.very_engaged_min_patient_replies_30d;

  if (diagnosis.id === "muito_ativo" && !hasVeryEngagedPatientCoverage) {
    return diagnoseAdminCommunityEngagement({
      interactions: ADMIN_COMMUNITY_ENGAGEMENT_SCORE_THRESHOLDS.engaged_score_30d,
      source: input.source,
    });
  }

  return diagnosis;
};

export const calculateAdminPatientCommunityEngagementScore = (
  input: AdminPatientCommunityEngagementScoreInput,
) => {
  const { caps_30d: caps, weights } = ADMIN_PATIENT_COMMUNITY_ENGAGEMENT_SCORE_CONFIG;
  const contributions = {
    posts: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.posts,
      count: input.posts,
      weight: weights.posts,
    }),
    replies: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.replies,
      count: input.replies,
      weight: weights.replies,
    }),
    saves: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.saves,
      count: input.saves,
      weight: weights.saves,
    }),
    votes: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.votes,
      count: input.votes,
      weight: weights.votes,
    }),
  };
  const weightedScore30d = roundOneDecimal(
    Object.values(contributions).reduce((total, item) => total + item.capped_score_30d, 0),
  );
  const uncappedWeightedScore30d = roundOneDecimal(
    Object.values(contributions).reduce((total, item) => total + item.raw_score_30d, 0),
  );

  return {
    contributions,
    uncapped_weighted_score_30d: uncappedWeightedScore30d,
    weighted_score_30d: weightedScore30d,
  };
};

export const diagnoseAdminPatientWeightedCommunityEngagement = (input: {
  activeDays: number;
  posts: number;
  replies: number;
  saves: number;
  source: string;
  votes: number;
}): AdminCommunityEngagementDiagnosis => {
  const score = calculateAdminPatientCommunityEngagementScore(input);

  return diagnoseAdminCommunityEngagement({
    interactions: score.weighted_score_30d,
    source: input.source,
  });
};

export const formatAdminPsychologistCommunityEngagementDiagnosis = (input: {
  id: AdminCommunityEngagementDiagnosisId;
  source: string;
}): AdminPsychologistCommunityEngagementDiagnosis => ({
  id: input.id,
  label: psychologistLabelByDiagnosis[input.id],
  source: input.source,
});

export const bestAdminCommunityEngagementDiagnosis = (input: {
  diagnoses: { id: AdminCommunityEngagementDiagnosisId }[];
  source: string;
}): AdminCommunityEngagementDiagnosis => {
  const best = input.diagnoses.reduce<AdminCommunityEngagementDiagnosisId | null>(
    (current, candidate) => {
      if (!current) return candidate.id;

      return diagnosisPriority[candidate.id] > diagnosisPriority[current] ? candidate.id : current;
    },
    null,
  );

  return {
    id: best ?? "sem_base",
    label: labelByDiagnosis[best ?? "sem_base"],
    source: input.source,
  };
};
