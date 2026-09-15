import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import type {
  AdminPatientDetail,
  PatientsDetailIntentMetric,
  PatientsDetailMetric,
  PatientsDetailPublication,
  PatientsDetailPublicationMetric,
  PatientsDetailQuery,
  PatientsDetailSeriesPoint,
} from "@/api/req/patients";

export const LOADING_PLACEHOLDERS = ["profile", "engagement", "activity", "communities"] as const;

export const PATIENT_DETAIL_TABS = [
  { id: "geral", label: "Geral" },
  { id: "perfil", label: "Perfil e cadastro" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "publicacoes", label: "Publicações" },
  { id: "denuncias", label: "Denúncias" },
  { id: "atividades", label: "Atividades" },
  { id: "conta", label: "Conta" },
] as const;

export type PatientDetailTab = (typeof PATIENT_DETAIL_TABS)[number]["id"];

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const CARD =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const metricIcons: Record<PatientsDetailMetric["id"], LucideIcon> = {
  comments_created: MessageCircle,
  downvotes_received: ArrowDown,
  posts_created: FileText,
  reports_received: AlertTriangle,
  saves_received: Bookmark,
  shares_received: Share2,
  verified_psychologist_responses: ShieldCheck,
  upvotes_received: ArrowUp,
};

export const patientIntentMetricIcons: Record<PatientsDetailIntentMetric["id"], LucideIcon> = {
  favorites: Bookmark,
  profile_views: Eye,
  repeated_profile_views: RefreshCw,
  whatsapp_clicks: MessageCircle,
};

export const patientIntentMetricToneClassNames: Record<PatientsDetailIntentMetric["id"], string> = {
  favorites: "bg-warning-soft text-warning",
  profile_views: "bg-primary-soft text-primary",
  repeated_profile_views: "bg-chart-accent-soft text-chart-accent",
  whatsapp_clicks: "bg-success/10 text-success",
};

export const patientIntentLevelClassNames: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "border-success/25 bg-success/10 text-success",
  low: "border-primary/20 bg-primary-soft text-primary",
  medium: "border-warning/25 bg-warning/10 text-warning",
  no_signals: "border-border bg-surface-muted text-muted",
};

export const patientIntentProgressClassNames: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "bg-success",
  low: "bg-primary",
  medium: "bg-warning",
  no_signals: "bg-border",
};

export const patientIntentDisplayLabels: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "Qualificado",
  low: "Curioso",
  medium: "Interessado",
  no_signals: "Frio",
};

export const PATIENT_GENERAL_METRIC_IDS = new Set<PatientsDetailMetric["id"]>([
  "posts_created",
  "comments_created",
  "verified_psychologist_responses",
  "reports_received",
]);

export const patientMetricDisplayLabels: Partial<Record<PatientsDetailMetric["id"], string>> = {
  comments_created: "Comentários feitos",
  downvotes_received: "Downvotes (recebidos)",
  posts_created: "Posts feitos",
  reports_received: "Denúncias (recebidas)",
  saves_received: "Salvamentos (recebidos)",
  shares_received: "Compartilhamentos (recebidos)",
  upvotes_received: "Upvotes (recebidos)",
};

export const patientPublicationMetricOrder: (keyof PatientsDetailPublication["metrics"])[] = [
  "views",
  "upvotes",
  "downvotes",
  "comments",
  "saves",
  "shares",
  "reports",
];

export const patientPublicationMetricIcon: Record<
  PatientsDetailPublicationMetric["id"],
  LucideIcon
> = {
  comments: MessageCircle,
  downvotes: ArrowDown,
  reports: AlertTriangle,
  saves: Bookmark,
  shares: Share2,
  upvotes: ArrowUp,
  views: Eye,
};

export const patientPublicationMetricLabel: Record<PatientsDetailPublicationMetric["id"], string> =
  {
    comments: "comentários",
    downvotes: "downvotes",
    reports: "denúncias",
    saves: "salvamentos",
    shares: "compartilhamentos",
    upvotes: "upvotes",
    views: "visualizações",
  };

