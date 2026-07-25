"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  LogOut,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminPatientAccount,
  useAdminPatientActivities,
  useAdminPatientChangeAccountEmail,
  useAdminPatientDeactivateAccount,
  useAdminPatientDeleteAccount,
  useAdminPatientDetail,
  useAdminPatientReports,
  useAdminPatientRevokeSessions,
  useAdminPatientSendEmailConfirmation,
  useAdminPatientSendPasswordReset,
  useAdminPatientSetTemporaryPassword,
  useAdminPatientSuspendAccount,
  useAdminPatientUpdatePersonalData,
} from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientAccount,
  AdminPatientActivitiesQuery,
  AdminPatientDetail,
  AdminPatientReportItem,
  AdminPatientReportsQuery,
  PatientsDetailActivity,
  PatientsDetailCommunity,
  PatientsDetailIntentMetric,
  PatientsDetailMetric,
  PatientsDetailPublication,
  PatientsDetailPublicationMetric,
  PatientsDetailQuery,
  PatientsDetailSeriesPoint,
} from "@/api/req/patients";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const LOADING_PLACEHOLDERS = ["profile", "engagement", "activity", "communities"] as const;
const PATIENT_DETAIL_TABS = [
  { id: "geral", label: "Geral" },
  { id: "perfil", label: "Perfil e cadastro" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "publicacoes", label: "Publicações" },
  { id: "denuncias", label: "Denúncias" },
  { id: "atividades", label: "Atividades" },
  { id: "conta", label: "Conta" },
] as const;
type PatientDetailTab = (typeof PATIENT_DETAIL_TABS)[number]["id"];
const numberFormatter = new Intl.NumberFormat("pt-BR");
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
const CARD = "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const metricIcons: Record<PatientsDetailMetric["id"], LucideIcon> = {
  comments_created: MessageCircle,
  downvotes_received: ArrowDown,
  posts_created: FileText,
  reports_received: AlertTriangle,
  saves_received: Bookmark,
  shares_received: Share2,
  verified_psychologist_responses: ShieldCheck,
  upvotes_received: ArrowUp,
};
const patientIntentMetricIcons: Record<PatientsDetailIntentMetric["id"], LucideIcon> = {
  favorites: Bookmark,
  profile_views: Eye,
  repeated_profile_views: RefreshCw,
  whatsapp_clicks: MessageCircle,
};
const patientIntentMetricToneClassNames: Record<PatientsDetailIntentMetric["id"], string> = {
  favorites: "bg-orange-50 text-orange-500",
  profile_views: "bg-primary-soft text-primary",
  repeated_profile_views: "bg-violet-50 text-violet-500",
  whatsapp_clicks: "bg-success/10 text-success",
};
const patientIntentLevelClassNames: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "border-success/25 bg-success/10 text-success",
  low: "border-primary/20 bg-primary-soft text-primary",
  medium: "border-warning/25 bg-warning/10 text-warning",
  no_signals: "border-border bg-surface-muted text-muted",
};
const patientIntentProgressClassNames: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "bg-success",
  low: "bg-primary",
  medium: "bg-warning",
  no_signals: "bg-border",
};
const patientIntentDisplayLabels: Record<
  AdminPatientDetail["intent_analysis"]["level"]["id"],
  string
> = {
  high: "Qualificado",
  low: "Curioso",
  medium: "Interessado",
  no_signals: "Frio",
};
const PATIENT_GENERAL_METRIC_IDS = new Set<PatientsDetailMetric["id"]>([
  "posts_created",
  "comments_created",
  "verified_psychologist_responses",
  "reports_received",
]);
const patientMetricDisplayLabels: Partial<Record<PatientsDetailMetric["id"], string>> = {
  comments_created: "Comentários feitos",
  downvotes_received: "Downvotes (recebidos)",
  posts_created: "Posts feitos",
  reports_received: "Denúncias (recebidas)",
  saves_received: "Salvamentos (recebidos)",
  shares_received: "Compartilhamentos (recebidos)",
  upvotes_received: "Upvotes (recebidos)",
};
const patientPublicationMetricOrder: (keyof PatientsDetailPublication["metrics"])[] = [
  "views",
  "upvotes",
  "downvotes",
  "comments",
  "saves",
  "shares",
  "reports",
];
const patientPublicationMetricIcon: Record<PatientsDetailPublicationMetric["id"], LucideIcon> = {
  comments: MessageCircle,
  downvotes: ArrowDown,
  reports: AlertTriangle,
  saves: Bookmark,
  shares: Share2,
  upvotes: ArrowUp,
  views: Eye,
};
const patientPublicationMetricLabel: Record<PatientsDetailPublicationMetric["id"], string> = {
  comments: "comentários",
  downvotes: "downvotes",
  reports: "denúncias",
  saves: "salvamentos",
  shares: "compartilhamentos",
  upvotes: "upvotes",
  views: "visualizações",
};
type PatientStatisticsSeriesMetricKey = Exclude<keyof PatientsDetailSeriesPoint, "date">;
type PatientStatisticsChartMetric = {
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

const PATIENT_COMMUNITY_CHART_METRICS = [
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
    iconClassName: "text-blue-500",
    iconToneClassName: "bg-blue-50",
    id: "comments_created",
    key: "comments_created",
    label: "Comentários",
    shortLabel: "Comentários",
    strokeClassName: "stroke-blue-500",
    swatchClassName: "bg-blue-500",
  },
  {
    icon: ShieldCheck,
    iconClassName: "text-teal-500",
    iconToneClassName: "bg-teal-50",
    id: "verified_psychologist_responses",
    key: "verified_psychologist_responses",
    label: "Respostas de psicólogos verificados",
    shortLabel: "Verificados",
    strokeClassName: "stroke-teal-500",
    swatchClassName: "bg-teal-500",
  },
  {
    icon: AlertTriangle,
    iconClassName: "text-rose-500",
    iconToneClassName: "bg-rose-50",
    id: "reports_received",
    key: "reports_received",
    label: "Denúncias",
    shortLabel: "Denúncias",
    strokeClassName: "stroke-rose-500",
    swatchClassName: "bg-rose-500",
  },
  {
    icon: ArrowUp,
    iconClassName: "text-emerald-500",
    iconToneClassName: "bg-emerald-50",
    id: "upvotes_received",
    key: "upvotes_received",
    label: "Upvotes",
    shortLabel: "Upvotes",
    strokeClassName: "stroke-emerald-500",
    swatchClassName: "bg-emerald-500",
  },
  {
    icon: ArrowDown,
    iconClassName: "text-red-500",
    iconToneClassName: "bg-red-50",
    id: "downvotes_received",
    key: "downvotes_received",
    label: "Downvotes",
    shortLabel: "Downvotes",
    strokeClassName: "stroke-red-500",
    swatchClassName: "bg-red-500",
  },
  {
    icon: Bookmark,
    iconClassName: "text-orange-500",
    iconToneClassName: "bg-orange-50",
    id: "saves_received",
    key: "saves_received",
    label: "Salvamentos",
    shortLabel: "Salvamentos",
    strokeClassName: "stroke-orange-500",
    swatchClassName: "bg-orange-500",
  },
  {
    icon: Share2,
    iconClassName: "text-violet-500",
    iconToneClassName: "bg-violet-50",
    id: "shares_received",
    key: "shares_received",
    label: "Compartilhamentos",
    shortLabel: "Compartilhamentos",
    strokeClassName: "stroke-violet-500",
    swatchClassName: "bg-violet-500",
  },
] as const satisfies readonly PatientStatisticsChartMetric[];

type PatientCommunityChartMetric = (typeof PATIENT_COMMUNITY_CHART_METRICS)[number];
type PatientCommunityChartMetricId = PatientCommunityChartMetric["id"];
type PatientStatisticsPeriodValue = NonNullable<PatientsDetailQuery["period"]>;
type PatientStatisticsPeriodPreset = Exclude<PatientStatisticsPeriodValue, "custom">;
type PatientStatisticsCustomRange = Pick<PatientsDetailQuery, "from" | "to">;
const PATIENT_STATISTICS_PERIOD_OPTIONS: { id: PatientStatisticsPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "month", label: "Este mês" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];
const PATIENT_STATISTICS_SERIES_METRIC_KEYS = PATIENT_COMMUNITY_CHART_METRICS.map(
  (item) => item.key,
) as PatientStatisticsSeriesMetricKey[];
const EMPTY_SELECT_OPTION = { label: "Não informado", value: "" } as const;
const PATIENT_GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não dizer", value: "prefiro_nao_dizer" },
] as const;
const patientPersonalDataSchema = z.object({
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
type PatientPersonalDataFormValues = z.infer<typeof patientPersonalDataSchema>;

const accountReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
});

const STRONG_CONFIRMATIONS = {
  changeEmail: "ALTERAR E-MAIL",
  revokeSessions: "ENCERRAR SESSÕES",
  temporaryPassword: "ALTERAR SENHA",
} as const;

const normalizeStrongConfirmation = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, " ");

const matchesStrongConfirmation = (value: string, expected: string) =>
  normalizeStrongConfirmation(value) === normalizeStrongConfirmation(expected);

const accountChangeEmailSchema = accountReasonSchema
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

const accountTemporaryPasswordSchema = accountReasonSchema
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

const accountRevokeSessionsSchema = accountReasonSchema
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

const SUSPENSION_DURATION_VALUES = ["1", "7", "15", "30", "60", "90"] as const;

const SUSPENSION_DURATION_OPTIONS = [
  { label: "1 dia", value: "1" },
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "30 dias", value: "30" },
  { label: "60 dias", value: "60" },
  { label: "90 dias", value: "90" },
];

