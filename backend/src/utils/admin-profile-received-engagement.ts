export type AdminProfileReceivedEngagementDiagnosisId =
  | "ativo"
  | "muito_ativo"
  | "pouco_ativo"
  | "sem_base";

export type AdminProfileReceivedEngagementDiagnosis = {
  id: AdminProfileReceivedEngagementDiagnosisId;
  label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem base";
  source: AdminProfileReceivedEngagementSource;
};

export type AdminProfileReceivedEngagementEventType =
  | "comment_received"
  | "content_save"
  | "content_share"
  | "positive_vote"
  | "profile_favorite"
  | "profile_follow";

export type AdminProfileReceivedEngagementScoreInput = {
  activeDays: number;
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  positiveVotes: number;
  profileFavorites: number;
  profileFollows: number;
};

export type AdminProfileReceivedEngagementScoreContribution = {
  cap_30d: number | null;
  capped_score_30d: number;
  count: number;
  raw_score_30d: number;
  weight: number;
};

export const ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE =
  "psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share" as const;

export type AdminProfileReceivedEngagementSource = typeof ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE;

export const ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS = {
  engaged_score_30d: 6,
  minimum_signal_score_30d: 3,
  very_engaged_score_30d: 12,
} as const;

export const ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG = {
  caps_30d: {
    comments_received: null,
    content_saves: 6,
    content_shares: 6,
    positive_votes: 6,
    profile_favorites: null,
    profile_follows: null,
  },
  weights: {
    comments_received: 3,
    content_saves: 1.5,
    content_shares: 2,
    positive_votes: 1,
    profile_favorites: 2,
    profile_follows: 2.5,
  },
} as const;

const labelByDiagnosis: Record<
  AdminProfileReceivedEngagementDiagnosisId,
  AdminProfileReceivedEngagementDiagnosis["label"]
> = {
  ativo: "Engajado",
  muito_ativo: "Muito engajado",
  pouco_ativo: "Pouco engajado",
  sem_base: "Sem base",
};

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const normalizeAdminProfileReceivedEngagementToThirtyDays = (
  score: number,
  activeDays: number,
) => {
  if (activeDays <= 0) return 0;

  return roundOneDecimal((score / activeDays) * 30);
};

const buildScoreContribution = (input: {
  activeDays: number;
  cap30d: number | null;
  count: number;
  weight: number;
}): AdminProfileReceivedEngagementScoreContribution => {
  const count = Math.max(0, input.count);
  const rawScore30d = normalizeAdminProfileReceivedEngagementToThirtyDays(
    count * input.weight,
    input.activeDays,
  );
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

export const calculateAdminProfileReceivedEngagementScore = (
  input: AdminProfileReceivedEngagementScoreInput,
) => {
  const { caps_30d: caps, weights } = ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG;
  const contributions = {
    comments_received: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.comments_received,
      count: input.commentsReceived,
      weight: weights.comments_received,
    }),
    content_saves: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.content_saves,
      count: input.contentSaves,
      weight: weights.content_saves,
    }),
    content_shares: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.content_shares,
      count: input.contentShares,
      weight: weights.content_shares,
    }),
    positive_votes: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.positive_votes,
      count: input.positiveVotes,
      weight: weights.positive_votes,
    }),
    profile_favorites: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.profile_favorites,
      count: input.profileFavorites,
      weight: weights.profile_favorites,
    }),
    profile_follows: buildScoreContribution({
      activeDays: input.activeDays,
      cap30d: caps.profile_follows,
      count: input.profileFollows,
      weight: weights.profile_follows,
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

export const diagnoseAdminProfileReceivedEngagement = (input: {
  activeDays: number;
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  positiveVotes: number;
  profileFavorites: number;
  profileFollows: number;
  source?: AdminProfileReceivedEngagementSource;
}): AdminProfileReceivedEngagementDiagnosis => {
  const score = calculateAdminProfileReceivedEngagementScore(input);
  let id: AdminProfileReceivedEngagementDiagnosisId = "pouco_ativo";

  if (
    score.weighted_score_30d <
    ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.minimum_signal_score_30d
  ) {
    id = "sem_base";
  } else if (
    score.weighted_score_30d >=
    ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.very_engaged_score_30d
  ) {
    id = "muito_ativo";
  } else if (
    score.weighted_score_30d >= ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.engaged_score_30d
  ) {
    id = "ativo";
  }

  return {
    id,
    label: labelByDiagnosis[id],
    source: input.source ?? ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE,
  };
};
