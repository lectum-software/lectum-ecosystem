import { z } from "zod";
import type {
  AdminModerationDecision,
  AdminModerationSeverity,
  AdminModerationStatus,
} from "@/api/req/moderation";

export const EVENT_LIMIT = 10;

export const REMOVE_CONFIRMATION = "REMOVER CONTEUDO";

export const TEXTUAL_TABLE_SKELETON_KEYS = ["first", "second", "third"] as const;

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getQuickRange = (days: number) => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return { from: toInputDate(from), to: toInputDate(today) };
};

export const initialRange = getQuickRange(30);

export const decisionCopy: Record<AdminModerationDecision, { label: string; className: string }> = {
  allow_sensitive: { className: "bg-warning-soft text-warning", label: "Sensível publicado" },
  block: { className: "bg-danger-soft text-danger", label: "Bloqueado" },
  safety_hold: { className: "bg-danger text-primary-foreground", label: "Segurança urgente" },
};

export const statusCopy: Record<AdminModerationStatus, { label: string; className: string }> = {
  pending: { className: "bg-warning-soft text-warning", label: "Pendente" },
  resolved: { className: "bg-success-soft text-success", label: "Resolvido" },
  reviewing: { className: "bg-info-soft text-info", label: "Em revisão" },
};

export const severityCopy: Record<AdminModerationSeverity, { label: string; className: string }> = {
  high: { className: "bg-danger-soft text-danger", label: "Alta" },
  low: { className: "bg-surface-muted text-muted", label: "Baixa" },
  medium: { className: "bg-warning-soft text-warning", label: "Média" },
  urgent: { className: "bg-danger text-primary-foreground", label: "Urgente" },
};

export const categoryLabels: Record<string, string> = {
  abuse_violence: "Abuso/violência",
  explicit_sexual: "Sexual explícito",
  external_link: "Link externo",
  minor_sexual_risk: "Menor/risco sexual",
  other: "Outro",
  self_harm_suicide: "Autolesão/suicídio",
  sexual_health: "Saúde sexual",
  spam_scam: "Spam/golpe",
};

export const reasonLabels: Record<string, string> = {
  external_contact_invitation_blocked: "Convite para contato externo",
  minor_sexual_risk_blocked: "Contexto sexual com menor",
  patient_external_link_blocked: "URL ou domínio externo",
  self_harm_immediate_safety_hold: "Risco imediato/autolesão",
  sensitive_term_requires_admin_awareness: "Termo sensível em relato",
  sensitive_therapeutic_context: "Relato terapêutico sensível",
  sexual_solicitation_blocked: "Solicitação/divulgação sexual",
  spam_or_scam_blocked: "Spam ou golpe",
};

export const targetLabels: Record<string, string> = {
  community_post: "Post",
  post_reply: "Resposta",
  submitted_post: "Post bloqueado antes da publicação",
  submitted_reply: "Resposta bloqueada antes da publicação",
};

export type TextualStatusFilter = "all" | Extract<AdminModerationStatus, "pending" | "resolved">;

export const statusFilterOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Resolvido", value: "resolved" },
] satisfies Array<{ label: string; value: TextualStatusFilter }>;

export const decisionFilterOptions = [
  { label: "Todas", value: "all" },
  { label: "Sensível publicado", value: "allow_sensitive" },
  { label: "Bloqueado", value: "block" },
  { label: "Segurança urgente", value: "safety_hold" },
] satisfies Array<{ label: string; value: "all" | AdminModerationDecision }>;

export type Filters = {
  community: string;
  decision: "all" | AdminModerationDecision;
  from: string;
  status: TextualStatusFilter;
  to: string;
};

export const initialFilters: Filters = {
  community: "all",
  decision: "all",
  from: initialRange.from,
  status: "pending",
  to: initialRange.to,
};

export const textualFiltersSchema = z
  .object({
    community: z.string().max(120, "Use no máximo 120 caracteres."),
    decision: z.enum(["all", "allow_sensitive", "block", "safety_hold"]),
    from: z.string().max(10, "Use uma data válida."),
    status: z.enum(["all", "pending", "resolved"]),
    to: z.string().max(10, "Use uma data válida."),
  })
  .refine((values) => !values.from || !values.to || values.from <= values.to, {
    message: "A data inicial deve ser menor ou igual à final.",
    path: ["to"],
  });

export const resolveSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Informe a nota administrativa.")
    .max(1000, "Use até 1000 caracteres."),
});

export const removeSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === REMOVE_CONFIRMATION,
      `Digite ${REMOVE_CONFIRMATION} para confirmar.`,
    ),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use até 500 caracteres."),
});

export type ResolveValues = z.infer<typeof resolveSchema>;

export type RemoveValues = z.infer<typeof removeSchema>;

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};

export const formatDateOnly = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

export const normalizeTextualFilters = (values: Filters): Filters => ({
  community: values.community,
  decision: values.decision,
  from: values.from,
  status: values.status,
  to: values.to,
});

export const areTextualFiltersEqual = (left: Filters, right: Filters) =>
  left.community === right.community &&
  left.decision === right.decision &&
  left.from === right.from &&
  left.status === right.status &&
  left.to === right.to;
