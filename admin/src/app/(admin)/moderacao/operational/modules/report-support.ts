import { z } from "zod";
import type {
  AdminModerationOperationalAlert,
  AdminModerationOperationalAlertsGroup,
  AdminModerationOperationalAlertsQuery,
  AdminModerationOperationalAlertType,
  AdminModerationSeverity,
} from "@/api/req/moderation";
import { isAdminPublicMediaUrl } from "@/lib/admin-media";

export const PAGE_LIMIT = 10;

export const SKELETON_KEYS = ["first", "second", "third"] as const;

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const groupConfig: Record<
  Exclude<AdminModerationOperationalAlertsGroup, "all">,
  { description: string; emptyLabel: string; title: string }
> = {
  compliance: {
    description:
      "Pendências de conformidade dos psicólogos, incluindo CRP pendente em Plano Profissional e WhatsApp inválido.",
    emptyLabel: "Nenhuma pendência de compliance encontrada no período.",
    title: "Compliance",
  },
  denuncias: {
    description: "Denúncias de posts/respostas para triagem e moderação.",
    emptyLabel: "Nenhuma denúncia encontrada no período.",
    title: "Denúncias",
  },
  operacional: {
    description:
      "Pendências por falta de cobertura, perfis profissionais não publicados e falta de conversão de profissionais.",
    emptyLabel: "Nenhuma pendência operacional encontrada no período.",
    title: "Operacionais",
  },
};

export const denunciaFiltersSchema = z
  .object({
    contentType: z.enum(["all", "post", "reply"]),
    from: z.string().max(10, "Use uma data válida."),
    reason: z.enum(["all", "spam", "abuse", "self_harm", "privacy", "other"]),
    reporter: z.enum(["all", "paciente", "psicologo"]),
    status: z.enum(["all", "pending", "upheld", "dismissed"]),
    to: z.string().max(10, "Use uma data válida."),
  })
  .refine((values) => !values.from || !values.to || values.from <= values.to, {
    message: "A data inicial deve ser menor ou igual à final.",
    path: ["to"],
  });

export type DenunciaFiltersFormValues = z.infer<typeof denunciaFiltersSchema>;

export const denunciaFilterDefaults: DenunciaFiltersFormValues = {
  contentType: "all",
  from: "",
  reason: "all",
  reporter: "all",
  status: "pending",
  to: "",
};

export const operationalCategoryFiltersSchema = z
  .object({
    alertType: z.enum([
      "all",
      "invalid_whatsapp",
      "patient_post_without_coverage",
      "post_report",
      "professional_crp_pending",
      "psychologist_no_conversion",
      "registration_error",
      "unpublished_required_settings",
    ]),
    from: z.string().max(10, "Use uma data válida."),
    plan: z.enum(["all", "cortesia", "gratuito", "profissional"]),
    profileStatus: z.enum(["all", "active", "inactive"]),
    to: z.string().max(10, "Use uma data válida."),
    userRole: z.enum(["all", "paciente", "psicologo"]),
  })
  .refine((values) => !values.from || !values.to || values.from <= values.to, {
    message: "A data inicial deve ser menor ou igual à final.",
    path: ["to"],
  });

export type OperationalCategoryFiltersFormValues = z.infer<typeof operationalCategoryFiltersSchema>;

export const operationalCategoryFilterDefaults: OperationalCategoryFiltersFormValues = {
  alertType: "all",
  from: "",
  plan: "all",
  profileStatus: "all",
  to: "",
  userRole: "all",
};

export const REPORT_DISMISS_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const REPORT_UPHOLD_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const reportReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
});

