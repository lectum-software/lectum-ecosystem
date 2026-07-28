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