const createAccountStatusActionSchema = (
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

const accountSuspendSchema = createAccountStatusActionSchema("SUSPENDER CONTA", true);
const accountDeactivateSchema = createAccountStatusActionSchema("DESATIVAR CONTA");
const accountDeleteSchema = createAccountStatusActionSchema("EXCLUIR CONTA");

type AccountReasonFormValues = z.infer<typeof accountReasonSchema>;
type AccountChangeEmailFormValues = z.infer<typeof accountChangeEmailSchema>;
type AccountTemporaryPasswordFormValues = z.infer<typeof accountTemporaryPasswordSchema>;
type AccountRevokeSessionsFormValues = z.infer<typeof accountRevokeSessionsSchema>;
type AccountStatusActionFormValues = z.infer<typeof accountSuspendSchema>;

const formatDateTime = (value?: string | null) => {
  if (!value) return "N\u00e3o informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N\u00e3o informado";

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};
const formatLastAccess = (value?: string | null) => {
  if (!value) return "N\u00e3o capturado";

  return formatDateTime(value);
};
const formatPlatformDuration = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes <= 0) return `${remainder}s`;
  if (remainder === 0) return `${minutes}min`;

  return `${minutes}min ${remainder}s`;
};
const formatInputDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};
const formatDayMonth = (value?: string | null) => {
  if (!value) return "período anterior";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  const date = new Date(isoDate ? `${isoDate}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "período anterior";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
};
const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};
const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};
const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};
const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};
const getPatientStatisticsRangeForPeriod = (
  period: PatientStatisticsPeriodPreset,
  createdAt?: string | null,
): Required<PatientStatisticsCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toDateInputValue(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toDateInputValue(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toDateInputValue(startOfLastDays(90)), to: today };

  return { from: dateInputValueFromString(createdAt), to: today };
};
const buildPatientStatisticsPeriodQuery = (
  period: PatientStatisticsPeriodValue,
  customRange: PatientStatisticsCustomRange,
): PatientsDetailQuery =>
  period === "custom" ? { from: customRange.from, period, to: customRange.to } : { period };
const patientStatisticsDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
const isValidPatientStatisticsRange = (range: PatientStatisticsCustomRange) => {
  if (!range.from || !range.to) return false;

  return patientStatisticsDateFromInput(range.from) <= patientStatisticsDateFromInput(range.to);
};
const PATIENT_STATISTICS_CUSTOM_RANGE_ERROR =
  "Informe um período personalizado completo, com data inicial menor ou igual à final.";

const usePatientStatisticsPeriodFilter = (createdAt?: string | null) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PatientStatisticsPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<PatientStatisticsPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<PatientStatisticsCustomRange>(() =>
    getPatientStatisticsRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<PatientStatisticsCustomRange>(() =>
    getPatientStatisticsRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const periodQuery = useMemo(
    () => buildPatientStatisticsPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const handlePeriodChange = useCallback(
    (period: PatientStatisticsPeriodPreset) => {
      const nextRange = getPatientStatisticsRangeForPeriod(period, createdAt);

      setRangeError(null);
      setSelectedPeriod(period);
      setAppliedPeriod(period);
      setDraftRange(nextRange);
      setAppliedRange(nextRange);
    },
    [createdAt],
  );
  const handleDateChange = useCallback(
    (field: keyof PatientStatisticsCustomRange, value: string) => {
      setRangeError(null);
      setSelectedPeriod("custom");
      setDraftRange((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );
  const commitRange = useCallback(() => {
    if (selectedPeriod !== "custom") return;

    if (!isValidPatientStatisticsRange(draftRange)) {
      setRangeError(PATIENT_STATISTICS_CUSTOM_RANGE_ERROR);
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
  }, [draftRange, selectedPeriod]);
  const handleDateControlsBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const currentTarget = event.currentTarget;
      const nextFocusedElement = event.relatedTarget as Node | null;

      if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

      window.setTimeout(() => {
        const activeElement = document.activeElement;

        if (activeElement && currentTarget.contains(activeElement)) return;

        commitRange();
      }, 0);
    },
    [commitRange],
  );

  return {
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    handlePeriodChange,
    periodQuery,
    rangeError,
    selectedPeriod,
  };
};
const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};
const safeAvatarSrc = (src: string | null) => {
  if (!src) return null;
  if (src.startsWith("/public/files/") || src.startsWith("/community/icons/")) {
    return `${apiUrl}${src}`;
  }
  if (src.startsWith("/")) return src;
  try {
    const url = new URL(src);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return src;
  } catch {
    return null;
  }
  return null;
};
const isApiMediaSrc = (src: string | null) => Boolean(src?.startsWith(apiUrl));
const isPublicMediaPath = (pathname: string) =>
  publicMediaPathPrefixes.some((prefix) => pathname.startsWith(prefix));
const resolveAdminMediaUrl = (src?: string | null) => {
  const value = src?.trim();
  if (!value) return null;

  const apiBase = apiUrl.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);
    if (isPublicMediaPath(parsed.pathname)) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }
    if (value.startsWith("http")) return value;
    return value.startsWith("/") ? value : `${apiBase}/${value}`;
  } catch {
    if (publicMediaPathPrefixes.some((prefix) => value.startsWith(prefix))) {
      return `${apiBase}${value}`;
    }
    return value.startsWith("/") || value.startsWith("http") ? value : null;
  }
};
const allowedRemoteImageHosts = () => {
  const hosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

  for (const candidate of [
    apiUrl,
    ...(process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",") ?? []),
  ]) {
    const normalized = candidate.trim();
    if (!normalized) continue;

    try {
      const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
      if (url.hostname) hosts.add(url.hostname);
    } catch {
      // Entradas inválidas de env não devem quebrar a renderização de mídia.
    }
  }

  return hosts;
};
const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    const url = new URL(resolved);

    return allowedRemoteImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};
const renderableImageSrc = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);

  return resolved && canRenderImage(resolved) ? resolved : null;
};
const isPublicAdminMediaSrc = (src: string) => {
  try {
    return isPublicMediaPath(new URL(src, apiUrl).pathname);
  } catch {
    return false;
  }
};
const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PA";
const isPatientDetailTab = (value: string | null): value is PatientDetailTab =>
  PATIENT_DETAIL_TABS.some((tab) => tab.id === value);
const patientTabHref = (id: string, tab: PatientDetailTab) =>
  tab === "geral" ? `/pacientes/${id}` : `/pacientes/${id}?tab=${tab}`;
const toPublicHref = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;

  return `${publicFrontendUrl.replace(/\/$/, "")}${url}`;
};
const formatNullable = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim();
  return normalized || "N\u00e3o informado";
};
const emptyToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};
const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value === undefined || value === null ? null : String(value));
  if (formatted === "N\u00e3o informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};
const mergeCurrentOption = (
  options: readonly { label: string; value: string }[],
  currentValue?: string | null,
) => {
  const normalized = String(currentValue ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return [...options];
  const [firstOption, ...restOptions] = options;
  if (!firstOption) {
    return [{ label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized }];
  }

  return [
    firstOption,
    { label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized },
    ...restOptions,
  ];
};
const getStaticOptionLabel = (
  options: readonly { label: string; value: string }[],
  value?: string | null,
) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "N\u00e3o informado";

  return (
    options.find((option) => option.value === normalized)?.label ??
    capitalizeOptionLabel(normalized)
  );
};
const formatPatientGender = (value?: string | null) =>
  getStaticOptionLabel(PATIENT_GENDER_OPTIONS, value);

const CardShell = ({ children, className, ...props }: ComponentPropsWithoutRef<"section">) => (
  <section className={cn(CARD, className)} {...props}>
    {children}
  </section>
);

const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      className,
    )}
  >
    {children}
  </span>
);

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = safeAvatarSrc(src);
  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-black text-primary sm:h-32 sm:w-32">
        {initialsFromName(name)}
      </span>
    );
  }
  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-32 sm:w-32"
      height={128}
      priority
      src={imageSrc}
      unoptimized={isApiMediaSrc(imageSrc)}
      width={128}
    />
  );
};

const TrendBadge = ({ metric }: { metric: PatientsDetailMetric }) => (
  <span
    className={cn(
      "text-xs font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      ["flat", "unavailable"].includes(metric.trend) && "text-muted",
    )}
  >
    {formatChange(metric.change_percent)}
  </span>
);

const MetricCard = ({ metric }: { metric: PatientsDetailMetric }) => {
  const Icon = metricIcons[metric.id];
  const label = patientMetricDisplayLabels[metric.id] ?? metric.label;

  return (
    <CardShell className="h-full min-h-[10rem] w-full p-4">
      <IconCircle icon={Icon} />
      <p className="mt-4 text-sm font-extrabold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-bold text-muted">vs. período anterior</span>
      </div>
    </CardShell>
  );
};

type PatientStatisticsPeriodControlsProps = {
  className?: string;
  idPrefix: string;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof PatientStatisticsCustomRange, value: string) => void;
  onPeriodChange: (period: PatientStatisticsPeriodPreset) => void;
  period: PatientStatisticsPeriodValue;
  range: PatientStatisticsCustomRange;
  rangeError: string | null;
};

const PatientStatisticsPeriodControls = ({
  className,
  idPrefix,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
}: PatientStatisticsPeriodControlsProps) => (
  <div className={cn("w-full lg:w-[min(720px,52vw)]", className)} onBlur={onDateControlsBlur}>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-period`}>
        Período
        <span className="relative mt-2 block">
          <select
            className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id={`${idPrefix}-period`}
            onChange={(event) =>
              onPeriodChange(event.target.value as PatientStatisticsPeriodPreset)
            }
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {PATIENT_STATISTICS_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
          />
        </span>
      </label>

      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-from`}>
        De
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-from`}
          onChange={(event) => onDateChange("from", event.target.value)}
          type="date"
          value={range.from ?? ""}
        />
      </label>
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-to`}>
        Até
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-to`}
          onChange={(event) => onDateChange("to", event.target.value)}
          type="date"
          value={range.to ?? ""}
        />
      </label>
    </div>
    {rangeError ? (
      <p className="mt-2 max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

const formatPatientPreviousPeriod = (period: AdminPatientDetail["period"]) =>
  period.previous_from && period.previous_to
    ? `${formatDayMonth(period.previous_from)} - ${formatDayMonth(period.previous_to)}`
    : "período anterior";

const PatientMetricComparisonLine = ({
  metric,
  period,
}: {
  metric: Pick<PatientsDetailMetric, "change_percent" | "trend">;
  period: AdminPatientDetail["period"];
}) => {
  const hasArrow = metric.trend === "up" || metric.trend === "down";
  const TrendIcon = metric.trend === "down" ? ArrowDown : ArrowUp;

  return (
    <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[0.68rem]">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-black",
          metric.trend === "up" && "text-success",
          metric.trend === "down" && "text-danger",
          (metric.trend === "flat" || metric.trend === "unavailable") && "text-muted",
        )}
      >
        {hasArrow ? <TrendIcon aria-hidden className="h-3 w-3" /> : null}
        {formatChange(metric.change_percent)}
      </span>
      <span className="min-w-0 break-words font-bold text-muted">
        vs. {formatPatientPreviousPeriod(period)}
      </span>
    </div>
  );
};