export type PatientStatisticsSeriesMetricKey = Exclude<keyof PatientsDetailSeriesPoint, "date">;

export type PatientStatisticsChartMetric = {
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  id: PatientsDetailMetric["id"];
  key: PatientStatisticsSeriesMetricKey;
  label: string;
  shortLabel: string;
  strokeClassName: string;
  swatchClassName: string;
};

export const PATIENT_COMMUNITY_CHART_METRICS = [
  {
    icon: FileText,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "posts_created",
    key: "posts_created",
    label: "Posts",
    shortLabel: "Posts",
    strokeClassName: "stroke-primary",
    swatchClassName: "bg-primary",
  },
  {
    icon: MessageCircle,
    iconClassName: "text-info",
    iconToneClassName: "bg-info-soft",
    id: "comments_created",
    key: "comments_created",
    label: "Comentários",
    shortLabel: "Comentários",
    strokeClassName: "stroke-info",
    swatchClassName: "bg-info",
  },
  {
    icon: ShieldCheck,
    iconClassName: "text-chart-tertiary",
    iconToneClassName: "bg-chart-tertiary-soft",
    id: "verified_psychologist_responses",
    key: "verified_psychologist_responses",
    label: "Respostas de psicólogos verificados",
    shortLabel: "Verificados",
    strokeClassName: "stroke-chart-tertiary",
    swatchClassName: "bg-chart-tertiary",
  },
  {
    icon: AlertTriangle,
    iconClassName: "text-danger",
    iconToneClassName: "bg-danger-soft",
    id: "reports_received",
    key: "reports_received",
    label: "Denúncias",
    shortLabel: "Denúncias",
    strokeClassName: "stroke-danger",
    swatchClassName: "bg-danger",
  },
  {
    icon: ArrowUp,
    iconClassName: "text-success",
    iconToneClassName: "bg-success-soft",
    id: "upvotes_received",
    key: "upvotes_received",
    label: "Upvotes",
    shortLabel: "Upvotes",
    strokeClassName: "stroke-success",
    swatchClassName: "bg-success",
  },
  {
    icon: ArrowDown,
    iconClassName: "text-danger",
    iconToneClassName: "bg-danger-soft",
    id: "downvotes_received",
    key: "downvotes_received",
    label: "Downvotes",
    shortLabel: "Downvotes",
    strokeClassName: "stroke-danger",
    swatchClassName: "bg-danger",
  },
  {
    icon: Bookmark,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning-soft",
    id: "saves_received",
    key: "saves_received",
    label: "Salvamentos",
    shortLabel: "Salvamentos",
    strokeClassName: "stroke-warning",
    swatchClassName: "bg-warning",
  },
  {
    icon: Share2,
    iconClassName: "text-chart-accent",
    iconToneClassName: "bg-chart-accent-soft",
    id: "shares_received",
    key: "shares_received",
    label: "Compartilhamentos",
    shortLabel: "Compartilhamentos",
    strokeClassName: "stroke-chart-accent",
    swatchClassName: "bg-chart-accent",
  },
] as const satisfies readonly PatientStatisticsChartMetric[];

export type PatientCommunityChartMetric = (typeof PATIENT_COMMUNITY_CHART_METRICS)[number];

export type PatientCommunityChartMetricId = PatientCommunityChartMetric["id"];

export type PatientStatisticsPeriodValue = NonNullable<PatientsDetailQuery["period"]>;

export type PatientStatisticsPeriodPreset = Exclude<PatientStatisticsPeriodValue, "custom">;

export type PatientStatisticsCustomRange = Pick<PatientsDetailQuery, "from" | "to">;

