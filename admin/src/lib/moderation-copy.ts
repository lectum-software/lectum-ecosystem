import type {
  AdminModerationDecision,
  AdminModerationSeverity,
  AdminModerationStatus,
  AdminModerationTargetType,
} from "@/api/req/moderation";

export const moderationDecisionLabels: Record<AdminModerationDecision, string> = {
  allow_sensitive: "Sensível publicado",
  block: "Bloqueado",
  safety_hold: "Segurança urgente",
};

export const moderationStatusLabels: Record<AdminModerationStatus, string> = {
  pending: "Pendente",
  resolved: "Resolvido",
  reviewing: "Em revisão",
};

export const moderationSeverityLabels: Record<AdminModerationSeverity, string> = {
  high: "Alta",
  low: "Baixa",
  medium: "Média",
  urgent: "Urgente",
};

export const moderationCategoryLabels: Record<string, string> = {
  abuse_violence: "Abuso/violência",
  explicit_sexual: "Sexual explícito",
  external_link: "Link externo",
  minor_sexual_risk: "Menor/risco sexual",
  other: "Outro",
  self_harm_suicide: "Autolesão/suicídio",
  sexual_health: "Saúde sexual",
  spam_scam: "Spam/golpe",
};

export const moderationReasonLabels: Record<string, string> = {
  external_contact_invitation_blocked: "Convite para contato externo",
  minor_sexual_risk_blocked: "Contexto sexual com menor",
  patient_external_link_blocked: "URL ou domínio externo",
  self_harm_immediate_safety_hold: "Risco imediato/autolesão",
  sensitive_term_requires_admin_awareness: "Termo sensível em relato",
  sensitive_therapeutic_context: "Relato terapêutico sensível",
  sexual_solicitation_blocked: "Solicitação/divulgação sexual",
  spam_or_scam_blocked: "Spam ou golpe",
};

export const moderationTargetLabels: Record<AdminModerationTargetType, string> = {
  community_post: "Post",
  post_reply: "Resposta",
  submitted_post: "Post bloqueado antes da publicação",
  submitted_reply: "Resposta bloqueada antes da publicação",
};

const reportReasonLabels: Record<string, string> = {
  abuse: "Abuso ou desrespeito",
  other: "Outro motivo",
  privacy: "Dados pessoais ou privacidade",
  self_harm: "Autolesão ou risco",
  spam: "Spam",
};

const roleLabels: Record<string, string> = {
  paciente: "Paciente",
  patient: "Paciente",
  professional: "Psicólogo",
  psicologo: "Psicólogo",
  psychologist: "Psicólogo",
};

export const moderationDecisionLabel = (value?: string | null) =>
  moderationDecisionLabels[value as AdminModerationDecision] ?? "Decisão não classificada";

export const moderationStatusLabel = (value?: string | null) =>
  moderationStatusLabels[value as AdminModerationStatus] ?? "Status não classificado";

export const moderationSeverityLabel = (value?: string | null) =>
  moderationSeverityLabels[value as AdminModerationSeverity] ?? "Prioridade não classificada";

export const moderationCategoryLabel = (value?: string | null) =>
  (value ? moderationCategoryLabels[value] : null) ?? "Outra categoria";

export const moderationReasonLabel = (value?: string | null) =>
  (value ? moderationReasonLabels[value] : null) ?? "Motivo não categorizado";

export const moderationTargetLabel = (value?: string | null) =>
  moderationTargetLabels[value as AdminModerationTargetType] ?? "Conteúdo";

export const reportReasonLabel = (value?: string | null) =>
  (value ? reportReasonLabels[value] : null) ?? "Outro motivo";

export const moderationRoleLabel = (value?: string | null) =>
  (value ? roleLabels[value.toLocaleLowerCase("pt-BR")] : null) ?? "Usuário";