const PatientStatisticsMetricToggleCard = ({
  active,
  config,
  metric,
  onToggle,
  period,
}: {
  active: boolean;
  config: PatientStatisticsChartMetric;
  metric: PatientsDetailMetric;
  onToggle: () => void;
  period: AdminPatientDetail["period"];
}) => {
  const Icon = config.icon;
  const label = config.label;
  const displayValue = numberFormatter.format(metric.value);

  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${label}: ${displayValue}. ${active ? "Visível no gráfico" : "Oculto no gráfico"}`}
      type="button"
    >
      <span className="block min-w-0 max-w-full">
        <span className="block">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              config.iconToneClassName,
              config.iconClassName,
            )}
          >
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </span>
        <span className="mt-4 block min-w-0 max-w-full">
          <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
            {label}
          </span>
          <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
            {displayValue}
          </span>
        </span>
      </span>
      <PatientMetricComparisonLine metric={metric} period={period} />
      <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

const patientStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]";

const PatientStatisticsMetricCarousel = ({
  items,
  title,
}: {
  items: { content: ReactNode; id: string }[];
  title: string;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMetrics = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(260, scroller.clientWidth * 0.82),
    });
  }, []);

  return (
    <fieldset className="mt-5 min-w-0 max-w-full overflow-x-clip">
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div className="relative min-w-0 max-w-full px-11 sm:px-12">
        <button
          aria-label={`Rolar contadores de ${title} para a esquerda`}
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {items.map((item) => (
            <div className={patientStatisticsMetricItemClassName} key={item.id}>
              {item.content}
            </div>
          ))}
        </div>
        <button
          aria-label={`Rolar contadores de ${title} para a direita`}
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar o paciente</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const Header = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => {
  const reportsAlertInput = useMemo<AdminPatientReportsQuery>(
    () => ({ limit: 1, page: 1, status: "all", type: "all" }),
    [],
  );
  const reportsAlertQuery = useAdminPatientReports(id, reportsAlertInput);
  const reportsCount =
    reportsAlertQuery.data?.cards.find((card) => card.id === "total")?.value ?? 0;
  const location = detail.header.location
    ? [detail.header.location.city, detail.header.location.state, detail.header.location.country]
        .filter(Boolean)
        .join(", ")
    : "Localiza\u00e7\u00e3o n\u00e3o capturada";
  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-5 sm:flex-1 sm:flex-row sm:items-center">
          <Avatar name={detail.header.name} src={detail.header.avatar} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {detail.header.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <span>Paciente</span>
            </div>
            <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto text-sm text-muted sm:gap-x-6 md:overflow-visible xl:gap-x-8">
              <span
                className="inline-flex min-w-0 max-w-80 shrink items-center gap-2 whitespace-nowrap"
                title={detail.header.email}
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{detail.header.email}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{detail.header.status === "active" ? "Conta ativa" : "Conta inativa"}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{location}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              {"\u00daltimo acesso"}: {formatLastAccess(detail.header.last_access_at)}
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do paciente" className="flex min-w-max gap-1 py-1">
          {PATIENT_DETAIL_TABS.map((item) => {
            const active = item.id === tab;
            const showReportsAlert = item.id === "denuncias" && reportsCount > 0;
            const reportsAlertLabel =
              reportsCount === 1
                ? "Há 1 denúncia vinculada ao paciente"
                : `Há ${numberFormatter.format(reportsCount)} denúncias vinculadas ao paciente`;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
                href={patientTabHref(id, item.id)}
                key={item.id}
              >
                <span>{item.label}</span>
                {showReportsAlert ? (
                  <AlertTriangle aria-label={reportsAlertLabel} className="h-4 w-4 text-danger" />
                ) : null}
                {active ? (
                  <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};
const aggregatePatientStatisticsChartPoints = (points: PatientsDetailSeriesPoint[]) =>
  aggregateCalendarChartPoints(points, PATIENT_STATISTICS_SERIES_METRIC_KEYS);

const PatientStatisticsSeriesChart = ({
  keys,
  points,
}: {
  keys: readonly PatientStatisticsChartMetric[];
  points: PatientsDetailSeriesPoint[];
}) => {
  if (keys.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador disponível para visualizar a evolução.
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = aggregatePatientStatisticsChartPoints(points);
  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const max = Math.max(
    1,
    ...chartPoints.flatMap((point) => keys.map((item) => Number(point[item.key] ?? 0))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <div className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Evolução do período por contador selecionado"
          className="block h-auto w-full"
          height={chartHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Evolução do período</title>
          {gridValues.map((value) => {
            const y = yFor(value);

            return (
              <g key={`patient-statistics-grid-${value}-${y}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={value === 0 ? "0" : "4 6"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="fill-muted text-[10px] font-medium"
                  dominantBaseline="middle"
                  textAnchor="end"
                  x={padding.left - 8}
                  y={y}
                >
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {keys.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[item.key] ?? 0)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                className={cn("fill-none opacity-90", item.strokeClassName)}
                d={linePath}
                key={item.id}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {keys.map((item) =>
            chartPoints.map((point, index) => {
              const value = Number(point[item.key] ?? 0);

              return (
                <circle
                  className={cn("fill-surface", item.strokeClassName)}
                  cx={xFor(index)}
                  cy={yFor(value)}
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {item.label}: {numberFormatter.format(value)}
                  </title>
                </circle>
              );
            }),
          )}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const EngagementChart = ({
  detail,
  isRefreshing,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing: boolean;
  periodControls: ReactNode;
}) => {
  const metricMap = new Map(detail.metrics.map((metric) => [metric.id, metric]));
  const cards = PATIENT_COMMUNITY_CHART_METRICS.flatMap((config) => {
    const metric = metricMap.get(config.id);

    return metric ? [{ config, metric }] : [];
  });
  const [visibleMetricIds, setVisibleMetricIds] = useState<PatientCommunityChartMetricId[]>(() =>
    PATIENT_COMMUNITY_CHART_METRICS.map((item) => item.id),
  );
  const visibleChartKeys = cards
    .filter(({ config }) => visibleMetricIds.includes(config.id))
    .map(({ config }) => config);
  const toggleMetric = (metricId: PatientCommunityChartMetricId) => {
    setVisibleMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Estatísticas de comunidade</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Publicações que realizou e respostas, votos, denúncias, salvamentos e compartilhamentos
            que recebeu.
          </p>
        </div>
        {periodControls}
      </div>

      <PatientStatisticsMetricCarousel
        items={cards.map(({ config, metric }) => ({
          content: (
            <PatientStatisticsMetricToggleCard
              active={visibleMetricIds.includes(config.id)}
              config={config}
              metric={metric}
              onToggle={() => toggleMetric(config.id)}
              period={detail.period}
            />
          ),
          id: config.id,
        }))}
        title="estatísticas de comunidade"
      />

      <PatientStatisticsSeriesChart keys={visibleChartKeys} points={detail.series.points} />
    </CardShell>
  );
};

const ActivityList = ({
  detail,
  emptyMessage = "Nenhum evento real foi encontrado para este paciente no período selecionado.",
  items = detail.activities.items,
  title = "Atividades recentes",
}: {
  detail: AdminPatientDetail;
  emptyMessage?: string;
  items?: PatientsDetailActivity[];
  title?: string;
}) => {
  const patientName = detail.header.name || "Não informado";

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            Registro simples dos principais eventos reais encontrados.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-3 pr-3 font-black">Data</th>
                <th className="px-3 py-3 font-black">Ação</th>
                <th className="px-3 py-3 font-black">Descrição</th>
                <th className="px-3 py-3 font-black">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((activity) => (
                <tr key={activity.id}>
                  <td className="py-3 pr-3 font-bold text-muted">
                    {formatDateTime(activity.occurred_at)}
                  </td>
                  <td className="px-3 py-3 font-black text-foreground">{activity.title}</td>
                  <td className="px-3 py-3 text-muted">{activity.description}</td>
                  <td className="px-3 py-3">
                    <span className="block font-black text-foreground">{patientName}</span>
                    <span className="mt-1 block text-xs font-bold text-muted">Paciente</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
};

const DetailFilterSelect = ({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className={cn("block text-sm font-black text-muted", className)}>
    {label}
    <span className="relative mt-2 block">
      <select
        className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

const ActivitiesPagination = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => {
  const safePages = Math.max(1, pages);
  const safePage = Math.min(Math.max(1, page), safePages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-bold text-muted">
        Página {numberFormatter.format(safePage)} de {numberFormatter.format(safePages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
          disabled={safePage <= 1}
          onClick={() => setPage(Math.max(1, safePage - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Anterior
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
          disabled={safePage >= safePages}
          onClick={() => setPage(Math.min(safePages, safePage + 1))}
          type="button"
        >
          Próxima
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const ActivitiesLoadingState = () => (
  <div className="space-y-5" data-patient-activities-loading="true">
    <CardShell className="h-[8.25rem] animate-pulse bg-surface-muted" />
    <CardShell className="overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="h-6 w-56 rounded-full bg-surface-muted" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-full bg-surface-muted" />
      </div>
      <div className="divide-y divide-border">
        {["one", "two", "three"].map((row) => (
          <div className="grid gap-3 p-4 sm:grid-cols-[10rem_12rem_1fr_12rem]" key={row}>
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
    </CardShell>
  </div>
);

const resolveActivityPeriod = (preset: string, customFrom: string, customTo: string) => {
  if (preset === "all") return {};
  if (preset === "custom") {
    return customFrom && customTo ? { from: customFrom, to: customTo } : {};
  }

  const days = preset === "30d" ? 30 : preset === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: formatInputDate(from.toISOString()),
    to: formatInputDate(to.toISOString()),
  };
};

const ActivitiesTab = ({ id }: { id: string }) => {
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [area, setArea] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const periodRange = useMemo(
    () => resolveActivityPeriod(period, customFrom, customTo),
    [customFrom, customTo, period],
  );
  const queryInput = useMemo<AdminPatientActivitiesQuery>(
    () => ({
      ...periodRange,
      area,
      limit: 8,
      page,
      q: q.trim() || undefined,
      type,
    }),
    [area, page, periodRange, q, type],
  );
  const query = useAdminPatientActivities(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <ActivitiesLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const activities = query.data;

  return (
    <div className="space-y-5" data-patient-detail-tab="atividades">
      <CardShell className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.25fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(150px,.9fr)_minmax(260px,1.35fr)] xl:items-end">
          <label className="block min-w-0 text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-foreground outline-none placeholder:text-muted"
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por descrição..."
                value={q}
              />
            </span>
          </label>
          <DetailFilterSelect
            className="min-w-0"
            label="Tipo de atividade"
            onChange={(nextValue) => {
              setType(nextValue);
              setPage(1);
            }}
            value={type}
          >
            {activities.filters.types.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            className="min-w-0"
            label="Área"
            onChange={(nextValue) => {
              setArea(nextValue);
              setPage(1);
            }}
            value={area}
          >
            {activities.filters.areas.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            className="min-w-0"
            label="Período"
            onChange={(nextValue) => {
              setPeriod(nextValue);
              setPage(1);
            }}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            <option value="all">Todo o período</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="180d">Últimos 180 dias</option>
          </DetailFilterSelect>
          <fieldset className="m-0 min-w-0 border-0 p-0 text-sm font-black text-muted [min-inline-size:0]">
            <legend className="p-0">Data</legend>
            <div className="mt-2 grid gap-2 min-[520px]:grid-cols-2">
              <input
                aria-label="Data inicial"
                className="h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={customTo || undefined}
                onChange={(event) => {
                  setPeriod("custom");
                  setCustomFrom(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customFrom}
              />
              <input
                aria-label="Data final"
                className="h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={customFrom || undefined}
                onChange={(event) => {
                  setPeriod("custom");
                  setCustomTo(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customTo}
              />
            </div>
          </fieldset>
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Atividades da conta</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(activities.data.length)} de{" "}
              {numberFormatter.format(activities.count)} eventos principais filtrados.
            </p>
          </div>
        </div>

        {activities.data.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma atividade real encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-40" />
                <col className="w-48" />
                <col />
                <col className="w-52" />
              </colgroup>
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="py-3 pr-3 pl-4 font-black">Data</th>
                  <th className="px-3 py-3 font-black">Ação</th>
                  <th className="px-3 py-3 font-black">Descrição</th>
                  <th className="py-3 pr-4 pl-3 font-black">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.data.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 pl-4 font-bold text-muted">
                      {formatDateTime(item.occurred_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{item.type.label}</td>
                    <td className="px-3 py-3 text-muted">{item.description}</td>
                    <td className="py-3 pr-4 pl-3">
                      <span className="block font-black text-foreground">
                        {item.actor?.name || "Não informado"}
                      </span>
                      {item.actor?.role ? (
                        <span className="mt-1 block text-xs font-bold text-muted">
                          {item.actor.role}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border p-4">
          <ActivitiesPagination page={activities.page} pages={activities.pages} setPage={setPage} />
        </div>
      </CardShell>
    </div>
  );
};

const CommunityAvatar = ({
  community,
  index,
}: {
  community: PatientsDetailCommunity;
  index: number;
}) => {
  const imageSrc = safeAvatarSrc(community.avatar_url);

  if (imageSrc) {
    return (
      <Image
        alt={`Avatar da comunidade ${community.name}`}
        className="h-11 w-11 shrink-0 rounded-[18px] object-cover"
        height={44}
        src={imageSrc}
        unoptimized={isApiMediaSrc(imageSrc)}
        width={44}
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] text-sm font-black text-white"
      style={{ backgroundColor: community.color || "var(--admin-primary)" }}
    >
      {index + 1}
    </span>
  );
};

const formatPatientCommunityPeriodActions = (interactions: number) =>
  interactions === 1
    ? "1 interação no período"
    : `${numberFormatter.format(interactions)} interações no período`;

const patientCommunityEngagementDiagnosisClassName = (id: string | undefined) =>
  cn(
    "whitespace-nowrap",
    id === "muito_ativo" && "bg-success/10 text-success",
    id === "ativo" && "bg-primary-soft text-primary",
    id === "pouco_ativo" && "bg-warning/10 text-warning",
    (!id || id === "sem_base") && "bg-surface-muted text-muted",
  );

const getPatientCommunityEngagementDiagnosis = (
  community: PatientsDetailCommunity,
): NonNullable<PatientsDetailCommunity["engagement_diagnosis"]> =>
  community.engagement_diagnosis ?? {
    id: "sem_base",
    label: "Sem base",
    source: "community_post+post_reply+post_vote+post_save+post_reply_save",
  };

const getPatientCommunityUpvotes = (community: PatientsDetailCommunity) =>
  community.upvotes ?? community.votes;

const getPatientCommunityDownvotes = (community: PatientsDetailCommunity) =>
  community.downvotes ?? 0;

const PatientActiveCommunitiesBlock = ({
  communities,
  isRefreshing,
  periodControls,
}: {
  communities: PatientsDetailCommunity[];
  isRefreshing: boolean;
  periodControls: ReactNode;
}) => (
  <CardShell className="min-w-0 max-w-full overflow-hidden p-5">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-foreground">Comunidades ativas</h2>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              Atualizando
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-bold leading-5 text-muted">
          Publicações que realizou, votos que deu e conteúdo que salvou nas comunidades.
        </p>
        <Badge className="mt-3 w-fit bg-surface-muted text-muted">
          {numberFormatter.format(communities.length)} comunidades
        </Badge>
      </div>
      {periodControls}
    </div>

    {communities.length === 0 ? (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Nenhuma comunidade com interação real do paciente foi encontrada no período.
      </p>
    ) : (
      <div className="mt-5 overflow-x-auto rounded-[1.35rem] border border-border bg-surface">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <caption className="sr-only">
            Lista de comunidades ativas do paciente por comunidade, posts, comentários, upvotes,
            downvotes, salvamentos e engajamento, com status de seguimento junto ao nome.
          </caption>
          <thead className="bg-surface-muted/80">
            <tr className="text-xs font-black text-muted">
              <th className="px-4 py-3" scope="col">
                Comunidade
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Posts
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Comentários
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Upvotes
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Downvotes
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Salvamentos
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Engajamento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {communities.map((community, index) => {
              const diagnosis = getPatientCommunityEngagementDiagnosis(community);

              return (
                <tr
                  className="align-middle transition hover:bg-surface-muted/45"
                  key={community.id}
                >
                  <th className="px-4 py-4" scope="row">
                    <div className="flex min-w-0 items-center gap-3">
                      <CommunityAvatar community={community} index={index} />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="block max-w-[18rem] truncate text-sm font-black text-foreground">
                            {community.name}
                          </span>
                          <Badge
                            className={cn(
                              "shrink-0 whitespace-nowrap",
                              community.is_member
                                ? "bg-success/10 text-success"
                                : "bg-surface-muted text-muted",
                            )}
                          >
                            {community.is_member ? "Seguindo" : "Não seguindo"}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs font-bold text-muted">
                          {formatPatientCommunityPeriodActions(community.interactions)}
                        </span>
                      </span>
                    </div>
                  </th>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.posts)}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.comments)}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(getPatientCommunityUpvotes(community))}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(getPatientCommunityDownvotes(community))}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.saves)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge className={patientCommunityEngagementDiagnosisClassName(diagnosis.id)}>
                      {diagnosis.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

type PatientPlatformHourlyActivityPoint =
  AdminPatientDetail["platform_usage"]["hourly_activity"][number];
type PatientPlatformHourlyActivityMetricKey =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reviews";
type PatientPlatformHourlyActivitySelection = "all" | `${number}`;

const patientPlatformHourlyActivityBreakdown: {
  className: string;
  key: PatientPlatformHourlyActivityMetricKey;
  label: string;
}[] = [
  { className: "bg-primary", key: "accesses", label: "Acessos" },
  { className: "bg-success", key: "posts", label: "Posts" },
  { className: "bg-warning", key: "replies", label: "Comentários" },
  { className: "bg-info", key: "engagement", label: "Interações" },
  { className: "bg-violet-500", key: "reviews", label: "Avaliações" },
];

const patientPlatformWeekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

const patientPlatformWeekdayLabel = (day: number) =>
  day === 0
    ? "Dom"
    : day === 1
      ? "Seg"
      : day === 2
        ? "Ter"
        : day === 3
          ? "Qua"
          : day === 4
            ? "Qui"
            : day === 5
              ? "Sex"
              : "Sáb";

const formatPatientPlatformActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const nextHour = (normalizedHour + 1) % 24;

  return `${String(normalizedHour).padStart(2, "0")}h-${String(nextHour).padStart(2, "0")}h`;
};

const safePatientPlatformActivityCount = (value: number | null | undefined) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

const normalizePatientPlatformHourlyActivityPoint = (
  point: Partial<PatientPlatformHourlyActivityPoint> | undefined,
  hour: number,
): PatientPlatformHourlyActivityPoint => {
  const accesses = Math.max(0, Number(point?.accesses ?? point?.count ?? 0));
  const engagement = Math.max(0, Number(point?.engagement ?? 0));
  const posts = Math.max(0, Number(point?.posts ?? 0));
  const replies = Math.max(0, Number(point?.replies ?? 0));
  const reviews = Math.max(0, Number(point?.reviews ?? 0));
  const total = Math.max(
    0,
    Number(point?.total ?? accesses + engagement + posts + replies + reviews),
  );

  return {
    accesses,
    count: Math.max(0, Number(point?.count ?? total)),
    engagement,
    hour,
    label: point?.label || formatPatientPlatformActivityHourRange(hour),
    percentage: Math.max(0, Number(point?.percentage ?? 0)),
    posts,
    replies,
    reviews,
    total,
  };
};

const PATIENT_STATISTICS_VISUAL_EXAMPLE_PATIENT_ID = "cmrqsrab5001f1guh2ve5oy90";
const PATIENT_STATISTICS_VISUAL_EXAMPLE_ENABLED = process.env.NODE_ENV === "development";

const PATIENT_STATISTICS_VISUAL_EXAMPLE_METRICS: Partial<
  Record<PatientsDetailMetric["id"], number>
> = {
  comments_created: 18,
  downvotes_received: 3,
  posts_created: 6,
  reports_received: 2,
  saves_received: 9,
  shares_received: 5,
  upvotes_received: 31,
  verified_psychologist_responses: 4,
};

const PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES = {
  comments_created: [2, 4, 5, 3, 4],
  downvotes_received: [0, 1, 0, 1, 1],
  posts_created: [0, 1, 2, 1, 2],
  reports_received: [0, 0, 1, 0, 1],
  saves_received: [1, 2, 2, 1, 3],
  shares_received: [0, 1, 1, 1, 2],
  upvotes_received: [4, 6, 8, 5, 8],
  verified_psychologist_responses: [0, 1, 1, 1, 1],
} satisfies Record<PatientStatisticsSeriesMetricKey, number[]>;

const PATIENT_STATISTICS_VISUAL_EXAMPLE_ACTIVITY_HOURS = [
  { accesses: 2, engagement: 1, hour: 8, replies: 1, reviews: 1, total: 5 },
  { accesses: 4, hour: 10, posts: 2, replies: 3, reviews: 2, total: 11 },
  { accesses: 3, engagement: 3, hour: 14, posts: 1, replies: 3, total: 10 },
  { accesses: 5, engagement: 4, hour: 18, posts: 2, replies: 3, total: 14 },
  { accesses: 2, engagement: 2, hour: 21, replies: 3, total: 7 },
] satisfies Array<{
  accesses?: number;
  engagement?: number;
  hour: number;
  posts?: number;
  replies?: number;
  reviews?: number;
  total: number;
}>;

const PATIENT_INTENT_ANALYSIS_VISUAL_EXAMPLE_METRICS = {
  favorites: { previousValue: 0, value: 1 },
  profile_views: { previousValue: 4, value: 7 },
  repeated_profile_views: { previousValue: 1, value: 2 },
  whatsapp_clicks: { previousValue: 0, value: 1 },
} satisfies Record<
  PatientsDetailIntentMetric["id"],
  {
    previousValue: number;
    value: number;
  }
>;

const patientStatisticsVisualExampleChartMetricIds = new Set<PatientsDetailMetric["id"]>(
  PATIENT_COMMUNITY_CHART_METRICS.map((metric) => metric.id),
);

const patientStatisticsVisualExampleNumber = (value: number | null | undefined) =>
  Math.max(0, Number(value ?? 0));

const isPatientStatisticsVisualExampleEligible = (id: string) =>
  PATIENT_STATISTICS_VISUAL_EXAMPLE_ENABLED && id === PATIENT_STATISTICS_VISUAL_EXAMPLE_PATIENT_ID;

const hasPatientIntentAnalysisData = (detail: AdminPatientDetail) => {
  const intent = detail.intent_analysis;

  return (
    intent.score > 0 ||
    intent.total_signals > 0 ||
    intent.unique_psychologists_contacted > 0 ||
    intent.unique_psychologists_favorited > 0 ||
    intent.unique_psychologists_viewed > 0 ||
    intent.metrics.some((metric) => metric.value > 0)
  );
};

const shouldUsePatientIntentVisualExample = (id: string, detail: AdminPatientDetail) =>
  isPatientStatisticsVisualExampleEligible(id) && !hasPatientIntentAnalysisData(detail);

const hasPatientStatisticsCommunityChartData = (detail: AdminPatientDetail) =>
  detail.metrics.some(
    (metric) => patientStatisticsVisualExampleChartMetricIds.has(metric.id) && metric.value > 0,
  ) ||
  detail.series.points.some((point) =>
    PATIENT_STATISTICS_SERIES_METRIC_KEYS.some((key) => point[key] > 0),
  );

const hasPatientStatisticsActiveCommunitiesData = (detail: AdminPatientDetail) =>
  detail.communities.items.length > 0;

const hasPatientStatisticsActivityHoursData = (detail: AdminPatientDetail) => {
  const hasHourlyActivity = detail.platform_usage.hourly_activity.some(
    (point) => patientStatisticsVisualExampleNumber(point.total) > 0,
  );
  const hasWeekdayActivity = detail.platform_usage.hourly_activity_by_weekday.some((day) =>
    day.hours.some((point) => patientStatisticsVisualExampleNumber(point.total) > 0),
  );

  return hasHourlyActivity || hasWeekdayActivity;
};

const hasPatientStatisticsPlatformUsageData = (detail: AdminPatientDetail) => {
  const usage = detail.platform_usage;

  return (
    patientStatisticsVisualExampleNumber(usage.sessions_count) > 0 ||
    patientStatisticsVisualExampleNumber(usage.access_days_count) > 0 ||
    patientStatisticsVisualExampleNumber(usage.device_usage.total_sessions) > 0 ||
    usage.top_pages.some((page) => patientStatisticsVisualExampleNumber(page.count) > 0)
  );
};

const shouldUsePatientStatisticsVisualExample = (id: string, detail: AdminPatientDetail) =>
  isPatientStatisticsVisualExampleEligible(id) &&
  (!hasPatientStatisticsCommunityChartData(detail) ||
    !hasPatientStatisticsActiveCommunitiesData(detail) ||
    !hasPatientStatisticsActivityHoursData(detail) ||
    !hasPatientStatisticsPlatformUsageData(detail));

const formatPatientStatisticsVisualExampleDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parsePatientStatisticsVisualExampleDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

type PatientIntentLevelId = AdminPatientDetail["intent_analysis"]["level"]["id"];

const patientIntentVisualExampleLevelLabel = (
  id: PatientIntentLevelId,
): AdminPatientDetail["intent_analysis"]["level"]["label"] =>
  (
    ({
      high: "Qualificado",
      low: "Curioso",
      medium: "Interessado",
      no_signals: "Frio",
    }) as Record<PatientIntentLevelId, AdminPatientDetail["intent_analysis"]["level"]["label"]>
  )[id];

const buildPatientIntentVisualExampleLevel = (
  score: number,
): AdminPatientDetail["intent_analysis"]["level"] => {
  if (score >= 70) {
    return { id: "high", label: patientIntentVisualExampleLevelLabel("high"), tone: "hot" };
  }

  if (score >= 40) {
    return { id: "medium", label: patientIntentVisualExampleLevelLabel("medium"), tone: "warm" };
  }

  if (score > 0) {
    return { id: "low", label: patientIntentVisualExampleLevelLabel("low"), tone: "cool" };
  }

  return {
    id: "no_signals",
    label: patientIntentVisualExampleLevelLabel("no_signals"),
    tone: "neutral",
  };
};

const buildPatientIntentVisualExampleMetrics = (
  metrics: PatientsDetailIntentMetric[],
): PatientsDetailIntentMetric[] =>
  metrics.map((metric) => {
    const example = PATIENT_INTENT_ANALYSIS_VISUAL_EXAMPLE_METRICS[metric.id];
    const previousValue = Math.max(0, example.previousValue);
    const value = Math.max(0, example.value);
    const changePercent =
      previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : null;
    const trend =
      changePercent === null
        ? "unavailable"
        : value > previousValue
          ? "up"
          : value < previousValue
            ? "down"
            : "flat";

    return {
      ...metric,
      change_percent: changePercent,
      previous_value: previousValue,
      score_contribution: value * metric.score_weight,
      trend,
      value,
    };
  });

const buildPatientIntentVisualExampleDetail = (detail: AdminPatientDetail): AdminPatientDetail => {
  const metrics = buildPatientIntentVisualExampleMetrics(detail.intent_analysis.metrics);
  const score = Math.min(
    detail.intent_analysis.max_score,
    metrics.reduce((total, metric) => total + metric.score_contribution, 0),
  );
  const periodTo = formatPatientStatisticsVisualExampleDate(
    parsePatientStatisticsVisualExampleDate(detail.period.to) ?? new Date(),
  );

  return {
    ...detail,
    intent_analysis: {
      ...detail.intent_analysis,
      coverage_note:
        "Indicador interno do Admin para avaliar visualmente a proximidade do contato no período selecionado.",
      last_signal_at: `${periodTo}T18:40:00-03:00`,
      level: buildPatientIntentVisualExampleLevel(score),
      metrics,
      score,
      summary:
        "Paciente com múltiplos sinais de descoberta, favoritos e intenção de contato no período selecionado.",
      total_signals: metrics.reduce((total, metric) => total + metric.value, 0),
      unique_psychologists_contacted: 1,
      unique_psychologists_favorited: 1,
      unique_psychologists_viewed: 5,
    },
  };
};

const buildPatientStatisticsVisualExampleDates = (detail: AdminPatientDetail) => {
  const existingDates = detail.series.points.map((point) => point.date).filter(Boolean);

  if (existingDates.length >= 5) {
    return existingDates.slice(-5);
  }

  const toDate =
    parsePatientStatisticsVisualExampleDate(detail.period.to) ??
    parsePatientStatisticsVisualExampleDate(detail.period.from) ??
    new Date();

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(toDate);
    date.setDate(toDate.getDate() - (4 - index));

    return formatPatientStatisticsVisualExampleDate(date);
  });
};

const buildPatientStatisticsVisualExampleSeries = (detail: AdminPatientDetail) =>
  buildPatientStatisticsVisualExampleDates(detail).map((date, index) => ({
    date,
    comments_created: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.comments_created[index] ?? 0,
    downvotes_received: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.downvotes_received[index] ?? 0,
    posts_created: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.posts_created[index] ?? 0,
    reports_received: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.reports_received[index] ?? 0,
    saves_received: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.saves_received[index] ?? 0,
    shares_received: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.shares_received[index] ?? 0,
    upvotes_received: PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.upvotes_received[index] ?? 0,
    verified_psychologist_responses:
      PATIENT_STATISTICS_VISUAL_EXAMPLE_SERIES.verified_psychologist_responses[index] ?? 0,
  }));

const buildPatientStatisticsVisualExampleMetrics = (metrics: AdminPatientDetail["metrics"]) =>
  metrics.map((metric) => {
    const value = PATIENT_STATISTICS_VISUAL_EXAMPLE_METRICS[metric.id];

    if (typeof value !== "number") {
      return metric;
    }

    const previousValue = Math.max(0, value - Math.ceil(value * 0.25));
    const changePercent =
      previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : null;
    const trend: PatientsDetailMetric["trend"] =
      value > previousValue ? "up" : value < previousValue ? "down" : "flat";

    return {
      ...metric,
      change_percent: changePercent,
      previous_value: previousValue,
      trend,
      value,
    };
  });

const buildPatientStatisticsVisualExampleCommunities = (
  detail: AdminPatientDetail,
): AdminPatientDetail["communities"]["items"] => {
  const periodStart = detail.period.from ?? formatPatientStatisticsVisualExampleDate(new Date());
  const diagnosisSource = "community_post+post_reply+post_vote+post_save+post_reply_save";

  return [
    {
      avatar_url: null,
      color: "#2F80ED",
      comments: 8,
      downvotes: 1,
      engagement_diagnosis: {
        id: "muito_ativo",
        label: "Muito ativo",
        source: diagnosisSource,
      },
      id: "visual-example-community-ansiedade",
      interactions: 19,
      is_member: true,
      member_since: periodStart,
      name: "Ansiedade e rotina",
      posts: 3,
      saves: 4,
      slug: "visual-example-ansiedade-rotina",
      upvotes: 14,
      votes: 15,
    },
    {
      avatar_url: null,
      color: "#19A463",
      comments: 6,
      downvotes: 0,
      engagement_diagnosis: {
        id: "ativo",
        label: "Ativo",
        source: diagnosisSource,
      },
      id: "visual-example-community-autocuidado",
      interactions: 14,
      is_member: true,
      member_since: periodStart,
      name: "Autocuidado diário",
      posts: 2,
      saves: 3,
      slug: "visual-example-autocuidado-diario",
      upvotes: 11,
      votes: 11,
    },
    {
      avatar_url: null,
      color: "#9B51E0",
      comments: 4,
      downvotes: 2,
      engagement_diagnosis: {
        id: "pouco_ativo",
        label: "Pouco ativo",
        source: diagnosisSource,
      },
      id: "visual-example-community-sono",
      interactions: 10,
      is_member: false,
      member_since: null,
      name: "Sono e descanso",
      posts: 1,
      saves: 2,
      slug: "visual-example-sono-descanso",
      upvotes: 6,
      votes: 8,
    },
  ];
};

const buildPatientStatisticsVisualExampleHourlyActivity = (scale = 1) =>
  Array.from({ length: 24 }, (_, hour) => {
    const example = PATIENT_STATISTICS_VISUAL_EXAMPLE_ACTIVITY_HOURS.find(
      (point) => point.hour === hour,
    );

    return normalizePatientPlatformHourlyActivityPoint(
      {
        accesses: Math.round((example?.accesses ?? 0) * scale),
        engagement: Math.round((example?.engagement ?? 0) * scale),
        posts: Math.round((example?.posts ?? 0) * scale),
        replies: Math.round((example?.replies ?? 0) * scale),
        reviews: Math.round((example?.reviews ?? 0) * scale),
        total: Math.round((example?.total ?? 0) * scale),
      },
      hour,
    );
  });

const buildPatientStatisticsVisualExampleWeekdayActivity = () => {
  const multipliers = {
    0: 0.2,
    1: 0.55,
    2: 0.7,
    3: 1,
    4: 0.85,
    5: 0.65,
    6: 0.35,
  } satisfies Record<(typeof patientPlatformWeekdayDisplayOrder)[number], number>;

  return patientPlatformWeekdayDisplayOrder.map((day) => ({
    day,
    hours: buildPatientStatisticsVisualExampleHourlyActivity(multipliers[day]),
    label: patientPlatformWeekdayLabel(day),
  }));
};

const buildPatientStatisticsVisualExamplePeakHours = (
  hourlyActivity: PatientPlatformHourlyActivityPoint[],
) => {
  const totalActivity = hourlyActivity.reduce(
    (total, point) => total + patientStatisticsVisualExampleNumber(point.total),
    0,
  );

  return hourlyActivity
    .filter((point) => patientStatisticsVisualExampleNumber(point.total) > 0)
    .sort(
      (first, second) =>
        patientStatisticsVisualExampleNumber(second.total) -
        patientStatisticsVisualExampleNumber(first.total),
    )
    .slice(0, 3)
    .map((point) => ({
      count: patientStatisticsVisualExampleNumber(point.total),
      hour: point.hour,
      label: point.label,
      percentage:
        totalActivity > 0
          ? (patientStatisticsVisualExampleNumber(point.total) / totalActivity) * 100
          : 0,
    }));
};

const buildPatientStatisticsVisualExamplePlatformUsage = (
  usage: AdminPatientDetail["platform_usage"],
  shouldFillActivityHours: boolean,
  shouldFillPlatformUsage: boolean,
): AdminPatientDetail["platform_usage"] => {
  const hourlyActivity = shouldFillActivityHours
    ? buildPatientStatisticsVisualExampleHourlyActivity()
    : usage.hourly_activity;
  const weekdayActivity = shouldFillActivityHours
    ? buildPatientStatisticsVisualExampleWeekdayActivity()
    : usage.hourly_activity_by_weekday;
  const peakActivityHours = shouldFillActivityHours
    ? buildPatientStatisticsVisualExamplePeakHours(hourlyActivity)
    : usage.peak_activity_hours;

  if (!shouldFillPlatformUsage) {
    return {
      ...usage,
      hourly_activity: hourlyActivity,
      hourly_activity_by_weekday: weekdayActivity,
      peak_activity_hours: peakActivityHours,
    };
  }

  const visualExampleLastAccessAt = usage.last_access_at ?? `${usage.period_to}T18:30:00.000Z`;

  return {
    ...usage,
    access_days_count: 5,
    average_duration_seconds: 742,
    device_usage: {
      ...usage.device_usage,
      items: [
        {
          count: 21,
          device_type: "desktop",
          id: "desktop",
          label: "Desktop",
          operating_systems: [],
          percentage: 60,
        },
        {
          count: 12,
          device_type: "mobile",
          id: "mobile",
          label: "Mobile",
          operating_systems: [],
          percentage: 34.3,
        },
        {
          count: 2,
          device_type: "tablet",
          id: "tablet",
          label: "Tablet",
          operating_systems: [],
          percentage: 5.7,
        },
        {
          count: 0,
          device_type: "unknown",
          id: "unknown",
          label: "Não identificado",
          operating_systems: [],
          percentage: 0,
        },
      ],
      total_sessions: 35,
      unavailable_reason: null,
    },
    duration_unavailable_reason: null,
    hourly_activity: hourlyActivity,
    hourly_activity_by_weekday: weekdayActivity,
    last_access_at: visualExampleLastAccessAt,
    peak_activity_hours: peakActivityHours,
    pwa_installation_recorded: true,
    pwa_installed_at: usage.pwa_installed_at ?? visualExampleLastAccessAt,
    sessions_count: 35,
    top_pages: [
      { count: 14, label: "Comunidades", percentage: 40 },
      { count: 9, label: "Perfil", percentage: 25.7 },
      { count: 7, label: "Sessões", percentage: 20 },
      { count: 5, label: "Notificações", percentage: 14.3 },
    ],
    unavailable_reason: null,
  };
};

const buildPatientStatisticsVisualExampleDetail = (
  detail: AdminPatientDetail,
): AdminPatientDetail => {
  const shouldFillCommunityChart = !hasPatientStatisticsCommunityChartData(detail);
  const shouldFillActiveCommunities = !hasPatientStatisticsActiveCommunitiesData(detail);
  const shouldFillActivityHours = !hasPatientStatisticsActivityHoursData(detail);
  const shouldFillPlatformUsage = !hasPatientStatisticsPlatformUsageData(detail);

  return {
    ...detail,
    communities: shouldFillActiveCommunities
      ? {
          ...detail.communities,
          items: buildPatientStatisticsVisualExampleCommunities(detail),
        }
      : detail.communities,
    metrics: shouldFillCommunityChart
      ? buildPatientStatisticsVisualExampleMetrics(detail.metrics)
      : detail.metrics,
    platform_usage: buildPatientStatisticsVisualExamplePlatformUsage(
      detail.platform_usage,
      shouldFillActivityHours,
      shouldFillPlatformUsage,
    ),
    series: shouldFillCommunityChart
      ? {
          ...detail.series,
          points: buildPatientStatisticsVisualExampleSeries(detail),
        }
      : detail.series,
  };
};
type PatientPlatformDeviceUsage = AdminPatientDetail["platform_usage"]["device_usage"];
type PatientPlatformDeviceUsageItem = PatientPlatformDeviceUsage["items"][number];

const formatDeviceSessionCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "sessão" : "sessões"}`;

const formatDevicePercentage = (percentage: number) => `${percentage.toLocaleString("pt-BR")}%`;

const patientPlatformDeviceChartColors = {
  desktop: "#13a85b",
  mobile: "#308ce8",
  tablet: "#8b5cf6",
  unknown: "#94a3b8",
} satisfies Record<PatientPlatformDeviceUsageItem["device_type"], string>;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getPiePoint = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const buildPieSlicePath = (
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const PlatformDevicePiePercentageLabel = ({
  color,
  label,
  x,
  y,
}: {
  color: string;
  label: string;
  x: number;
  y: number;
}) => {
  const width = 39;
  const height = 16;

  return (
    <g>
      <rect
        fill={hexToRgba(color, 0.86)}
        height={height}
        rx={height / 2}
        width={width}
        x={x - width / 2}
        y={y - height / 2}
      />
      <text
        dominantBaseline="middle"
        fill="var(--admin-surface)"
        fontSize="8.5"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 0.25}
      >
        {label}
      </text>
    </g>
  );
};

const PatientPlatformDeviceUsageSection = ({
  deviceUsage,
}: {
  deviceUsage?: PatientPlatformDeviceUsage;
}) => {
  const items = deviceUsage?.items ?? [];
  const totalSessions = deviceUsage?.total_sessions ?? 0;
  const center = 60;
  const radius = 48;
  const visibleItems = items.filter((item) => item.count > 0);
  const hasDeviceSessions = totalSessions > 0 && visibleItems.length > 0;
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: PatientPlatformDeviceUsageItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = totalSessions > 0 ? item.count / totalSessions : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;
  const ariaLabel = hasDeviceSessions
    ? `Gráfico de pizza dos devices usados pelo paciente: ${items
        .map(
          (item) =>
            `${item.label}: ${formatDeviceSessionCount(item.count)}, ${formatDevicePercentage(
              item.percentage,
            )}`,
        )
        .join("; ")}.`
    : `Gráfico de pizza dos devices usados pelo paciente: ${
        deviceUsage?.unavailable_reason ??
        "sem sessões autenticadas por dispositivo no período selecionado."
      }`;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-foreground">Devices</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Sessões autenticadas do paciente por tipo de dispositivo no período.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-black text-muted">
          {formatDeviceSessionCount(totalSessions)}
        </span>
      </div>

      <figure className="mt-3 grid gap-4 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-36 sm:w-40"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx={center}
            cy={center}
            fill="var(--admin-surface-muted)"
            r={radius}
            stroke="var(--admin-border)"
            strokeWidth="1"
          />
          {segments.map((segment) => {
            const color = patientPlatformDeviceChartColors[segment.item.device_type];
            const labelPoint = getPiePoint(
              center,
              radius * 0.58,
              (segment.startAngle + segment.endAngle) / 2,
            );
            const percentageLabel = formatDevicePercentage(segment.item.percentage);

            if (segment.share >= 0.999) {
              return (
                <g key={segment.item.device_type}>
                  <circle
                    cx={center}
                    cy={center}
                    fill={color}
                    r={radius}
                    stroke="var(--admin-surface)"
                    strokeWidth="1.4"
                  />
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={center}
                    y={center}
                  />
                </g>
              );
            }

            return (
              <g key={segment.item.device_type}>
                <path
                  d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                  fill={color}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {segment.share >= 0.08 ? (
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={labelPoint.x}
                    y={labelPoint.y}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
        <figcaption className="space-y-3">
          {hasDeviceSessions ? (
            items.map((device) => {
              const operatingSystems = (device.operating_systems ?? []).filter(
                (item) => item.count > 0,
              );

              return (
                <div className="rounded-2xl bg-surface-muted p-3" key={device.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: patientPlatformDeviceChartColors[device.device_type],
                        }}
                      />
                      <span className="truncate">{device.label}</span>
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {formatDevicePercentage(device.percentage)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {formatDeviceSessionCount(device.count)}
                  </p>
                  {operatingSystems.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {operatingSystems.map((operatingSystem) => (
                        <span
                          className="rounded-full bg-surface px-2 py-1 text-[0.68rem] font-black text-muted"
                          key={operatingSystem.id}
                        >
                          {operatingSystem.label}: {formatDeviceSessionCount(operatingSystem.count)}{" "}
                          · {formatDevicePercentage(operatingSystem.percentage)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[0.68rem] font-bold text-subtle">
                      Sistema operacional não identificado.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
              {deviceUsage?.unavailable_reason ??
                "Sem sessões autenticadas por dispositivo no período selecionado."}
            </p>
          )}
        </figcaption>
      </figure>
    </section>
  );
};

const PatientPlatformUsageCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const usage = detail.platform_usage;

  return (
    <CardShell className="p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Uso da plataforma</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            Acessos, sessões, duração média e instalação PWA do paciente no período.
          </p>
        </div>
        {periodControls}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Último acesso", formatDateTime(usage.last_access_at)],
          ["Dias com acesso", numberFormatter.format(usage.access_days_count)],
          ["Sessões", numberFormatter.format(usage.sessions_count)],
          ["Tempo médio", formatPlatformDuration(usage.average_duration_seconds)],
          ["PWA instalado", usage.pwa_installation_recorded ? "Sim" : "Não registrado"],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {usage.duration_unavailable_reason ? (
        <p className="mt-3 text-xs font-bold text-subtle">{usage.duration_unavailable_reason}</p>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <h3 className="text-sm font-black text-foreground">Páginas mais acessadas</h3>
          {usage.unavailable_reason ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
              {usage.unavailable_reason}
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {usage.top_pages.map((page) => (
                <div className="rounded-2xl border border-border/70 p-3" key={page.label}>
                  <div className="flex items-center justify-between gap-3 text-xs font-black">
                    <span className="text-muted">{page.label}</span>
                    <span className="text-foreground">
                      {numberFormatter.format(page.count)} ·{" "}
                      {page.percentage.toLocaleString("pt-BR")}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      aria-hidden
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, page.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <PatientPlatformDeviceUsageSection deviceUsage={usage.device_usage} />
      </div>
    </CardShell>
  );
};

const formatPatientIntentScore = (score: number, maxScore: number) =>
  `${numberFormatter.format(score)}/${numberFormatter.format(maxScore)}`;

const PatientIntentMetricCard = ({
  metric,
  period,
}: {
  metric: PatientsDetailIntentMetric;
  period: AdminPatientDetail["period"];
}) => {
  const Icon = patientIntentMetricIcons[metric.id];

  return (
    <div className="rounded-2xl border border-border/75 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            patientIntentMetricToneClassNames[metric.id],
          )}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-black text-muted">
          +{numberFormatter.format(metric.score_weight)} pts/sinal
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-muted">
        {metric.label}
      </p>
      <p className="mt-1 text-2xl font-black text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-muted">{metric.description}</p>
      <PatientMetricComparisonLine metric={metric} period={period} />
    </div>
  );
};

const PatientIntentAnalysisCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const intent = detail.intent_analysis;
  const scorePercentage =
    intent.max_score > 0 ? Math.min(100, Math.max(0, (intent.score / intent.max_score) * 100)) : 0;

  return (
    <CardShell className="min-w-0 max-w-full overflow-hidden p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Análise de intenção do paciente</h2>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black",
                patientIntentLevelClassNames[intent.level.id],
              )}
            >
              {intent.level.label}
            </span>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{intent.coverage_note}</p>
        </div>
        {periodControls}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[28px] border border-primary/15 bg-primary-soft/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
                Score de intenção
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {formatPatientIntentScore(intent.score, intent.max_score)}
              </p>
            </div>
            <IconCircle icon={BarChart3} />
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              aria-hidden
              className={cn(
                "h-full rounded-full transition-all",
                patientIntentProgressClassNames[intent.level.id],
              )}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
          <p className="mt-4 text-sm font-bold leading-6 text-muted">{intent.summary}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Psicólogos vistos</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_viewed)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Favoritados</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_favorited)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Contatados</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_contacted)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Último sinal</dt>
              <dd className="mt-1 font-black text-foreground">
                {intent.last_signal_at ? formatDateTime(intent.last_signal_at) : "Não capturado"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="grid min-w-0 gap-3 sm:grid-cols-2">
          {intent.metrics.map((metric) => (
            <PatientIntentMetricCard key={metric.id} metric={metric} period={detail.period} />
          ))}
        </section>
      </div>
    </CardShell>
  );
};

const PatientPlatformActivityHoursCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const usage = detail.platform_usage;
  const [selectedWeekday, setSelectedWeekday] =
    useState<PatientPlatformHourlyActivitySelection>("all");
  const platformActivityHours = useMemo(() => {
    const peakActivityHours = usage.peak_activity_hours ?? [];
    const activitySource =
      usage.hourly_activity && usage.hourly_activity.length > 0
        ? usage.hourly_activity
        : peakActivityHours;
    const activityByHour = new Map(activitySource.map((hour) => [hour.hour, hour]));

    return Array.from({ length: 24 }, (_, hour) =>
      normalizePatientPlatformHourlyActivityPoint(activityByHour.get(hour), hour),
    );
  }, [usage.hourly_activity, usage.peak_activity_hours]);
  const platformActivityHoursByWeekday = useMemo(() => {
    const activityByDay = new Map(
      (usage.hourly_activity_by_weekday ?? []).map((item) => [item.day, item]),
    );

    return new Map(
      patientPlatformWeekdayDisplayOrder.map((day) => {
        const item = activityByDay.get(day);
        const activityByHour = new Map((item?.hours ?? []).map((hour) => [hour.hour, hour]));

        return [
          String(day) as PatientPlatformHourlyActivitySelection,
          {
            day,
            label: item?.label ?? patientPlatformWeekdayLabel(day),
            points: Array.from({ length: 24 }, (_, hour) =>
              normalizePatientPlatformHourlyActivityPoint(activityByHour.get(hour), hour),
            ),
          },
        ];
      }),
    );
  }, [usage.hourly_activity_by_weekday]);
  const selectedWeekdayItem =
    selectedWeekday === "all" ? null : platformActivityHoursByWeekday.get(selectedWeekday);
  const chartActivityHours = selectedWeekdayItem?.points ?? platformActivityHours;
  const selectedWeekdayLabel = selectedWeekdayItem?.label ?? "Todos os dias";
  const totalPlatformActivityHours = platformActivityHours.reduce(
    (total, hour) => total + hour.total,
    0,
  );
  const chartTotalPlatformActivityHours = chartActivityHours.reduce(
    (total, hour) => total + hour.total,
    0,
  );
  const maxPlatformActivityHourCount = Math.max(1, ...chartActivityHours.map((hour) => hour.total));

  return (
    <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Horários de maior atividade</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Distribuição por hora das atividades reais do paciente no período.
          </p>
        </div>
        {periodControls}
      </div>

      {totalPlatformActivityHours > 0 ? (
        <>
          <div className="mt-5">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">
                Selecionar dia da semana do gráfico de horários do paciente
              </legend>
              <button
                aria-pressed={selectedWeekday === "all"}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-black transition",
                  selectedWeekday === "all"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/35 hover:text-primary",
                )}
                onClick={() => setSelectedWeekday("all")}
                type="button"
              >
                Todos
              </button>
              {[...platformActivityHoursByWeekday.entries()].map(([id, item]) => (
                <button
                  aria-pressed={selectedWeekday === id}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-black transition",
                    selectedWeekday === id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted hover:border-primary/35 hover:text-primary",
                  )}
                  key={id}
                  onClick={() => setSelectedWeekday(id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
            <div className="min-w-[760px]">
              {chartTotalPlatformActivityHours === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
                  Nenhuma atividade real foi registrada para {selectedWeekdayLabel.toLowerCase()}.
                </div>
              ) : (
                <div
                  aria-label={`Distribuição horária de atividade do paciente em ${selectedWeekdayLabel}`}
                  className="flex h-44 items-end gap-1"
                  role="img"
                >
                  {chartActivityHours.map((hour) => {
                    const percentage = (hour.total / maxPlatformActivityHourCount) * 100;
                    const barHeight = hour.total > 0 ? Math.max(8, percentage) : 2;

                    return (
                      <div
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        key={hour.hour}
                      >
                        <div className="flex h-32 w-full items-end justify-center rounded-t-xl bg-surface-muted px-1">
                          <span
                            className="w-full max-w-[1rem] rounded-t-full bg-primary transition"
                            style={{ height: `${barHeight}%` }}
                            title={`${hour.label}: ${numberFormatter.format(hour.total)} atividades`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-subtle">
                          {String(hour.hour).padStart(2, "0")}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {patientPlatformHourlyActivityBreakdown.map((metric) => {
              const value = chartActivityHours.reduce((total, hour) => total + hour[metric.key], 0);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-muted"
                  key={metric.key}
                >
                  <span className={cn("h-2 w-2 rounded-full", metric.className)} />
                  {metric.label}: {safePatientPlatformActivityCount(value)}
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          Sem horários de atividade registrados no período.
        </p>
      )}
    </CardShell>
  );
};

const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border/80 py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-extrabold text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

const InfoCard = ({
  action,
  children,
  contentAsDescriptionList = true,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  contentAsDescriptionList?: boolean;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    {contentAsDescriptionList ? (
      <dl className="mt-4">{children}</dl>
    ) : (
      <div className="mt-4">{children}</div>
    )}
  </CardShell>
);

const formatPatientLocation = (detail: AdminPatientDetail) => {
  const location = detail.header.location;
  if (!location) return "Não capturada";

  return (
    [location.city, location.state, location.country].filter(Boolean).join(", ") || "Não capturada"
  );
};

const SummaryCard = ({
  actionHref,
  actionLabel,
  eyebrow,
  children,
  helperText,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  eyebrow: string;
  helperText: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="flex h-full flex-col p-5">
    <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
          <p className="mt-1 text-xl font-black text-foreground">{title}</p>
        </div>
        <IconCircle icon={Icon} />
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-muted">{helperText}</p>
    </div>
    <dl className="mt-4 flex-1 divide-y divide-border text-sm">{children}</dl>
    {actionHref && actionLabel ? (
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    ) : null}
  </CardShell>
);

const AccountSituationCard = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const active = detail.header.status === "active";
  const helperText = active
    ? "Login liberado para uso normal da plataforma."
    : "Conta sem acesso ativo no momento; revise as ações completas na aba Conta.";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "conta")}
      actionLabel="Abrir dados da conta"
      eyebrow="Conta"
      helperText={helperText}
      icon={UserRound}
      title={active ? "Conta ativa" : "Conta inativa"}
    >
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Último acesso" value={formatLastAccess(detail.header.last_access_at)} />
      <FieldRow label="Cadastro via" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </SummaryCard>
  );
};

const getPatientGeneralMetrics = (detail: AdminPatientDetail) =>
  detail.metrics.filter((metric) => PATIENT_GENERAL_METRIC_IDS.has(metric.id));

const getPatientMetricValue = (detail: AdminPatientDetail, id: PatientsDetailMetric["id"]) =>
  detail.metrics.find((metric) => metric.id === id)?.value ?? 0;

const diagnosePatientGeneralEngagement = (total: number) => {
  if (total < 3) return "Sem base";
  if (total >= 12) return "Muito ativo";
  if (total >= 6) return "Ativo";

  return "Pouco ativo";
};

const getPatientLastActivityAt = (detail: AdminPatientDetail) =>
  detail.activities.items.reduce<string | null>((latest, activity) => {
    if (!latest) return activity.occurred_at;

    const latestDate = new Date(latest);
    const activityDate = new Date(activity.occurred_at);

    if (Number.isNaN(activityDate.getTime())) return latest;
    if (Number.isNaN(latestDate.getTime())) return activity.occurred_at;

    return activityDate > latestDate ? activity.occurred_at : latest;
  }, null);

const PatientEngagementSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const activeCommunities = detail.communities.items.length;
  const posts = getPatientMetricValue(detail, "posts_created");
  const replies = getPatientMetricValue(detail, "comments_created");
  const totalSignals = activeCommunities + posts + replies;
  const engagementDiagnosis = diagnosePatientGeneralEngagement(totalSignals);
  const lastActivityAt = getPatientLastActivityAt(detail);

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir estatísticas"
      eyebrow="Engajamento"
      helperText="Diagnóstico derivado de comunidades ativas, posts e respostas reais no período padrão."
      icon={BarChart3}
      title={engagementDiagnosis}
    >
      <FieldRow label="Comunidades ativas" value={numberFormatter.format(activeCommunities)} />
      <FieldRow label="Posts" value={numberFormatter.format(posts)} />
      <FieldRow label="Respostas" value={numberFormatter.format(replies)} />
      <FieldRow
        label="Última atividade"
        value={lastActivityAt ? formatDateTime(lastActivityAt) : "Não capturada"}
      />
    </SummaryCard>
  );
};

const PatientIntentSummaryCard = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const intent = detail.intent_analysis;
  const classification = patientIntentDisplayLabels[intent.level.id];

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir análise de intenção"
      eyebrow="Intenção"
      helperText={intent.summary}
      icon={Flame}
      title={classification}
    >
      <FieldRow label="Classificação" value={intent.level.label} />
      <FieldRow label="Score" value={formatPatientIntentScore(intent.score, intent.max_score)} />
      <FieldRow label="Sinais reais" value={numberFormatter.format(intent.total_signals)} />
      <FieldRow
        label="Último sinal"
        value={intent.last_signal_at ? formatDateTime(intent.last_signal_at) : "Não capturado"}
      />
    </SummaryCard>
  );
};

const ProfileEditButton = ({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) => (
  <button
    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted sm:w-auto"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Pencil aria-hidden className="h-4 w-4" />
    Editar
  </button>
);

const ProfileFormActions = ({
  disabled,
  onCancel,
}: {
  disabled?: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-muted"
      disabled={disabled}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      disabled={disabled}
      type="submit"
    >
      {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      Salvar alterações
    </button>
  </div>
);

const PatientPersonalDataRows = ({ detail }: { detail: AdminPatientDetail }) => (
  <>
    <FieldRow label="Nome de exibição" value={detail.header.name} />
    <FieldRow label="E-mail" value={detail.header.email} />
    <FieldRow label="Gênero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="Localização" value={formatPatientLocation(detail)} />
  </>
);

const PatientPersonalDataEditForm = ({
  detail,
  onCancel,
}: {
  detail: AdminPatientDetail;
  onCancel: () => void;
}) => {
  const mutation = useAdminPatientUpdatePersonalData(detail.header.id);
  const form = useForm<PatientPersonalDataFormValues>({
    defaultValues: {
      display_name: detail.header.name,
      gender: detail.header.gender || "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(patientPersonalDataSchema),
  });
  const disabled = mutation.isPending;
  const onSubmit: SubmitHandler<PatientPersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        display_name: values.display_name.trim(),
        gender: emptyToNull(values.gender),
        reason: values.reason.trim(),
      });
      toast.success("Dados pessoais do paciente atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border/80 bg-surface-muted p-4">
          <FieldRow
            label="E-mail"
            value={
              <span className="inline-flex items-center gap-2">
                {detail.header.email}
                <LockKeyhole
                  aria-label="E-mail editável somente por fluxo de conta"
                  className="h-4 w-4 text-muted"
                />
              </span>
            }
          />
          <FieldRow label="Localização" value={formatPatientLocation(detail)} />
        </div>
        <InputController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Nome de exibição"
          name="display_name"
          placeholder="Informe o nome exibido no perfil administrativo."
          required
        />
        <SelectController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Gênero"
          name="gender"
          options={mergeCurrentOption(PATIENT_GENDER_OPTIONS, detail.header.gender)}
        />
        <TextareaController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Motivo da alteração"
          name="reason"
          placeholder="Descreva o motivo operacional da alteração."
          required
          rows={3}
        />
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
          Nome de exibição e gênero são atualizados com auditoria administrativa. E-mail e
          localização permanecem somente leitura: o e-mail pertence ao fluxo de conta e a
          localização vem de dados coarse de visitor_location.
        </p>
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

const ProfileRegistrationTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-5">
      <InfoCard
        action={isEditing ? null : <ProfileEditButton onClick={() => setIsEditing(true)} />}
        contentAsDescriptionList={!isEditing}
        icon={UserRound}
        title="Dados pessoais"
      >
        {isEditing ? (
          <PatientPersonalDataEditForm detail={detail} onCancel={() => setIsEditing(false)} />
        ) : (
          <PatientPersonalDataRows detail={detail} />
        )}
      </InfoCard>
    </div>
  );
};

const GeneralTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => (
  <div className="space-y-5">
    <section>
      <h2 className="sr-only">Métricas principais do paciente</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {getPatientGeneralMetrics(detail).map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid items-stretch gap-5 xl:grid-cols-3">
      <AccountSituationCard detail={detail} id={id} />
      <PatientEngagementSummaryCard detail={detail} id={id} />
      <PatientIntentSummaryCard detail={detail} id={id} />
    </div>

    <ActivityList detail={detail} />
  </div>
);

type PatientStatisticsDetailSlice = {
  detail: AdminPatientDetail;
  errorMessage: string | null;
  isRefreshing: boolean;
  query: ReturnType<typeof useAdminPatientDetail>;
};

const usePatientStatisticsDetailSlice = (
  id: string,
  initialDetail: AdminPatientDetail,
  filter: ReturnType<typeof usePatientStatisticsPeriodFilter>,
): PatientStatisticsDetailSlice => {
  const usesInitialAllPeriod = filter.selectedPeriod === "all";
  const query = useAdminPatientDetail(id, filter.periodQuery, {
    enabled: !usesInitialAllPeriod,
    placeholderData: (previous) => previous ?? initialDetail,
  });
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return {
    detail: usesInitialAllPeriod ? initialDetail : (query.data ?? initialDetail),
    errorMessage,
    isRefreshing: !usesInitialAllPeriod && query.isFetching && Boolean(query.data),
    query,
  };
};

const StatisticsTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const intentFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const statisticsFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const activeCommunitiesFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const activityHoursFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const platformUsageFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const intentSlice = usePatientStatisticsDetailSlice(id, detail, intentFilter);
  const communitySlice = usePatientStatisticsDetailSlice(id, detail, statisticsFilter);
  const activeCommunitiesSlice = usePatientStatisticsDetailSlice(
    id,
    detail,
    activeCommunitiesFilter,
  );
  const activityHoursSlice = usePatientStatisticsDetailSlice(id, detail, activityHoursFilter);
  const platformUsageSlice = usePatientStatisticsDetailSlice(id, detail, platformUsageFilter);
  const visualExampleEnabled = shouldUsePatientStatisticsVisualExample(id, detail);
  const intentDetail = shouldUsePatientIntentVisualExample(id, intentSlice.detail)
    ? buildPatientIntentVisualExampleDetail(intentSlice.detail)
    : intentSlice.detail;
  const communityDetail = visualExampleEnabled
    ? buildPatientStatisticsVisualExampleDetail(communitySlice.detail)
    : communitySlice.detail;
  const activeCommunitiesDetail = visualExampleEnabled
    ? buildPatientStatisticsVisualExampleDetail(activeCommunitiesSlice.detail)
    : activeCommunitiesSlice.detail;
  const activityHoursDetail = visualExampleEnabled
    ? buildPatientStatisticsVisualExampleDetail(activityHoursSlice.detail)
    : activityHoursSlice.detail;
  const platformUsageDetail = visualExampleEnabled
    ? buildPatientStatisticsVisualExampleDetail(platformUsageSlice.detail)
    : platformUsageSlice.detail;

  if (communitySlice.query.isError && !communitySlice.query.data && communitySlice.errorMessage) {
    return (
      <ErrorState
        message={communitySlice.errorMessage}
        onRetry={() => void communitySlice.query.refetch()}
      />
    );
  }

  return (
    <div className="max-w-full space-y-5 overflow-x-clip" data-patient-detail-tab="estatisticas">
      <PatientIntentAnalysisCard
        detail={intentDetail}
        isRefreshing={intentSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-intent-statistics"
            onDateControlsBlur={intentFilter.handleDateControlsBlur}
            onDateChange={intentFilter.handleDateChange}
            onPeriodChange={intentFilter.handlePeriodChange}
            period={intentFilter.selectedPeriod}
            range={intentFilter.draftRange}
            rangeError={intentFilter.rangeError}
          />
        }
      />
      <EngagementChart
        detail={communityDetail}
        isRefreshing={communitySlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-community-statistics"
            onDateControlsBlur={statisticsFilter.handleDateControlsBlur}
            onDateChange={statisticsFilter.handleDateChange}
            onPeriodChange={statisticsFilter.handlePeriodChange}
            period={statisticsFilter.selectedPeriod}
            range={statisticsFilter.draftRange}
            rangeError={statisticsFilter.rangeError}
          />
        }
      />
      <PatientActiveCommunitiesBlock
        communities={activeCommunitiesDetail.communities.items}
        isRefreshing={activeCommunitiesSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-active-communities-statistics"
            onDateControlsBlur={activeCommunitiesFilter.handleDateControlsBlur}
            onDateChange={activeCommunitiesFilter.handleDateChange}
            onPeriodChange={activeCommunitiesFilter.handlePeriodChange}
            period={activeCommunitiesFilter.selectedPeriod}
            range={activeCommunitiesFilter.draftRange}
            rangeError={activeCommunitiesFilter.rangeError}
          />
        }
      />
      <PatientPlatformActivityHoursCard
        detail={activityHoursDetail}
        isRefreshing={activityHoursSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-activity-hours-statistics"
            onDateControlsBlur={activityHoursFilter.handleDateControlsBlur}
            onDateChange={activityHoursFilter.handleDateChange}
            onPeriodChange={activityHoursFilter.handlePeriodChange}
            period={activityHoursFilter.selectedPeriod}
            range={activityHoursFilter.draftRange}
            rangeError={activityHoursFilter.rangeError}
          />
        }
      />
      <PatientPlatformUsageCard
        detail={platformUsageDetail}
        isRefreshing={platformUsageSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-platform-usage-statistics"
            onDateControlsBlur={platformUsageFilter.handleDateControlsBlur}
            onDateChange={platformUsageFilter.handleDateChange}
            onPeriodChange={platformUsageFilter.handlePeriodChange}
            period={platformUsageFilter.selectedPeriod}
            range={platformUsageFilter.draftRange}
            rangeError={platformUsageFilter.rangeError}
          />
        }
      />
    </div>
  );
};

const PatientPublicationMetricChip = ({ metric }: { metric: PatientsDetailPublicationMetric }) => {
  const Icon = patientPublicationMetricIcon[metric.id];
  const label = patientPublicationMetricLabel[metric.id] ?? metric.label.toLowerCase();
  const value = metric.available ? numberFormatter.format(metric.value) : "indisponível";

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-muted"
      title={metric.source}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {value} {label}
    </span>
  );
};

const PatientPublicationMetricsRow = ({ item }: { item: PatientsDetailPublication }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {patientPublicationMetricOrder.map((metricId) => (
      <PatientPublicationMetricChip key={metricId} metric={item.metrics[metricId]} />
    ))}
  </div>
);

const PatientPublicationFullContent = ({ item }: { item: PatientsDetailPublication }) => {
  const content = item.content.trim();

  return (
    <div className="rounded-2xl border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
          Conteúdo completo do post
        </p>
        <span className="text-xs font-bold text-subtle">{formatDateTime(item.created_at)}</span>
      </div>
      <h3 className="mt-3 text-base font-black text-foreground">
        {item.title.trim() || "Post sem título"}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
        {content || "Sem conteúdo textual."}
      </p>
    </div>
  );
};

const PublicationsTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [expandedPublicationId, setExpandedPublicationId] = useState<string | null>(null);
  const publications = detail.publications.items;

  return (
    <CardShell
      className="min-w-0 max-w-full overflow-hidden"
      data-patient-detail-section="publications-list"
    >
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={FileText} />
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Publicações</h2>
            <p className="mt-1 text-sm text-muted">{detail.publications.coverage_note}</p>
          </div>
        </div>
        <Badge className="bg-surface-muted text-muted">{detail.publications.source}</Badge>
      </div>

      {publications.length === 0 ? (
        <p className="p-5 text-sm font-bold text-muted">
          Nenhuma publicação real foi encontrada para este paciente no período consultado.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {publications.map((item) => {
            const isExpanded = expandedPublicationId === item.id;

            return (
              <article
                className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start"
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-black">{item.type_label}</span>
                    <span aria-hidden className="font-bold">
                      ·
                    </span>
                    <span className="font-black">{item.community.name}</span>
                    <span aria-hidden className="font-bold">
                      ·
                    </span>
                    <span className="font-bold">{formatDateTime(item.created_at)}</span>
                    <span className="font-bold text-subtle">/{item.community.slug}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-black text-foreground sm:text-base">
                    {item.title.trim() || "Post sem título"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                    {item.excerpt.trim() || "Sem descrição textual."}
                  </p>
                  {isExpanded ? (
                    <div className="mt-4">
                      <PatientPublicationFullContent item={item} />
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 lg:flex-col">
                  <button
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? "Ocultar conteúdo completo do post"
                        : "Expandir conteúdo completo do post"
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
                    onClick={() =>
                      setExpandedPublicationId((current) => (current === item.id ? null : item.id))
                    }
                    title={isExpanded ? "Ocultar conteúdo" : "Ver conteúdo completo"}
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronUp aria-hidden className="h-4 w-4" />
                    ) : (
                      <ChevronDown aria-hidden className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    aria-label="Ver estatísticas da publicação no Admin"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-primary/30 text-primary transition hover:bg-primary-soft"
                    href={item.admin_statistics_url}
                    title="Estatísticas"
                  >
                    <BarChart3 aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Estatísticas</span>
                  </Link>
                  <Link
                    aria-label="Ver publicação no site"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
                    href={toPublicHref(item.public_url)}
                    rel="noreferrer"
                    target="_blank"
                    title="Ver no site"
                  >
                    <Eye aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Ver no site</span>
                  </Link>
                </div>
                <div className="border-t border-border pt-3 lg:col-span-2">
                  <PatientPublicationMetricsRow item={item} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CardShell>
  );
};

const reportCardIcon: Record<"dismissed" | "pending" | "total" | "upheld", LucideIcon> = {
  dismissed: CheckCircle2,
  pending: AlertTriangle,
  total: AlertTriangle,
  upheld: ShieldCheck,
};

type ReportPeriodValue = "all" | "30d" | "90d" | "180d" | "custom";
type ReportPeriodPreset = Exclude<ReportPeriodValue, "custom">;
type ReportDateRange = {
  from?: string;
  to?: string;
};

const REPORT_PERIOD_OPTIONS: { id: ReportPeriodPreset; label: string }[] = [
  { id: "all", label: "Todo o período" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
];

const getReportRangeForPeriod = (preset: ReportPeriodPreset): ReportDateRange => {
  if (preset === "all") return { from: "", to: "" };

  const days = preset === "30d" ? 30 : preset === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: formatInputDate(from.toISOString()),
    to: formatInputDate(to.toISOString()),
  };
};

const reportDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const isValidReportRange = (range: ReportDateRange) => {
  if (!range.from || !range.to) return false;

  return reportDateFromInput(range.from) <= reportDateFromInput(range.to);
};

const ReportStatusBadge = ({ group, label }: { group: string; label: string }) => {
  const className =
    group === "upheld"
      ? "bg-red-50 text-danger"
      : group === "dismissed"
        ? "bg-emerald-50 text-success"
        : group === "pending"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-orange-50 text-orange-700";

  return <Badge className={className}>{label}</Badge>;
};

const patientReportTitle = (report: AdminPatientReportItem) => {
  if (report.content.type === "post") return report.content.title?.trim() || "Post sem título";

  const title = report.content.title?.trim();
  const normalizedTitle = title?.toLowerCase();

  return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle) ? title : null;
};

const patientReportContentTypeLabel = (report: AdminPatientReportItem) => {
  if (report.content.type === "post") return "Post";

  const title = report.content.title?.trim().toLowerCase();
  return title && !["comentário", "comentario"].includes(title) ? "Resposta" : "Comentário";
};

const PatientReportContentHeader = ({ report }: { report: AdminPatientReportItem }) => {
  const TypeIcon = report.content.type === "post" ? FileText : MessageCircle;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <TypeIcon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="font-black">{patientReportContentTypeLabel(report)}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-black">{report.content.community.name}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-bold">{formatDateTime(report.content.created_at)}</span>
    </div>
  );
};

const PatientReportMedia = ({ report }: { report: AdminPatientReportItem }) => {
  if (!report.content.media) return null;

  const src = report.content.media.media_url;
  const mediaType = report.content.media.media_type.toLowerCase();
  const isVideo = mediaType.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(src);
  const looksLikeImage = mediaType.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(src);
  const imageSrc = !isVideo ? renderableImageSrc(src) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(src) : null;
  const mediaLabel = isVideo ? "Miniplayer de vídeo denunciado" : "Miniatura de mídia denunciada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40" : "h-32 max-w-72",
      )}
    >
      {imageSrc && looksLikeImage ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="288px"
          src={imageSrc}
          unoptimized={isPublicAdminMediaSrc(imageSrc)}
        />
      ) : null}
      {videoSrc ? (
        <video
          aria-label={mediaLabel}
          className="h-full w-full bg-black object-cover"
          controls
          muted
          playsInline
          preload="metadata"
          src={videoSrc}
        />
      ) : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          <FileText aria-hidden className="mx-auto h-5 w-5" />
          <span>Mídia denunciada</span>
        </div>
      ) : null}
    </div>
  );
};

const PatientReportReporterHistory = ({ report }: { report: AdminPatientReportItem }) => (
  <section className="mt-5 border-t border-border/70 pt-4">
    <h4 className="text-sm font-black text-foreground">Histórico de denúncias</h4>
    <div className="mt-3 divide-y divide-border/70">
      <article
        className="py-2 text-sm"
        title={`${report.reported_by.name} · ${formatDateTime(report.created_at)} · Motivo: ${
          report.reason_label
        }${report.description ? ` · ${report.description}` : ""}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge className="bg-surface-muted text-muted">{report.reported_by.label}</Badge>
          <span className="shrink-0 font-normal text-foreground">{report.reported_by.name}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            {formatDateTime(report.created_at)}
          </span>
          <span aria-hidden className="shrink-0 text-muted/70">
            ·
          </span>
          <span className="min-w-0 truncate font-bold text-foreground">
            Motivo: {report.reason_label}
          </span>
        </div>
        {report.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{report.description}</p>
        ) : null}
      </article>
    </div>
  </section>
);

const PatientReportListItem = ({ report }: { report: AdminPatientReportItem }) => {
  const title = patientReportTitle(report);

  return (
    <article className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge group={report.status_group} label={report.status_label} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5" />1 denúncia
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            Última em {formatDateTime(report.created_at)}
          </span>
        </div>
        {report.content.available && report.content.public_url ? (
          <Link
            aria-label="Ver conteúdo público"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/75 transition hover:text-foreground"
            href={toPublicHref(report.content.public_url)}
            rel="noreferrer"
            target="_blank"
            title="Ver conteúdo público"
          >
            <Eye aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <section className="mt-4">
        <p className="text-[0.68rem] font-black uppercase tracking-wide text-muted">
          Conteúdo denunciado
        </p>
        <PatientReportContentHeader report={report} />
        {title ? <h3 className="mt-3 text-lg font-black text-foreground">{title}</h3> : null}
        <div className="mt-3 space-y-4">
          <div className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-muted">
            {report.content.body || report.content.excerpt || "Conteúdo sem texto disponível."}
          </div>
          {report.content.media ? (
            <div className="max-w-72">
              <PatientReportMedia report={report} />
            </div>
          ) : null}
        </div>
        {!report.content.available ? (
          <p className="mt-3 rounded-2xl border border-danger/15 bg-danger/10 p-3 text-xs font-bold leading-5 text-danger">
            {report.content.unavailable_reason || "Conteúdo removido ou indisponível."}
          </p>
        ) : null}
      </section>
      <PatientReportReporterHistory report={report} />
    </article>
  );
};

const ReportsLoadingState = () => (
  <div className="space-y-5" data-patient-reports-loading="true">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["total", "pending", "dismissed", "upheld"].map((card) => (
        <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={card} />
      ))}
    </div>
    <CardShell className="h-[8.25rem] animate-pulse bg-surface-muted" />
    <div className="space-y-4">
      {["first", "second"].map((item) => (
        <CardShell className="h-60 animate-pulse bg-surface-muted" key={item} />
      ))}
    </div>
  </div>
);

const ReportsTab = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("all");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<AdminPatientReportsQuery["type"]>("all");
  const [status, setStatus] = useState<AdminPatientReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPatientReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 5,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const query = useAdminPatientReports(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;
  const handleReportPeriodChange = (value: ReportPeriodPreset) => {
    const nextRange = getReportRangeForPeriod(value);

    setRangeError(null);
    setSelectedPeriod(value);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setPage(1);
  };
  const handleReportDateChange = (field: keyof ReportDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const commitReportRange = () => {
    if (!isValidReportRange(draftRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedRange(draftRange);
    setPage(1);
  };
  const handleReportDateControlsBlur = (event: {
    currentTarget: HTMLDivElement;
    relatedTarget: EventTarget | null;
  }) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitReportRange();
    }, 0);
  };

  if (query.isLoading) return <ReportsLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reports = query.data;

  return (
    <div className="space-y-5" data-patient-detail-tab="denuncias">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.cards.map((card) => {
          const Icon = reportCardIcon[card.id];

          return (
            <CardShell className="p-5" key={card.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-foreground">{card.label}</p>
                  <p className="mt-5 text-4xl font-black text-foreground">
                    {numberFormatter.format(card.value)}
                  </p>
                </div>
                <IconCircle icon={Icon} />
              </div>
            </CardShell>
          );
        })}
      </div>

      <CardShell className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr] lg:items-end">
          <DetailFilterSelect
            label="Tipo"
            onChange={(nextValue) => {
              setType(nextValue as AdminPatientReportsQuery["type"]);
              setPage(1);
            }}
            value={type ?? "all"}
          >
            {reports.filters.types.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            label="Status"
            onChange={(nextValue) => {
              setStatus(nextValue as AdminPatientReportsQuery["status"]);
              setPage(1);
            }}
            value={status ?? "all"}
          >
            {reports.filters.statuses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            label="Período"
            onChange={(nextValue) => {
              handleReportPeriodChange(nextValue as ReportPeriodPreset);
            }}
            value={selectedPeriod}
          >
            {selectedPeriod === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {REPORT_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </DetailFilterSelect>
          <div className="grid gap-3 sm:grid-cols-2" onBlur={handleReportDateControlsBlur}>
            <label className="block text-sm font-black text-muted">
              De
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={draftRange.to || undefined}
                onChange={(event) => handleReportDateChange("from", event.target.value)}
                type="date"
                value={draftRange.from ?? ""}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={draftRange.from || undefined}
                onChange={(event) => handleReportDateChange("to", event.target.value)}
                type="date"
                value={draftRange.to ?? ""}
              />
            </label>
          </div>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </CardShell>

      <section className="space-y-4" aria-label="Denúncias recebidas">
        {reports.data.length === 0 ? (
          <CardShell className="p-5">
            <p className="text-sm font-bold text-muted">
              Nenhuma denúncia real encontrada para os filtros atuais.
            </p>
          </CardShell>
        ) : (
          reports.data.map((item) => <PatientReportListItem key={item.id} report={item} />)
        )}

        <CardShell className="p-4">
          <ActivitiesPagination page={reports.page} pages={reports.pages} setPage={setPage} />
        </CardShell>
      </section>
    </div>
  );
};

const booleanBadge = (value: boolean, labels: { false: string; true: string }) => (
  <Badge className={value ? "bg-emerald-50 text-success" : "bg-orange-50 text-orange-700"}>
    {value ? labels.true : labels.false}
  </Badge>
);

const formatCountWithUnit = (count: number, singular: string, plural: string) =>
  `${numberFormatter.format(count)} ${count === 1 ? singular : plural}`;

const formatSessionDeviceSummary = (sessions: AdminPatientAccount["sessions"]) =>
  `${formatCountWithUnit(sessions.active_count, "sessão", "sessões")} em ${formatCountWithUnit(
    sessions.devices_count,
    "dispositivo",
    "dispositivos",
  )}`;

const AccountUnavailableNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
    {children}
  </div>
);

const ACCOUNT_STATUS_BADGE_CLASS: Record<AdminPatientAccount["account_status"], string> = {
  active: "bg-primary-soft text-primary",
  deactivated: "bg-surface-muted text-muted",
  deleted: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
};

const AccountLoadingState = () => (
  <div className="space-y-5" data-patient-account-loading="true">
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
    </div>
  </div>
);

const AccountSummaryCard = ({ account }: { account: AdminPatientAccount }) => (
  <InfoCard icon={ShieldCheck} title="Resumo da conta">
    <FieldRow label="E-mail atual" value={account.email} />
    <FieldRow
      label="Status do e-mail"
      value={booleanBadge(account.confirmed, {
        false: "Pendente",
        true: "Confirmado",
      })}
    />
    <FieldRow label="Confirmado em" value={formatDateTime(account.confirmed_at)} />
    <FieldRow label="Método de login" value={account.provider_label} />
    <FieldRow
      label="Senha local"
      value={booleanBadge(account.has_password, {
        false: "Não possui senha local",
        true: "Possui senha local",
      })}
    />
    <FieldRow
      label="Status da conta"
      value={
        <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
          {account.account_status_label}
        </Badge>
      }
    />
    <FieldRow
      label="Status alterado em"
      value={formatDateTime(account.account_status_changed_at)}
    />
    {account.account_status === "suspended" ? (
      <FieldRow label="Suspensa até" value={formatDateTime(account.account_status_expires_at)} />
    ) : null}
    <FieldRow
      label="Troca obrigatória"
      value={booleanBadge(account.need_reset, {
        false: "Sem pendência",
        true: "Pendente",
      })}
    />
    <FieldRow label="Conta criada em" value={formatDateTime(account.created_at)} />
    <FieldRow label="Último acesso" value={formatLastAccess(account.last_access_at)} />
    <FieldRow label="Sessões ativas" value={formatSessionDeviceSummary(account.sessions)} />
  </InfoCard>
);

const AccountChangeEmailForm = ({ account, id }: { account: AdminPatientAccount; id: string }) => {
  const mutation = useAdminPatientChangeAccountEmail(id);
  const form = useForm<AccountChangeEmailFormValues>({
    defaultValues: {
      confirmation: "",
      email: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountChangeEmailSchema),
  });
  const disabled = !account.capabilities.can_change_email || mutation.isPending;

  const onSubmit: SubmitHandler<AccountChangeEmailFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        email: values.email.trim().toLowerCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("E-mail alterado. Confirmação enviada para o novo endereço.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Novo e-mail"
          name="email"
          placeholder="novo@email.com"
          required
          type="email"
        />
        <TextareaController<AccountChangeEmailFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique a solicitação recebida pelo suporte."
          required
          rows={3}
        />
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder={STRONG_CONFIRMATIONS.changeEmail}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Mail aria-hidden className="h-4 w-4" />
          )}
          Alterar e-mail
        </button>
      </form>
    </FormProvider>
  );
};

const AccountSendEmailConfirmationForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendEmailConfirmation(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_email_confirmation || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Confirmação de e-mail reenviada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_email_confirmation) {
    return (
      <AccountUnavailableNotice>
        Reenvio disponível apenas quando o e-mail está pendente de confirmação.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Informe o motivo do reenvio."
          required
          rows={3}
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Send aria-hidden className="h-4 w-4" />
          )}
          Reenviar confirmação
        </button>
      </form>
    </FormProvider>
  );
};

const AccountPasswordResetForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendPasswordReset(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_password_reset || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Link de redefinição enviado.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_password_reset) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Redefinição de senha local indisponível.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que o link será enviado pelo Admin."
          required
          rows={3}
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Send aria-hidden className="h-4 w-4" />
          )}
          Enviar link de redefinição
        </button>
      </form>
    </FormProvider>
  );
};

const AccountTemporaryPasswordForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSetTemporaryPassword(id);
  const form = useForm<AccountTemporaryPasswordFormValues>({
    defaultValues: {
      confirmation: "",
      password: "",
      password_confirm: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountTemporaryPasswordSchema),
  });
  const disabled = !account.capabilities.can_set_temporary_password || mutation.isPending;

  const onSubmit: SubmitHandler<AccountTemporaryPasswordFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        password: values.password,
        password_confirm: values.password_confirm,
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Senha temporária definida. O paciente deverá trocá-la no próximo login.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_set_temporary_password) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Alteração de senha local indisponível.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-800">
          A senha temporária não será exibida novamente, não será gravada em auditoria e exigirá
          troca obrigatória no próximo login do paciente.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Senha temporária"
            name="password"
            required
            type="password"
          />
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Confirmar senha temporária"
            name="password_confirm"
            required
            type="password"
          />
        </div>
        <TextareaController<AccountTemporaryPasswordFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Registre o motivo excepcional para senha temporária."
          required
          rows={3}
        />
        <InputController<AccountTemporaryPasswordFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder={STRONG_CONFIRMATIONS.temporaryPassword}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound aria-hidden className="h-4 w-4" />
          )}
          Definir senha temporária
        </button>
      </form>
    </FormProvider>
  );
};

const AccountRevokeSessionsForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientRevokeSessions(id);
  const form = useForm<AccountRevokeSessionsFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountRevokeSessionsSchema),
  });
  const disabled = !account.capabilities.can_revoke_sessions || mutation.isPending;

  const onSubmit: SubmitHandler<AccountRevokeSessionsFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Sessões do paciente encerradas.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {!account.capabilities.can_revoke_sessions ? (
          <AccountUnavailableNotice>
            Nenhuma sessão ativa real foi encontrada em user_token.
          </AccountUnavailableNotice>
        ) : null}
        <TextareaController<AccountRevokeSessionsFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que as sessões serão encerradas."
          required
          rows={3}
        />
        <InputController<AccountRevokeSessionsFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder={STRONG_CONFIRMATIONS.revokeSessions}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut aria-hidden className="h-4 w-4" />
          )}
          Encerrar sessões
        </button>
      </form>
    </FormProvider>
  );
};

type AccountStatusActionKind = "deactivate" | "delete" | "suspend";

const ACCOUNT_STATUS_ACTION_CONFIG: Record<
  AccountStatusActionKind,
  {
    blockedMessage: string;
    buttonClassName: string;
    buttonLabel: string;
    canRun: (account: AdminPatientAccount) => boolean;
    confirmation: string;
    description: string;
    icon: LucideIcon;
    schema: typeof accountSuspendSchema;
    successMessage: string;
    title: string;
  }
> = {
  deactivate: {
    blockedMessage: "A conta já está desativada ou não pode receber esta ação.",
    buttonClassName:
      "border border-border bg-surface px-4 text-foreground hover:border-primary hover:text-primary",
    buttonLabel: "Desativar conta",
    canRun: (account) => account.capabilities.can_deactivate_account,
    confirmation: "DESATIVAR CONTA",
    description:
      "Ação administrativa reversível por decisão futura: bloqueia login e encerra sessões do paciente.",
    icon: X,
    schema: accountDeactivateSchema,
    successMessage: "Conta desativada e sessões encerradas.",
    title: "Desativar conta",
  },
  delete: {
    blockedMessage: "Exclusão indisponível para esta conta no estado atual.",
    buttonClassName: "bg-danger px-4 text-white hover:bg-danger/90",
    buttonLabel: "Excluir conta",
    canRun: (account) => account.capabilities.can_delete_account,
    confirmation: "EXCLUIR CONTA",
    description:
      "Ação permanente: aplica soft delete, anonimiza dados da conta, remove o perfil do paciente e encerra sessões.",
    icon: AlertTriangle,
    schema: accountDeleteSchema,
    successMessage: "Conta excluída. Retornando para a lista de pacientes.",
    title: "Excluir conta",
  },
  suspend: {
    blockedMessage: "A conta já está suspensa ou não pode receber esta ação.",
    buttonClassName: "bg-danger px-4 text-white hover:bg-danger/90",
    buttonLabel: "Suspender conta",
    canRun: (account) => account.capabilities.can_suspend_account,
    confirmation: "SUSPENDER CONTA",
    description:
      "Ação punitiva/operacional temporária: bloqueia login e encerra sessões sem apagar dados.",
    icon: Lock,
    schema: accountSuspendSchema,
    successMessage: "Conta suspensa e sessões encerradas.",
    title: "Suspender conta",
  },
};

const AccountStatusActionForm = ({
  account,
  id,
  kind,
  onDeleted,
}: {
  account: AdminPatientAccount;
  id: string;
  kind: AccountStatusActionKind;
  onDeleted?: () => void;
}) => {
  const config = ACCOUNT_STATUS_ACTION_CONFIG[kind];
  const suspendMutation = useAdminPatientSuspendAccount(id);
  const deactivateMutation = useAdminPatientDeactivateAccount(id);
  const deleteMutation = useAdminPatientDeleteAccount(id);
  const mutation =
    kind === "suspend"
      ? suspendMutation
      : kind === "deactivate"
        ? deactivateMutation
        : deleteMutation;
  const form = useForm<AccountStatusActionFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
      suspension_duration_days: "30",
    },
    mode: "onSubmit",
    resolver: zodResolver(config.schema),
  });
  const allowed = config.canRun(account);
  const disabled = !allowed || mutation.isPending;
  const Icon = config.icon;

  const onSubmit: SubmitHandler<AccountStatusActionFormValues> = async (values) => {
    try {
      const payload = {
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      };

      if (kind === "suspend") {
        await suspendMutation.mutateAsync({
          ...payload,
          suspension_duration_days: Number(values.suspension_duration_days),
        });
      } else if (kind === "deactivate") {
        await deactivateMutation.mutateAsync(payload);
      } else {
        await deleteMutation.mutateAsync(payload);
      }

      form.reset();
      toast.success(config.successMessage);
      if (kind === "delete") onDeleted?.();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h3 className="text-base font-black text-foreground">{config.title}</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{config.description}</p>
        </div>
      </div>

      {!allowed ? (
        <div className="mt-4">
          <AccountUnavailableNotice>
            {kind === "delete" && account.delete_blocked_reason
              ? account.delete_blocked_reason
              : config.blockedMessage}
          </AccountUnavailableNotice>
        </div>
      ) : null}

      <FormProvider {...form}>
        <form className="mt-4 grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {kind === "suspend" ? (
            <SelectController<AccountStatusActionFormValues>
              disabled={disabled}
              label="Prazo da suspensão"
              name="suspension_duration_days"
              options={SUSPENSION_DURATION_OPTIONS}
              required
            />
          ) : null}
          <TextareaController<AccountStatusActionFormValues>
            disabled={disabled}
            label="Motivo/observação interna"
            name="reason"
            placeholder="Registre a justificativa administrativa da ação."
            required
            rows={3}
          />
          <InputController<AccountStatusActionFormValues>
            autoComplete="off"
            disabled={disabled}
            label="Confirmação forte"
            name="confirmation"
            placeholder={config.confirmation}
            required
          />
          <button
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-control text-sm font-black transition disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted",
              config.buttonClassName,
            )}
            disabled={disabled}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden className="h-4 w-4" />
            )}
            {config.buttonLabel}
          </button>
        </form>
      </FormProvider>
    </div>
  );
};