export const PATIENT_STATISTICS_PERIOD_OPTIONS: {
  id: PatientStatisticsPeriodPreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

export const PATIENT_STATISTICS_SERIES_METRIC_KEYS = PATIENT_COMMUNITY_CHART_METRICS.map(
  (item) => item.key,
) as PatientStatisticsSeriesMetricKey[];

export const EMPTY_SELECT_OPTION = { label: "Não informado", value: "" } as const;

export const PATIENT_GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não dizer", value: "prefiro_nao_dizer" },
] as const;

export const patientPersonalDataSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Informe um nome de exibição com pelo menos 2 caracteres.")
    .max(120, "Use no máximo 120 caracteres."),
  gender: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe um motivo com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
});

export type PatientPersonalDataFormValues = z.infer<typeof patientPersonalDataSchema>;

export const accountReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
});

export const STRONG_CONFIRMATIONS = {
  changeEmail: "ALTERAR E-MAIL",
  revokeSessions: "ENCERRAR SESSÕES",
  temporaryPassword: "ALTERAR SENHA",
} as const;

export const normalizeStrongConfirmation = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, " ");

export const matchesStrongConfirmation = (value: string, expected: string) =>
  normalizeStrongConfirmation(value) === normalizeStrongConfirmation(expected);

export const accountChangeEmailSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    email: z.string().email("Informe um e-mail válido."),
  })
  .superRefine((values, ctx) => {
    if (!matchesStrongConfirmation(values.confirmation, STRONG_CONFIRMATIONS.changeEmail)) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${STRONG_CONFIRMATIONS.changeEmail} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export const accountTemporaryPasswordSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    password: z
      .string()
      .min(10, "Use pelo menos 10 caracteres.")
      .max(128, "Use no máximo 128 caracteres."),
    password_confirm: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!matchesStrongConfirmation(values.confirmation, STRONG_CONFIRMATIONS.temporaryPassword)) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${STRONG_CONFIRMATIONS.temporaryPassword} para confirmar.`,
        path: ["confirmation"],
      });
    }

    if (values.password !== values.password_confirm) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas precisam ser iguais.",
        path: ["password_confirm"],
      });
    }
  });

export const accountRevokeSessionsSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!matchesStrongConfirmation(values.confirmation, STRONG_CONFIRMATIONS.revokeSessions)) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${STRONG_CONFIRMATIONS.revokeSessions} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export const SUSPENSION_DURATION_VALUES = ["1", "7", "15", "30", "60", "90"] as const;

export const SUSPENSION_DURATION_OPTIONS = [
  { label: "1 dia", value: "1" },
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "30 dias", value: "30" },
  { label: "60 dias", value: "60" },
  { label: "90 dias", value: "90" },
];

export const createAccountStatusActionSchema = (
  confirmationText: string,
  requireSuspensionDuration = false,
) =>
  accountReasonSchema
    .extend({
      confirmation: z.string(),
      suspension_duration_days: requireSuspensionDuration
        ? z.enum(SUSPENSION_DURATION_VALUES, {
            message: "Selecione o prazo da suspensão.",
          })
        : z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (!matchesStrongConfirmation(values.confirmation, confirmationText)) {
        ctx.addIssue({
          code: "custom",
          message: `Digite ${confirmationText} para confirmar.`,
          path: ["confirmation"],
        });
      }
    });

export const accountSuspendSchema = createAccountStatusActionSchema("SUSPENDER CONTA", true);

export const accountDeactivateSchema = createAccountStatusActionSchema("DESATIVAR CONTA");

export const accountDeleteSchema = createAccountStatusActionSchema("EXCLUIR CONTA");

export type AccountReasonFormValues = z.infer<typeof accountReasonSchema>;

export type AccountChangeEmailFormValues = z.infer<typeof accountChangeEmailSchema>;

export type AccountTemporaryPasswordFormValues = z.infer<typeof accountTemporaryPasswordSchema>;

export type AccountRevokeSessionsFormValues = z.infer<typeof accountRevokeSessionsSchema>;

export type AccountStatusActionFormValues = z.infer<typeof accountSuspendSchema>;