export const reportDismissSchema = reportReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== REPORT_DISMISS_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${REPORT_DISMISS_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export const reportUpholdSchema = reportReasonSchema
  .extend({
    confirmation: z.string(),
    measure: z.enum(["none", "remove_content"], {
      message: "Selecione a medida de moderação.",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== REPORT_UPHOLD_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${REPORT_UPHOLD_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export type ReportDismissFormValues = z.infer<typeof reportDismissSchema>;

export type ReportUpholdFormValues = z.infer<typeof reportUpholdSchema>;

export const denunciaStatusOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Procedentes", value: "upheld" },
  { label: "Improcedentes", value: "dismissed" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["status"] }>;

export const denunciaContentTypeOptions = [
  { label: "Todos", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Respostas", value: "reply" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["contentType"] }>;

export const denunciaReporterOptions = [
  { label: "Todos", value: "all" },
  { label: "Pacientes", value: "paciente" },
  { label: "Psicólogos", value: "psicologo" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["reporter"] }>;

export const denunciaReasonOptions = [
  { label: "Todos", value: "all" },
  { label: "Spam ou divulgação indevida", value: "spam" },
  { label: "Ofensa, assédio ou discurso de ódio", value: "abuse" },
  { label: "Incentivo à violência ou autolesão", value: "self_harm" },
  { label: "Exposição de dados pessoais", value: "privacy" },
  { label: "Outro motivo", value: "other" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["reason"] }>;

export const operationalCategoryTypeOptions: Record<
  Exclude<AdminModerationOperationalAlertsGroup, "all" | "denuncias">,
  Array<{ label: string; value: "all" | AdminModerationOperationalAlertType }>
> = {
  compliance: [
    { label: "Todos", value: "all" },
    { label: "CRP pendente", value: "professional_crp_pending" },
    { label: "WhatsApp inválido", value: "invalid_whatsapp" },
  ],
  operacional: [
    { label: "Todos", value: "all" },
    { label: "Posts sem cobertura", value: "patient_post_without_coverage" },
    { label: "Erro no cadastro", value: "registration_error" },
    { label: "Perfis não publicados", value: "unpublished_required_settings" },
    { label: "Sem conversão", value: "psychologist_no_conversion" },
  ],
};

export const compliancePlanOptions = [
  { label: "Todos", value: "all" },
  { label: "Plano Gratuito", value: "gratuito" },
  { label: "Plano Profissional", value: "profissional" },
  { label: "Plano Cortesia", value: "cortesia" },
] satisfies Array<{ label: string; value: OperationalCategoryFiltersFormValues["plan"] }>;

export const complianceProfileStatusOptions = [
  { label: "Todos", value: "all" },
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
] satisfies Array<{ label: string; value: OperationalCategoryFiltersFormValues["profileStatus"] }>;

export const operationalUserRoleOptions = [
  { label: "Todos", value: "all" },
  { label: "Pacientes", value: "paciente" },
  { label: "Psicólogos", value: "psicologo" },
] satisfies Array<{ label: string; value: OperationalCategoryFiltersFormValues["userRole"] }>;

export const normalizeDenunciaFilters = (
  values: DenunciaFiltersFormValues,
): DenunciaFiltersFormValues => ({
  contentType: values.contentType,
  from: values.from,
  reason: values.reason,
  reporter: values.reporter,
  status: values.status,
  to: values.to,
});

export const areDenunciaFiltersEqual = (
  left: DenunciaFiltersFormValues,
  right: DenunciaFiltersFormValues,
) =>
  left.contentType === right.contentType &&
  left.from === right.from &&
  left.reason === right.reason &&
  left.reporter === right.reporter &&
  left.status === right.status &&
  left.to === right.to;

export const coerceDenunciaFilters = (
  values?: Partial<DenunciaFiltersFormValues>,
): DenunciaFiltersFormValues => ({
  contentType: values?.contentType ?? denunciaFilterDefaults.contentType,
  from: values?.from ?? denunciaFilterDefaults.from,
  reason: values?.reason ?? denunciaFilterDefaults.reason,
  reporter: values?.reporter ?? denunciaFilterDefaults.reporter,
  status: values?.status ?? denunciaFilterDefaults.status,
  to: values?.to ?? denunciaFilterDefaults.to,
});

export const toOperationalAlertsFilterQuery = (
  values: DenunciaFiltersFormValues,
): Pick<
  AdminModerationOperationalAlertsQuery,
  "contentType" | "from" | "reason" | "reporter" | "status" | "to"
> => {
  const normalized = normalizeDenunciaFilters(values);

  return {
    contentType: normalized.contentType,
    from: normalized.from || undefined,
    reason: normalized.reason !== "all" ? normalized.reason : undefined,
    reporter: normalized.reporter,
    status: normalized.status,
    to: normalized.to || undefined,
  };
};

export const normalizeOperationalCategoryFilters = (
  values: OperationalCategoryFiltersFormValues,
): OperationalCategoryFiltersFormValues => ({
  alertType: values.alertType,
  from: values.from,
  plan: values.plan,
  profileStatus: values.profileStatus,
  to: values.to,
  userRole: values.userRole,
});

export const areOperationalCategoryFiltersEqual = (
  left: OperationalCategoryFiltersFormValues,
  right: OperationalCategoryFiltersFormValues,
) =>
  left.alertType === right.alertType &&
  left.from === right.from &&
  left.plan === right.plan &&
  left.profileStatus === right.profileStatus &&
  left.to === right.to &&
  left.userRole === right.userRole;

export const coerceOperationalCategoryFilters = (
  values?: Partial<OperationalCategoryFiltersFormValues>,
): OperationalCategoryFiltersFormValues => ({
  alertType: values?.alertType ?? operationalCategoryFilterDefaults.alertType,
  from: values?.from ?? operationalCategoryFilterDefaults.from,
  plan: values?.plan ?? operationalCategoryFilterDefaults.plan,
  profileStatus: values?.profileStatus ?? operationalCategoryFilterDefaults.profileStatus,
  to: values?.to ?? operationalCategoryFilterDefaults.to,
  userRole: values?.userRole ?? operationalCategoryFilterDefaults.userRole,
});

export const toOperationalCategoryFilterQuery = (
  values: OperationalCategoryFiltersFormValues,
  group: Exclude<AdminModerationOperationalAlertsGroup, "all" | "denuncias">,
): Pick<
  AdminModerationOperationalAlertsQuery,
  "alertType" | "from" | "plan" | "profileStatus" | "to" | "userRole"
> => {
  const normalized = normalizeOperationalCategoryFilters(values);

  return {
    alertType: normalized.alertType !== "all" ? normalized.alertType : undefined,
    from: normalized.from || undefined,
    plan: group === "compliance" && normalized.plan !== "all" ? normalized.plan : undefined,
    profileStatus:
      group === "compliance" && normalized.profileStatus !== "all"
        ? normalized.profileStatus
        : undefined,
    to: normalized.to || undefined,
    userRole:
      group === "operacional" && normalized.userRole !== "all" ? normalized.userRole : undefined,
  };
};

export const operationalTypeLabels: Record<AdminModerationOperationalAlert["type"], string> = {
  invalid_whatsapp: "WhatsApp inválido",
  patient_post_without_coverage: "Post sem cobertura",
  post_report: "Denúncia de conteúdo",
  professional_crp_pending: "CRP pendente",
  psychologist_no_conversion: "Sem conversão",
  registration_error: "Erro no cadastro",
  unpublished_required_settings: "Perfil não publicado",
};

export const operationalTypeLabel = (value: AdminModerationOperationalAlert["type"]) =>
  operationalTypeLabels[value] ?? "Pendência operacional";

export const operationalGroupCopy: Record<
  AdminModerationOperationalAlert["group"],
  { className: string; label: string }
> = {
  compliance: { className: "bg-danger-soft text-danger", label: "Compliance" },
  denuncias: { className: "bg-danger text-primary-foreground", label: "Denúncias" },
  operacional: { className: "bg-info-soft text-info", label: "Operacional" },
};

export const severityCopy: Record<AdminModerationSeverity, { className: string; label: string }> = {
  high: { className: "bg-danger-soft text-danger", label: "Alta" },
  low: { className: "bg-surface-muted text-muted", label: "Baixa" },
  medium: { className: "bg-warning-soft text-warning", label: "Média" },
  urgent: { className: "bg-danger text-primary-foreground", label: "Urgente" },
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};

export const formatPendingDuration = (alert: AdminModerationOperationalAlert) => {
  const createdAt = new Date(alert.created_at).getTime();
  const computedHours = Number.isNaN(createdAt)
    ? null
    : Math.max(0, Math.floor((Date.now() - createdAt) / 3_600_000));
  const hours =
    typeof alert.age_hours === "number" ? Math.max(0, Math.floor(alert.age_hours)) : computedHours;

  if (hours === null) return "—";
  if (hours < 1) return "menos de 1 hora";
  if (hours < 24) return `${numberFormatter.format(hours)} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${numberFormatter.format(days)} ${days === 1 ? "dia" : "dias"}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${numberFormatter.format(months)} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(days / 365);

  return `${numberFormatter.format(years)} ${years === 1 ? "ano" : "anos"}`;
};

export const isPublicAdminMediaSrc = (src: string) => isAdminPublicMediaUrl(src);