const AccountTab = ({ id }: { id: string }) => {
  const router = useRouter();
  const query = useAdminPatientAccount(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <AccountLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const account = query.data;
  const googleOnly = account.provider === "google" && !account.has_password;

  return (
    <div className="space-y-5" data-patient-detail-tab="conta">
      {googleOnly ? (
        <CardShell className="p-4">
          <div className="flex gap-3">
            <IconCircle icon={Lock} />
            <div>
              <h2 className="text-lg font-black text-foreground">Conta Google sem senha local</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                Esta conta acessa via Google. Alteração ou criação de senha local estão
                indisponíveis.
              </p>
            </div>
          </div>
        </CardShell>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AccountSummaryCard account={account} />

        <InfoCard contentAsDescriptionList={false} icon={Mail} title="E-mail da conta">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
              Alterar e-mail exige nova confirmação, envia e-mail transacional real quando
              configurado e encerra sessões do paciente.
            </div>
            {!account.capabilities.can_change_email ? (
              <AccountUnavailableNotice>
                Alteração administrativa de e-mail bloqueada para identidade sem senha local.
              </AccountUnavailableNotice>
            ) : null}
            <AccountChangeEmailForm account={account} id={id} />
            <AccountSendEmailConfirmationForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard contentAsDescriptionList={false} icon={KeyRound} title="Senha e recuperação">
          <div className="grid gap-5">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">
                Ação preferencial: link de redefinição
              </h3>
              <AccountPasswordResetForm account={account} id={id} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">
                Suporte excepcional: senha temporária
              </h3>
              <AccountTemporaryPasswordForm account={account} id={id} />
            </div>
          </div>
        </InfoCard>

        <InfoCard contentAsDescriptionList={false} icon={ShieldCheck} title="Sessões e segurança">
          <div className="grid gap-4">
            <dl>
              <FieldRow
                label="Sessões ativas"
                value={numberFormatter.format(account.sessions.active_count)}
              />
              <FieldRow
                label="Dispositivos"
                value={numberFormatter.format(account.sessions.devices_count)}
              />
              <FieldRow
                label="Última sessão"
                value={formatDateTime(account.sessions.last_access_at)}
              />
            </dl>
            <AccountRevokeSessionsForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <InfoCard contentAsDescriptionList={false} icon={AlertTriangle} title="Ações da conta">
        <div className="grid gap-5">
          <dl>
            <FieldRow
              label="Status atual"
              value={
                <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
                  {account.account_status_label}
                </Badge>
              }
            />
            <FieldRow
              label="Última alteração de status"
              value={formatDateTime(account.account_status_changed_at)}
            />
            {account.account_status === "suspended" ? (
              <FieldRow
                label="Suspensa até"
                value={formatDateTime(account.account_status_expires_at)}
              />
            ) : null}
            <FieldRow
              label="Bloqueio para exclusão"
              value={account.delete_blocked_reason || "Nenhum bloqueio operacional identificado"}
            />
          </dl>
          <div className="grid gap-4 lg:grid-cols-3">
            <AccountStatusActionForm account={account} id={id} kind="suspend" />
            <AccountStatusActionForm account={account} id={id} kind="deactivate" />
            <AccountStatusActionForm
              account={account}
              id={id}
              kind="delete"
              onDeleted={() => router.push("/pacientes/lista")}
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

const DetailContent = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => (
  <div className="space-y-6">
    <Header detail={detail} id={id} tab={tab} />
    {tab === "perfil" ? (
      <ProfileRegistrationTab detail={detail} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} id={id} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab detail={detail} />
    ) : tab === "denuncias" ? (
      <ReportsTab id={id} />
    ) : tab === "atividades" ? (
      <ActivitiesTab id={id} />
    ) : tab === "conta" ? (
      <AccountTab id={id} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </div>
);
export const AdminPatientDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: PatientDetailTab = isPatientDetailTab(requestedTab) ? requestedTab : "geral";
  const query = useAdminPatientDetail(id, { period: "all" });
  const queryError = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={placeholder} />
          ))}
        </div>
      ) : null}
      {query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}
      {query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <DetailContent detail={query.data} id={id} tab={tab} /> : null}
    </div>
  );
};
