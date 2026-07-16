"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Gift,
  Globe2,
  Heart,
  Info,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  type LucideIcon,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  UserRound,
  Video,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FocusEvent,
  type ReactNode,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FormProvider, type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAdminCommunityRemoveContent } from "@/api/callers/communities";
import {
  useAdminPsychologistAccount,
  useAdminPsychologistActivities,
  useAdminPsychologistApproveRegistryVerification,
  useAdminPsychologistBilling,
  useAdminPsychologistChangeAccountEmail,
  useAdminPsychologistDeactivateAccount,
  useAdminPsychologistDeleteAccount,
  useAdminPsychologistDetail,
  useAdminPsychologistGrantCourtesy,
  useAdminPsychologistPublications,
  useAdminPsychologistRegistryVerification,
  useAdminPsychologistRejectRegistryVerification,
  useAdminPsychologistReports,
  useAdminPsychologistResolveReport,
  useAdminPsychologistReviews,
  useAdminPsychologistRevokeCourtesy,
  useAdminPsychologistRevokeSessions,
  useAdminPsychologistSendEmailConfirmation,
  useAdminPsychologistSendPasswordReset,
  useAdminPsychologistSetTemporaryPassword,
  useAdminPsychologistStatistics,
  useAdminPsychologistSuspendAccount,
  useAdminPsychologistUpdatePersonalData,
  useAdminPsychologistUpdateProfessionalData,
  useAdminPsychologistUpdateRegistryIdentity,
} from "@/api/callers/psychologists";
import { useAdminSettingsCatalogs } from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistAccount,
  AdminPsychologistActivitiesQuery,
  AdminPsychologistBilling,
  AdminPsychologistCatalogItem,
  AdminPsychologistDetail,
  AdminPsychologistDetailMetric,
  AdminPsychologistEngagementMetric,
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationMetric,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistRegistryVerification,
  AdminPsychologistRegistryVerificationAttempt,
  AdminPsychologistReportItem,
  AdminPsychologistReportsQuery,
  AdminPsychologistReviewItem,
  AdminPsychologistReviewsQuery,
  AdminPsychologistStatistics,
  AdminPsychologistStatisticsQuery,
} from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});
const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;

const TABS = [
  { id: "geral", label: "Geral", ready: true },
  { id: "perfil", label: "Perfil e cadastro", ready: true },
  { id: "plano", label: "Assinatura", ready: true },
  { id: "estatisticas", label: "Estatísticas", ready: true },
  { id: "publicacoes", label: "Publicações", ready: true },
  { id: "avaliacoes", label: "Avaliações", ready: true },
  { id: "denuncias", label: "Denúncias", ready: true },
  { id: "atividades", label: "Atividades", ready: true },
  { id: "conta", label: "Conta", ready: true },
] as const satisfies readonly {
  id: string;
  label: string;
  ready: boolean;
  task?: string;
}[];

type ActiveTab = (typeof TABS)[number]["id"];

const CRP_REGION_OPTIONS = [
  { label: "1ª Região - DF", value: "1ª Região - DF" },
  { label: "2ª Região - PE", value: "2ª Região - PE" },
  { label: "3ª Região - BA", value: "3ª Região - BA" },
  { label: "4ª Região - MG", value: "4ª Região - MG" },
  { label: "5ª Região - RJ", value: "5ª Região - RJ" },
  { label: "6ª Região - SP", value: "6ª Região - SP" },
  { label: "7ª Região - RS", value: "7ª Região - RS" },
  { label: "8ª Região - PR", value: "8ª Região - PR" },
  { label: "9ª Região - GO", value: "9ª Região - GO" },
  { label: "10ª Região - PA/AP", value: "10ª Região - PA/AP" },
  { label: "11ª Região - CE", value: "11ª Região - CE" },
  { label: "12ª Região - SC", value: "12ª Região - SC" },
  { label: "13ª Região - PB", value: "13ª Região - PB" },
  { label: "14ª Região - MS", value: "14ª Região - MS" },
  { label: "15ª Região - AL", value: "15ª Região - AL" },
  { label: "16ª Região - ES", value: "16ª Região - ES" },
  { label: "17ª Região - RN", value: "17ª Região - RN" },
  { label: "18ª Região - MT", value: "18ª Região - MT" },
  { label: "19ª Região - SE", value: "19ª Região - SE" },
  { label: "20ª Região - AM/RR", value: "20ª Região - AM/RR" },
  { label: "21ª Região - PI", value: "21ª Região - PI" },
  { label: "22ª Região - MA", value: "22ª Região - MA" },
  { label: "23ª Região - TO", value: "23ª Região - TO" },
  { label: "24ª Região - AC/RO", value: "24ª Região - AC/RO" },
] as const;

const CRP_REGION_PLACEHOLDER = { label: "Selecione a regional", value: "" };

const createCrpRegionSelectOptions = (currentValue?: string | null) => {
  const currentRegional = String(currentValue ?? "").trim();
  const baseOptions = [CRP_REGION_PLACEHOLDER, ...CRP_REGION_OPTIONS];

  if (!currentRegional || CRP_REGION_OPTIONS.some((option) => option.value === currentRegional)) {
    return baseOptions;
  }

  return [
    CRP_REGION_PLACEHOLDER,
    { label: `${currentRegional} (valor atual)`, value: currentRegional },
    ...CRP_REGION_OPTIONS,
  ];
};

const EMPTY_SELECT_OPTION = { label: "Não informado", value: "" };

// Mantém as opções administrativas alinhadas com
// frontend/src/app/app/professional/profile/setup/options.ts.
// O Admin adiciona apenas a opção vazia para permitir limpar campos opcionais.
const GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não informar", value: "nao_informar" },
] as const;

const RACE_COLOR_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Branca", value: "branca" },
  { label: "Preta", value: "preta" },
  { label: "Parda", value: "parda" },
  { label: "Amarela", value: "amarela" },
  { label: "Indígena", value: "indigena" },
  { label: "Prefiro não informar", value: "nao_informar" },
] as const;

const RELIGION_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Católica", value: "catolica" },
  { label: "Evangélica", value: "evangelica" },
  { label: "Espírita", value: "espirita" },
  { label: "Umbanda/Candomblé", value: "umbanda_candomble" },
  { label: "Judaica", value: "judaica" },
  { label: "Islâmica", value: "islamica" },
  { label: "Budista", value: "budista" },
  { label: "Sem religião", value: "sem_religiao" },
  { label: "Ateu/Agnóstico", value: "ateu_agnostico" },
  { label: "Outra", value: "outra" },
  { label: "Prefiro não informar", value: "nao_informar" },
] as const;

const STATE_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Acre", value: "AC" },
  { label: "Alagoas", value: "AL" },
  { label: "Amapá", value: "AP" },
  { label: "Amazonas", value: "AM" },
  { label: "Bahia", value: "BA" },
  { label: "Ceará", value: "CE" },
  { label: "Distrito Federal", value: "DF" },
  { label: "Espírito Santo", value: "ES" },
  { label: "Goiás", value: "GO" },
  { label: "Maranhão", value: "MA" },
  { label: "Mato Grosso", value: "MT" },
  { label: "Mato Grosso do Sul", value: "MS" },
  { label: "Minas Gerais", value: "MG" },
  { label: "Pará", value: "PA" },
  { label: "Paraíba", value: "PB" },
  { label: "Paraná", value: "PR" },
  { label: "Pernambuco", value: "PE" },
  { label: "Piauí", value: "PI" },
  { label: "Rio de Janeiro", value: "RJ" },
  { label: "Rio Grande do Norte", value: "RN" },
  { label: "Rio Grande do Sul", value: "RS" },
  { label: "Rondônia", value: "RO" },
  { label: "Roraima", value: "RR" },
  { label: "Santa Catarina", value: "SC" },
  { label: "São Paulo", value: "SP" },
  { label: "Sergipe", value: "SE" },
  { label: "Tocantins", value: "TO" },
] as const;

const MODALITY_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Online", value: "online" },
  { label: "Presencial", value: "presencial" },
  { label: "Presencial e Online", value: "hibrido" },
] as const;

const CPF_CHANGE_CONFIRMATION_OPTIONS = [
  { label: "Não, manter sem confirmação", value: "" },
  { label: "Sim, confirmo a alteração administrativa", value: "sim" },
] as const;

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
  if (!normalized) return "Não informado";

  return (
    options.find((option) => option.value === normalized)?.label ??
    capitalizeOptionLabel(normalized)
  );
};

const PROFILE_STATUS_COPY: Record<"active" | "inactive", { className: string; label: string }> = {
  active: { className: "bg-emerald-50 text-success", label: "Ativo" },
  inactive: { className: "bg-red-50 text-danger", label: "Inativo" },
};

const REGISTRY_VERIFICATION_TONE: Record<string, string> = {
  api_indisponivel: "bg-orange-50 text-orange-700",
  aprovado: "bg-emerald-50 text-success",
  em_analise: "bg-blue-50 text-blue-700",
  limite_tentativas: "bg-orange-50 text-orange-700",
  pendente: "bg-red-50 text-danger",
  rejeitado: "bg-red-50 text-danger",
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  favorites: Heart,
  profile_views: Eye,
  ranking: Trophy,
  rating_avg: Star,
  whatsapp_clicks: MessageCircle,
};

const GENERAL_METRIC_ORDER: Record<string, number> = {
  ranking: 0,
  rating_avg: 1,
  whatsapp_clicks: 2,
  favorites: 3,
  profile_views: 4,
};

const GENERAL_METRIC_LABELS: Record<string, string> = {
  favorites: "Favoritado",
  ranking: "Ranking",
  rating_avg: "Avaliação",
};

type StatisticsSeriesPoint = AdminPsychologistStatistics["business"]["series"][number];
type StatisticsSeriesMetricKey = Exclude<keyof StatisticsSeriesPoint, "date">;
type StatisticsChartMetric = {
  dotRadius: number;
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  id: string;
  key: StatisticsSeriesMetricKey;
  label: string;
  shortLabel: string;
  strokeClassName: string;
  swatchClassName: string;
};

const BUSINESS_CHART_METRICS = [
  {
    dotRadius: 4.2,
    id: "profile_views",
    icon: Eye,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    key: "profile_views",
    label: "Visualizações",
    shortLabel: "Perfil",
    strokeClassName: "stroke-primary",
    swatchClassName: "bg-primary",
  },
  {
    dotRadius: 3.8,
    id: "whatsapp_clicks",
    icon: MessageCircle,
    iconClassName: "text-emerald-500",
    iconToneClassName: "bg-emerald-50",
    key: "whatsapp_clicks",
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    strokeClassName: "stroke-emerald-500",
    swatchClassName: "bg-emerald-500",
  },
  {
    dotRadius: 3.4,
    id: "favorites",
    icon: Heart,
    iconClassName: "text-pink-500",
    iconToneClassName: "bg-pink-50",
    key: "favorites",
    label: "Favoritos",
    shortLabel: "Favoritos",
    strokeClassName: "stroke-pink-500",
    swatchClassName: "bg-pink-500",
  },
  {
    dotRadius: 3.2,
    id: "reviews",
    icon: Star,
    iconClassName: "text-amber-500",
    iconToneClassName: "bg-amber-50",
    key: "reviews",
    label: "Avaliações",
    shortLabel: "Avaliações",
    strokeClassName: "stroke-amber-500",
    swatchClassName: "bg-amber-500",
  },
  {
    dotRadius: 3,
    id: "search_results",
    icon: Search,
    iconClassName: "text-blue-500",
    iconToneClassName: "bg-blue-50",
    key: "search_results",
    label: "Resultados de busca",
    shortLabel: "Busca",
    strokeClassName: "stroke-blue-500",
    swatchClassName: "bg-blue-500",
  },
] as const satisfies readonly StatisticsChartMetric[];

const COMMUNITY_CHART_METRICS = [
  {
    dotRadius: 4.2,
    icon: FileText,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "posts",
    key: "posts",
    label: "Posts",
    shortLabel: "Posts",
    strokeClassName: "stroke-primary",
    swatchClassName: "bg-primary",
  },
  {
    dotRadius: 3.9,
    icon: MessageCircle,
    iconClassName: "text-blue-500",
    iconToneClassName: "bg-blue-50",
    id: "replies",
    key: "replies",
    label: "Respostas",
    shortLabel: "Respostas",
    strokeClassName: "stroke-blue-500",
    swatchClassName: "bg-blue-500",
  },
  {
    dotRadius: 3.7,
    icon: ArrowUp,
    iconClassName: "text-emerald-500",
    iconToneClassName: "bg-emerald-50",
    id: "upvotes",
    key: "upvotes",
    label: "Upvotes",
    shortLabel: "Upvotes",
    strokeClassName: "stroke-emerald-500",
    swatchClassName: "bg-emerald-500",
  },
  {
    dotRadius: 3.5,
    icon: ArrowDown,
    iconClassName: "text-red-500",
    iconToneClassName: "bg-red-50",
    id: "downvotes",
    key: "downvotes",
    label: "Downvotes",
    shortLabel: "Downvotes",
    strokeClassName: "stroke-red-500",
    swatchClassName: "bg-red-500",
  },
  {
    dotRadius: 3.3,
    icon: Bookmark,
    iconClassName: "text-orange-500",
    iconToneClassName: "bg-orange-50",
    id: "saves",
    key: "saves",
    label: "Salvamentos",
    shortLabel: "Salvos",
    strokeClassName: "stroke-orange-500",
    swatchClassName: "bg-orange-500",
  },
  {
    dotRadius: 3.1,
    icon: Share2,
    iconClassName: "text-violet-500",
    iconToneClassName: "bg-violet-50",
    id: "shares",
    key: "shares",
    label: "Compartilhamentos",
    shortLabel: "Shares",
    strokeClassName: "stroke-violet-500",
    swatchClassName: "bg-violet-500",
  },
  {
    dotRadius: 3,
    icon: BookOpen,
    iconClassName: "text-pink-500",
    iconToneClassName: "bg-pink-50",
    id: "comments_received",
    key: "comments_received",
    label: "Comentários recebidos",
    shortLabel: "Comentários",
    strokeClassName: "stroke-pink-500",
    swatchClassName: "bg-pink-500",
  },
] as const satisfies readonly StatisticsChartMetric[];

type BusinessChartMetric = (typeof BUSINESS_CHART_METRICS)[number];
type BusinessChartMetricId = BusinessChartMetric["id"];
type CommunityChartMetric = (typeof COMMUNITY_CHART_METRICS)[number];
type CommunityChartMetricId = CommunityChartMetric["id"];
type StatisticsPeriodValue = NonNullable<AdminPsychologistStatisticsQuery["period"]>;
type StatisticsPeriodPreset = Exclude<StatisticsPeriodValue, "custom">;
type StatisticsCustomRange = Pick<AdminPsychologistStatisticsQuery, "from" | "to">;
type PublicationsPeriodValue = NonNullable<AdminPsychologistPublicationsQuery["period"]>;
type PublicationsCustomRange = Pick<AdminPsychologistPublicationsQuery, "from" | "to">;

const BUSINESS_SERIES_METRIC_KEYS = [
  "comments_received",
  "favorites",
  "profile_views",
  "reviews",
  "replies",
  "saves",
  "search_results",
  "whatsapp_clicks",
  "upvotes",
  "downvotes",
  "shares",
  "posts",
] as const satisfies readonly StatisticsSeriesMetricKey[];

const STATISTICS_PERIOD_OPTIONS: { id: StatisticsPeriodPreset; label: string }[] = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

const PUBLICATIONS_PERIOD_OPTIONS: { id: PublicationsPeriodValue; label: string }[] = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
];

const CARD = "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const COURTESY_GRANT_CONFIRMATION = "CONCEDER CORTESIA";

const courtesyDetailsSchema = z.object({
  cpf: z
    .string()
    .trim()
    .min(1, "Informe o CPF.")
    .max(14, "Use no maximo 14 caracteres.")
    .refine((value) => isValidCpf(value), "Informe um CPF valido."),
  crp: z.string().trim().min(1, "Informe o CRP.").max(40, "Use no maximo 40 caracteres."),
  crp_registration_date: z.string().trim().min(1, "Informe a data inscrição CRP."),
  notes: z
    .string()
    .trim()
    .min(1, "Informe as notas internas.")
    .max(500, "Use no maximo 500 caracteres."),
  period_days: z.string().min(1, "Selecione o periodo."),
  regional_crp: z
    .string()
    .trim()
    .min(1, "Selecione a regional do CRP.")
    .max(120, "Use no maximo 120 caracteres."),
});

const courtesyConfirmationSchema = z
  .object({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== COURTESY_GRANT_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${COURTESY_GRANT_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

type CourtesyFormValues = z.infer<typeof courtesyDetailsSchema>;
type CourtesyConfirmationFormValues = z.infer<typeof courtesyConfirmationSchema>;

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);

  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

const registryApproveBaseSchema = z.object({
  confirmation: z.string(),
  cpf: z
    .string()
    .min(1, "Informe o CPF.")
    .refine((value) => isValidCpf(value), "Informe um CPF válido."),
  crp: z.string().min(1, "Informe o número do CRP.").max(40, "Use no máximo 40 caracteres."),
  crp_registration_date: z.string().min(1, "Informe a data de inscrição no CRP."),
  regional_crp: z.string().min(1, "Selecione a regional do CRP."),
  situation_confirmed: z.string(),
});

const registryApproveSchema = registryApproveBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "APROVAR CRP") {
    ctx.addIssue({
      code: "custom",
      message: "Digite APROVAR CRP para confirmar.",
      path: ["confirmation"],
    });
  }

  if (values.situation_confirmed !== "sim") {
    ctx.addIssue({
      code: "custom",
      message: "Confirme que a situação foi verificada.",
      path: ["situation_confirmed"],
    });
  }
});

const registryRejectBaseSchema = z.object({
  confirmation: z.string(),
  reason: z
    .string()
    .min(10, "Informe um motivo em PT-BR com pelo menos 10 caracteres.")
    .max(1000, "Use no máximo 1000 caracteres."),
});

const registryRejectSchema = registryRejectBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "REJEITAR CRP") {
    ctx.addIssue({
      code: "custom",
      message: "Digite REJEITAR CRP para confirmar.",
      path: ["confirmation"],
    });
  }
});

const registrySaveBaseSchema = z.object({
  confirmation: z.string(),
});

const registrySaveSchema = registrySaveBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "SALVAR REGISTRO") {
    ctx.addIssue({
      code: "custom",
      message: "Digite SALVAR REGISTRO para confirmar.",
      path: ["confirmation"],
    });
  }
});

const registryIdentitySchema = z.object({
  crp: z.string().min(1, "Informe o número do CRP.").max(40, "Use no máximo 40 caracteres."),
  crp_registration_date: z.string().min(1, "Informe a data de inscrição no CRP."),
  regional_crp: z.string().min(1, "Selecione a regional do CRP."),
});

type RegistryApproveFormValues = z.infer<typeof registryApproveBaseSchema>;
type RegistryIdentityFormValues = z.infer<typeof registryIdentitySchema>;
type RegistryRejectFormValues = z.infer<typeof registryRejectBaseSchema>;
type RegistrySaveFormValues = z.infer<typeof registrySaveBaseSchema>;

const profilePersonalDataBaseSchema = z.object({
  address_city: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_complement: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_district: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_number: z.string().max(40, "Use no máximo 40 caracteres.").optional(),
  address_state: z.string().max(2, "Use a UF com 2 letras.").optional(),
  address_street: z.string().max(160, "Use no máximo 160 caracteres.").optional(),
  address_zip: z.string().max(12, "Use no máximo 12 caracteres.").optional(),
  birthdate: z.string().optional(),
  confirm_cpf_change: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((value) => !value || isValidCpf(value), "Informe um CPF válido."),
  gender: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  race_color: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
  religion: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  whatsapp: z.string().max(24, "Use no máximo 24 caracteres.").optional(),
});

type ProfilePersonalDataFormValues = z.infer<typeof profilePersonalDataBaseSchema>;

const profileProfessionalDataSchema = z.object({
  approach_ids: z.array(z.string()),
  language: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  modality: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
  service_ids: z.array(z.string()),
  specialty_ids: z.array(z.string()),
  target_audience: z.array(z.string()),
});

type ProfileProfessionalDataFormValues = z.infer<typeof profileProfessionalDataSchema>;

const accountReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no maximo 500 caracteres."),
});

const accountChangeEmailSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    email: z.string().email("Informe um e-mail valido."),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR EMAIL") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR EMAIL para confirmar.",
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
      .max(128, "Use no maximo 128 caracteres."),
    password_confirm: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR SENHA") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR SENHA para confirmar.",
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
    if (values.confirmation.trim().toUpperCase() !== "ENCERRAR SESSOES") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ENCERRAR SESSOES para confirmar.",
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
      if (values.confirmation.trim().toUpperCase() !== confirmationText) {
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

const REPORT_DISMISS_CONFIRMATION = "DENUNCIA IMPROCEDENTE";
const REPORT_UPHOLD_CONFIRMATION = "DENUNCIA PROCEDENTE";

const reportDismissSchema = accountReasonSchema
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

const reportUpholdSchema = accountReasonSchema
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

type ReportDismissFormValues = z.infer<typeof reportDismissSchema>;
type ReportUpholdFormValues = z.infer<typeof reportUpholdSchema>;

const PUBLICATION_REMOVE_CONFIRMATION = "REMOVER CONTEUDO";

const publicationRemoveSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== PUBLICATION_REMOVE_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${PUBLICATION_REMOVE_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

type PublicationRemoveFormValues = z.infer<typeof publicationRemoveSchema>;

const toPublicHref = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;

  return `${publicFrontendUrl.replace(/\/$/, "")}${url}`;
};

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
      // Entradas inválidas de env não devem quebrar o header.
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

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

const formatDate = (value?: string | null) => {
  if (!value) return "Não informado";

  return dateFormatter.format(new Date(value));
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "Não informado";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  if (isoDate) {
    return dateOnlyFormatter.format(new Date(`${isoDate}T00:00:00.000Z`));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return dateOnlyFormatter.format(date);
};

const formatDayMonth = (value?: string | null) => {
  if (!value) return "00/00";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  if (isoDate) {
    return dayMonthFormatter.format(new Date(`${isoDate}T00:00:00.000Z`));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00/00";

  return dayMonthFormatter.format(date);
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

const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};

const getStatisticsRangeForPeriod = (
  period: StatisticsPeriodPreset,
  createdAt?: string | null,
): Required<StatisticsCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "all") return { from: dateInputValueFromString(createdAt), to: today };

  return { from: toDateInputValue(startOfCurrentWeek()), to: today };
};

const buildStatisticsPeriodQuery = (
  period: StatisticsPeriodValue,
  customRange: StatisticsCustomRange,
): AdminPsychologistStatisticsQuery =>
  period === "custom" ? { from: customRange.from, period, to: customRange.to } : { period };

const statisticsDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const isValidStatisticsRange = (range: StatisticsCustomRange) => {
  if (!range.from || !range.to) return false;

  return statisticsDateFromInput(range.from) <= statisticsDateFromInput(range.to);
};

type StatisticsPeriodControlsProps = {
  idPrefix: string;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof StatisticsCustomRange, value: string) => void;
  onPeriodChange: (period: StatisticsPeriodPreset) => void;
  period: StatisticsPeriodValue;
  range: StatisticsCustomRange;
  rangeError: string | null;
};

const StatisticsPeriodControls = ({
  idPrefix,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
}: StatisticsPeriodControlsProps) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
    <label className="grid gap-1 text-xs font-black text-muted" htmlFor={`${idPrefix}-period`}>
      Período
      <span className="relative">
        <select
          className="h-10 min-w-[170px] appearance-none rounded-2xl border border-border bg-surface py-0 pl-3 pr-11 text-sm font-black text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-period`}
          onChange={(event) => onPeriodChange(event.target.value as StatisticsPeriodPreset)}
          value={period}
        >
          {period === "custom" ? (
            <option disabled hidden value="custom">
              Personalizado
            </option>
          ) : null}
          {STATISTICS_PERIOD_OPTIONS.map((option) => (
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

    <div className="grid gap-2 sm:grid-cols-2" onBlur={onDateControlsBlur}>
      <label className="grid gap-1 text-xs font-black text-muted" htmlFor={`${idPrefix}-from`}>
        De
        <input
          className="h-10 rounded-2xl border border-border bg-surface px-3 text-sm font-black text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-from`}
          onChange={(event) => onDateChange("from", event.target.value)}
          type="date"
          value={range.from ?? ""}
        />
      </label>
      <label className="grid gap-1 text-xs font-black text-muted" htmlFor={`${idPrefix}-to`}>
        Até
        <input
          className="h-10 rounded-2xl border border-border bg-surface px-3 text-sm font-black text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-to`}
          onChange={(event) => onDateChange("to", event.target.value)}
          type="date"
          value={range.to ?? ""}
        />
      </label>
    </div>
    {rangeError ? <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p> : null}
  </div>
);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return `${dateFormatter.format(date)} às ${timeFormatter.format(date)}`;
};

const formatNullable = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "Não informado";

  return String(value);
};

const formatAdminHeaderCrp = (detail: AdminPsychologistDetail) => {
  const professional = detail.profile.professional;
  const [fallbackRegion, ...fallbackRegistrationParts] = String(detail.header.crp ?? "").split("/");
  const regionDigits = onlyDigits(professional.regional_crp || fallbackRegion).slice(0, 2);
  const registrationDigits = onlyDigits(
    professional.registration_number || fallbackRegistrationParts.join("/"),
  ).slice(0, 5);

  if (regionDigits && registrationDigits) {
    return `${regionDigits.padStart(2, "0")}/${registrationDigits.padStart(5, "0")}`;
  }

  return detail.header.crp || "CRP não informado";
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = String(gender ?? "")
    .trim()
    .toLowerCase();

  return normalized === "feminino" || normalized === "mulher" ? "Psicóloga" : "Psicólogo";
};

const getHeaderPlanLabel = (detail: AdminPsychologistDetail) => {
  const subscription = detail.general.subscription;
  const hasCourtesy =
    subscription.source === "admin_grant" &&
    subscription.status === "ativa" &&
    subscription.plan_slug !== "gratuito";

  if (hasCourtesy) return "Plano de cortesia";

  return detail.header.plan_name || "Sem plano ativo";
};

const needsManualRegistryReview = (detail: AdminPsychologistDetail) => {
  const subscription = detail.general.subscription;
  const hasActiveProfessionalPlan =
    subscription.status === "ativa" &&
    subscription.plan_slug !== "gratuito" &&
    subscription.source !== "admin_grant";
  const hasActiveRegistry =
    detail.header.verified || detail.profile.professional.crp_status === "aprovado";

  return hasActiveProfessionalPlan && !hasActiveRegistry;
};

const formatGrantedByName = (value?: string | null) => {
  const formatted = formatNullable(value);
  if (formatted === "Não informado") return formatted;

  const nameOnly = formatted
    .replace(/\s+[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();

  return nameOnly || formatted;
};

const formatMoney = (cents: number | null) => {
  if (cents === null) return "Não informado";

  return currencyFormatter.format(cents / 100);
};

const formatPlanInterval = (interval?: string | null) => {
  const normalized = String(interval ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (["month", "monthly", "mes", "mês"].includes(normalized)) return "mês";
  if (["year", "yearly", "ano"].includes(normalized)) return "ano";

  return normalized;
};

const formatPlanPrice = (cents: number | null, interval?: string | null) => {
  const price = formatMoney(cents);
  const planInterval = formatPlanInterval(interval);

  return planInterval && price !== "Nao informado" && price !== "Não informado"
    ? `${price}/${planInterval}`
    : price;
};

const formatInputDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const normalizeCpfInput = (value?: string | null) => onlyDigits(value).slice(0, 11);

const formatCpfInput = (value?: string | null) => {
  const digits = normalizeCpfInput(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCpfDisplay = (value?: string | null) => {
  const formatted = formatCpfInput(value);

  return formatted || formatNullable(value);
};

const formatPhoneDisplay = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Não informado";

  const digits = onlyDigits(raw);
  if (!digits) return raw;

  const hasBrazilCode = digits.startsWith("55") && [12, 13].includes(digits.length);
  const nationalDigits = hasBrazilCode ? digits.slice(2) : digits;
  const prefix = hasBrazilCode ? "+55 " : "";

  if (nationalDigits.length === 11) {
    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 7)}-${nationalDigits.slice(7)}`;
  }

  if (nationalDigits.length === 10) {
    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 6)}-${nationalDigits.slice(6)}`;
  }

  if (nationalDigits.length === 9) {
    return `${nationalDigits.slice(0, 5)}-${nationalDigits.slice(5)}`;
  }

  if (nationalDigits.length === 8) {
    return `${nationalDigits.slice(0, 4)}-${nationalDigits.slice(4)}`;
  }

  return raw;
};

const formatWhatsappInput = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 15);
  if (!digits) return "";

  const formatNationalPhone = (nationalDigits: string, prefix = "") => {
    if (nationalDigits.length <= 2) {
      return nationalDigits ? `${prefix}(${nationalDigits}` : prefix.trim();
    }

    if (nationalDigits.length <= 7) {
      return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2)}`;
    }

    if (nationalDigits.length <= 10) {
      return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 6)}-${nationalDigits.slice(6)}`;
    }

    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 7)}-${nationalDigits.slice(7, 11)}`;
  };

  if (digits === "55") {
    return "+55 ";
  }

  if (digits.startsWith("55") && digits.length > 2) {
    return formatNationalPhone(digits.slice(2), "+55 ");
  }

  if (digits.length <= 11) {
    return formatNationalPhone(digits);
  }

  return `+${digits}`;
};

const formatZipInput = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatZipDisplay = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const digits = onlyDigits(raw);
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;

  return raw;
};

const emptyToNull = (value?: string | null) => {
  const normalized = String(value ?? "").trim();

  return normalized || null;
};

const normalizeAddressPart = (value?: string | null) => {
  const part = String(value ?? "").trim();

  return part || null;
};

const formatPersonalAddress = (
  address: AdminPsychologistDetail["profile"]["personal"]["address"],
) => {
  const formattedZip = formatZipDisplay(address.zip);
  const line = [
    normalizeAddressPart(address.street),
    normalizeAddressPart(address.number),
    normalizeAddressPart(address.complement),
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [
    normalizeAddressPart(address.district),
    normalizeAddressPart(address.city),
    normalizeAddressPart(address.state),
    formattedZip ? `CEP ${formattedZip}` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  return [line, cityLine].filter(Boolean).join("\n") || formatNullable(address.full);
};

const formatPaymentMethod = (method: AdminPsychologistBilling["payment_method"]) => {
  if (!method) return "Nao informado";

  const brand = method.brand || "Cartao";
  const last4 = method.last4 ? `•••• ${method.last4}` : "final nao informado";
  const expiration =
    method.exp_month && method.exp_year
      ? ` · validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
      : "";

  return `${brand} ${last4}${expiration}`;
};

const formatMetricValue = (metric: AdminPsychologistDetailMetric) => {
  if (metric.value === null) return "—";
  if (metric.unit === "decimal") {
    return metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  }
  if (metric.unit === "position") return `Top #${numberFormatter.format(metric.value)}`;

  return numberFormatter.format(metric.value);
};

const formatMetricLabel = (metric: AdminPsychologistDetailMetric) =>
  GENERAL_METRIC_LABELS[metric.id] ?? metric.label;

const orderGeneralMetrics = (metrics: AdminPsychologistDetailMetric[]) =>
  [...metrics].sort(
    (a, b) =>
      (GENERAL_METRIC_ORDER[a.id] ?? Number.MAX_SAFE_INTEGER) -
      (GENERAL_METRIC_ORDER[b.id] ?? Number.MAX_SAFE_INTEGER),
  );

const formatEngagementMetricValue = (metric: AdminPsychologistEngagementMetric) => {
  if (!metric.available || metric.value === null) return "Indisponível";
  if (metric.unit === "percentage") {
    return `${metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}%`;
  }
  if (metric.unit === "seconds") return `${numberFormatter.format(metric.value)}s`;
  if (metric.unit === "position") return `#${numberFormatter.format(metric.value)}`;

  return numberFormatter.format(metric.value);
};

const formatPlatformDuration = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPreviousPeriod = (
  comparison?: AdminPsychologistEngagementMetric["comparison"] | null,
) => {
  if (!comparison) return "período anterior";

  return `${formatDayMonth(comparison.previous_from)} - ${formatDayMonth(comparison.previous_to)}`;
};

const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value);
  if (formatted === "Não informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};

const listText = (items: string[] | AdminPsychologistCatalogItem[]) => {
  if (items.length === 0) return "Não informado";

  return items
    .map((item) => capitalizeOptionLabel(typeof item === "string" ? item : item.name))
    .join(", ");
};

const CardShell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cn(CARD, className)}>{children}</section>
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

const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-5 w-5 shrink-0", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="#308CE8"
    />
  </svg>
);

const WhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-5 w-5 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
    />
  </svg>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = renderableImageSrc(src);

  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-extrabold text-primary md:h-28 md:w-28">
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover md:h-28 md:w-28"
      height={112}
      priority
      src={imageSrc}
      unoptimized={isPublicAdminMediaSrc(imageSrc)}
      width={112}
    />
  );
};

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

const MetricIconCircle = ({ icon: Icon, metricId }: { icon: LucideIcon; metricId: string }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    {metricId === "whatsapp_clicks" ? (
      <WhatsAppIcon aria-hidden className="h-5 w-5" />
    ) : (
      <Icon aria-hidden className="h-5 w-5" />
    )}
  </span>
);

const LoadingState = () => (
  <div className="space-y-5" data-psychologist-detail-loading="true">
    <div className={cn(CARD, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6" data-psychologist-detail-error="true">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            Não foi possível carregar o psicólogo
          </h1>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const DetailHeader = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  tab: ActiveTab;
}) => {
  const pathname = usePathname();
  const header = detail.header;
  const profileStatus = header.active ? PROFILE_STATUS_COPY.active : PROFILE_STATUS_COPY.inactive;
  const showProfileRegistryAlert = needsManualRegistryReview(detail);
  const reportsAlertInput = useMemo<AdminPsychologistReportsQuery>(
    () => ({ limit: 1, page: 1, status: "pending", type: "all" }),
    [],
  );
  const reportsAlertQuery = useAdminPsychologistReports(id, reportsAlertInput);
  const pendingReportsCount =
    reportsAlertQuery.data?.cards.find((card) => card.id === "pending")?.value ?? 0;

  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={header.name} src={header.avatar} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {header.name}
              </h1>
              {header.verified ? (
                <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-6 w-6" />
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black text-muted">
              <span>{getPsychologistTitle(detail.profile.professional.gender)}</span>
              <span aria-hidden>•</span>
              <span>{formatAdminHeaderCrp(detail)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className={profileStatus.className}>{profileStatus.label}</Badge>
              <Badge className="bg-surface-muted text-muted">{getHeaderPlanLabel(detail)}</Badge>
              <Badge className="bg-amber-50 text-amber-700">
                <Star aria-hidden className="mr-1 h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {header.rating_avg.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}{" "}
                ({numberFormatter.format(header.rating_count)})
              </Badge>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-muted">
              <Clock aria-hidden className="h-4 w-4 text-primary" />
              Último acesso: {formatDateTime(header.last_access_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col xl:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/45 bg-surface px-5 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft"
            href={toPublicHref(header.public_profile_url)}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Ver perfil público
          </a>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do psicólogo" className="flex min-w-max gap-1 py-1">
          {TABS.map((item) => {
            const active = item.id === tab;
            const showRegistryAlert = item.id === "perfil" && showProfileRegistryAlert;
            const showReportsAlert = item.id === "denuncias" && pendingReportsCount > 0;
            const className = cn(
              "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
              active ? "text-primary" : "text-foreground hover:text-primary",
              !item.ready && "cursor-not-allowed text-muted hover:text-muted",
            );

            if (!item.ready) {
              return (
                <button
                  aria-disabled
                  className={className}
                  key={item.id}
                  title={`${item.label} será implementada em ${
                    "task" in item ? item.task : "task futura"
                  }`}
                  type="button"
                >
                  <span>{item.label}</span>
                  {showRegistryAlert ? (
                    <AlertTriangle
                      aria-label="Registro profissional pendente de verificação manual"
                      className="h-4 w-4 text-danger"
                    />
                  ) : null}
                  {showReportsAlert ? (
                    <AlertTriangle
                      aria-label="Há denúncias pendentes"
                      className="h-4 w-4 text-danger"
                    />
                  ) : null}
                  <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
                    Em breve
                  </span>
                </button>
              );
            }

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={className}
                href={item.id === "geral" ? pathname : `${pathname}?tab=${item.id}`}
                key={item.id}
              >
                <span>{item.label}</span>
                {showRegistryAlert ? (
                  <AlertTriangle
                    aria-label="Registro profissional pendente de verificação manual"
                    className="h-4 w-4 text-danger"
                  />
                ) : null}
                {showReportsAlert ? (
                  <AlertTriangle
                    aria-label="Há denúncias pendentes"
                    className="h-4 w-4 text-danger"
                  />
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

const MetricCard = ({ metric }: { metric: AdminPsychologistDetailMetric }) => {
  const Icon = METRIC_ICONS[metric.id] ?? Trophy;

  return (
    <div className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft">
      <MetricIconCircle icon={Icon} metricId={metric.id} />
      <p className="mt-4 text-sm font-extrabold text-muted">{formatMetricLabel(metric)}</p>
      <p className="mt-2 text-3xl font-extrabold text-foreground">{formatMetricValue(metric)}</p>
    </div>
  );
};

const isFreeOrCourtesySubscription = (
  subscription: AdminPsychologistDetail["general"]["subscription"],
) => {
  const planSlug = subscription.plan_slug?.trim().toLowerCase();
  const planName = subscription.plan_name?.trim().toLowerCase();
  const source = subscription.source?.trim().toLowerCase();

  return (
    source === "admin_grant" ||
    source === "free_signup" ||
    planSlug === "gratuito" ||
    planName === "plano gratuito"
  );
};

const formatSubscriptionRenewal = (
  subscription: AdminPsychologistDetail["general"]["subscription"],
) => {
  if (isFreeOrCourtesySubscription(subscription)) return "Não se aplica";

  return formatDate(subscription.current_period_end);
};

const formatSubscriptionLtv = (
  billing: AdminPsychologistBilling | undefined,
  billingLoading: boolean,
  billingError: boolean,
) => {
  if (billing?.plan.lifetime_value_available) {
    return formatMoney(billing.plan.lifetime_value_cents ?? 0);
  }

  if (billing?.plan.lifetime_value_unavailable_reason) {
    return (
      <span className="flex flex-col gap-1">
        <span>Indisponível</span>
        <span className="text-xs font-bold text-subtle">
          {billing.plan.lifetime_value_unavailable_reason}
        </span>
      </span>
    );
  }

  if (billingLoading) return "Carregando";
  if (billingError) return "Indisponível";

  return "Não informado";
};

const SubscriptionCard = ({
  billing,
  billingError,
  billingLoading,
  detail,
}: {
  billing?: AdminPsychologistBilling;
  billingError: boolean;
  billingLoading: boolean;
  detail: AdminPsychologistDetail;
}) => {
  const subscription = detail.general.subscription;
  const rows: Array<[string, ReactNode]> = [
    ["Plano atual", subscription.plan_name || "Sem plano ativo"],
    ["Início", formatDate(subscription.started_at)],
    ["Tempo até assinatura", subscription.time_to_first_paid_subscription.label],
    ["Próxima renovação", formatSubscriptionRenewal(subscription)],
    ["LTV", formatSubscriptionLtv(billing, billingLoading, billingError)],
  ];

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Dados da assinatura</h2>
          <p className="mt-1 text-sm text-muted">Resumo somente leitura do plano atual.</p>
        </div>
        <IconCircle icon={Wallet} />
      </div>
      <dl className="mt-5 divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[190px_1fr]" key={label}>
            <dt className="font-black text-muted">{label}</dt>
            <dd className="font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </CardShell>
  );
};

const registryResponsibleLabel = (registry: AdminPsychologistRegistryVerification) => {
  const actor = registry.summary.latest_manual_admin;
  if (actor?.name) return formatGrantedByName(actor.name);
  if (registry.summary.source === "api_automatica") return "Via API automática";
  if (registry.summary.source === "admin_grant" || registry.summary.source === "manual_admin") {
    return "Admin Lectum";
  }

  return "Não informado";
};

const registryLastUpdate = (registry: AdminPsychologistRegistryVerification) =>
  registry.summary.latest_manual_checked_at ??
  registry.summary.cfp_verified_at ??
  registry.latest_attempts[0]?.checked_at ??
  null;

const RegistryStatusCard = ({ id }: { id: string }) => {
  const pathname = usePathname();
  const query = useAdminPsychologistRegistryVerification(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) {
    return (
      <CardShell className="p-5">
        <div className="h-52 animate-pulse rounded-3xl bg-surface-muted" />
      </CardShell>
    );
  }

  if (query.isError && errorMessage) {
    return (
      <CardShell className="p-5">
        <div className="flex items-start gap-3">
          <IconCircle icon={AlertTriangle} />
          <div>
            <p className="text-sm text-muted">{errorMessage}</p>
          </div>
        </div>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary sm:w-auto"
          onClick={() => void query.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Tentar novamente
        </button>
      </CardShell>
    );
  }

  const registry = query.data;
  if (!registry) return null;

  const lastUpdate = registryLastUpdate(registry);
  const summaryItems = [
    { label: "Regional CRP", value: formatNullable(registry.identity.regional_crp) },
    { label: "Nº CRP", value: formatNullable(registry.identity.registration_number) },
    {
      label: "Data de inscrição",
      value: formatDateOnly(registry.identity.crp_registration_date),
    },
    { label: "Origem", value: registry.summary.source_label },
    { label: "Responsável", value: registryResponsibleLabel(registry) },
    { label: "Última atualização", value: formatDateTime(lastUpdate) },
  ];
  const helperText =
    registry.summary.status === "aprovado"
      ? "Registro ativo para operações Lectum. Dados públicos do conselho podem ser revisados em Perfil e cadastro."
      : registry.actions.can_approve_manually
        ? "Registro pendente. Revise os dados do conselho e aprove ou rejeite em Perfil e cadastro."
        : "Resumo somente leitura. Ações do registro ficam concentradas em Perfil e cadastro.";

  return (
    <CardShell className="p-5">
      <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              Situação atual
            </p>
            <p className="mt-1 text-xl font-black text-foreground">
              {registry.summary.status_label}
            </p>
          </div>
          <Badge
            className={
              REGISTRY_VERIFICATION_TONE[registry.summary.status] ?? "bg-surface-muted text-muted"
            }
          >
            {registry.summary.approval_label}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">{helperText}</p>
      </div>
      <dl className="mt-4 divide-y divide-border text-sm">
        {summaryItems.map((item) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[170px_1fr]" key={item.label}>
            <dt className="font-black text-muted">{item.label}</dt>
            <dd className="font-bold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={`${pathname}?tab=perfil`}
      >
        Abrir registro profissional
      </Link>
    </CardShell>
  );
};

const RecentActivity = ({
  events,
}: {
  events: AdminPsychologistDetail["general"]["recent_activity"];
}) => {
  const activityUserFor = (event: AdminPsychologistDetail["general"]["recent_activity"][number]) =>
    event.actor ?? { name: "Não informado", role: null };

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Atividades recentes</h2>
          <p className="mt-1 text-sm text-muted">
            Registro simples dos principais eventos reais encontrados.
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma atividade recente real encontrada para este psicólogo.
        </p>
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
              {events.map((event) => {
                const user = activityUserFor(event);

                return (
                  <tr key={event.id}>
                    <td className="py-3 pr-3 font-bold text-muted">
                      {formatDateTime(event.created_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{event.label}</td>
                    <td className="px-3 py-3 text-muted">{event.description}</td>
                    <td className="px-3 py-3">
                      <span className="block font-black text-foreground">{user.name}</span>
                      {user.role ? (
                        <span className="mt-1 block text-xs font-bold text-muted">{user.role}</span>
                      ) : null}
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
};

const GeneralTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const metrics = orderGeneralMetrics(detail.general.metrics);
  const billingQuery = useAdminPsychologistBilling(id);

  return (
    <div className="space-y-5" data-psychologist-detail-tab="geral">
      <section>
        <h2 className="sr-only">Métricas principais</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SubscriptionCard
          billing={billingQuery.data}
          billingError={billingQuery.isError}
          billingLoading={billingQuery.isLoading}
          detail={detail}
        />
        <RegistryStatusCard id={id} />
      </div>

      <div className="grid gap-5">
        <RecentActivity events={detail.general.recent_activity} />
      </div>
    </div>
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
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <IconCircle icon={Icon} />
        <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    <div className="mt-4">{children}</div>
  </CardShell>
);

const FeatureLine = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted p-3 text-sm font-black text-foreground">
    <Icon aria-hidden className="h-5 w-5 text-primary" />
    {label}
  </div>
);
const TextBlock = ({ children, empty }: { children?: string | null; empty: string }) => (
  <p className="whitespace-pre-line rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
    {children || empty}
  </p>
);

const VideoCard = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const content = detail.profile.content;
  const cover = renderableImageSrc(content.video_cover_url || content.cover_image_url);
  const videoSrc = resolveAdminMediaUrl(content.video_url);

  return (
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <IconCircle icon={Video} />
        <h2 className="text-lg font-black text-foreground">Vídeo de apresentação</h2>
      </div>

      {videoSrc ? (
        <div className="mt-5 max-w-[260px] overflow-hidden rounded-[1.6rem] border border-border bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: o backend ainda não expõe arquivo de legenda para o vídeo do perfil. */}
          <video
            aria-label={`Vídeo de apresentação de ${detail.header.name}`}
            className="aspect-[9/16] w-full bg-black object-cover"
            controls
            playsInline
            poster={cover || undefined}
            preload="metadata"
            src={videoSrc}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold text-muted">Nenhum vídeo cadastrado.</p>
      )}
    </CardShell>
  );
};
const EngagementLoadingState = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-5" data-psychologist-engagement-loading="true">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["card-1", "card-2", "card-3", "card-4"].map((key) => (
        <div className={cn(CARD, "h-36 animate-pulse bg-surface-muted")} key={key} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, index) => `row-${index + 1}`).map((key) => (
      <div className={cn(CARD, "h-64 animate-pulse bg-surface-muted")} key={key} />
    ))}
  </div>
);

const MetricComparisonLine = ({
  comparison,
  className,
}: {
  className?: string;
  comparison?: AdminPsychologistEngagementMetric["comparison"] | null;
}) => {
  const trend = comparison?.trend ?? "unavailable";
  const hasArrow = trend === "up" || trend === "down";
  const TrendIcon = trend === "down" ? ArrowDown : ArrowUp;

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[0.68rem]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 font-black",
          trend === "up" && "text-success",
          trend === "down" && "text-danger",
          (trend === "flat" || trend === "unavailable") && "text-muted",
        )}
      >
        {hasArrow ? <TrendIcon aria-hidden className="h-3 w-3" /> : null}
        {formatChange(comparison?.change_percent ?? null)}
      </span>
      <span className="min-w-0 break-words font-bold text-muted">
        vs. {formatPreviousPeriod(comparison)}
      </span>
    </div>
  );
};

const StatisticsMetricToggleCard = ({
  active,
  config,
  metric,
  onToggle,
}: {
  active: boolean;
  config: StatisticsChartMetric;
  metric: AdminPsychologistEngagementMetric;
  onToggle: () => void;
}) => {
  const displayValue = metric.available ? formatEngagementMetricValue(metric) : "—";
  const Icon = config.icon;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
        !metric.available &&
          "cursor-not-allowed border-border bg-surface-muted opacity-60 shadow-none hover:border-border",
      )}
      disabled={!metric.available}
      onClick={onToggle}
      title={`${metric.label}: ${displayValue}. ${
        !metric.available ? "Indisponível" : active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
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
            {config.id === "whatsapp_clicks" ? (
              <WhatsAppIcon aria-hidden className="h-5 w-5" />
            ) : (
              <Icon aria-hidden className="h-5 w-5" />
            )}
          </span>
        </span>
        <span className="mt-4 block min-w-0 max-w-full">
          <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
            {metric.label}
          </span>
          <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
            {displayValue}
          </span>
        </span>
      </span>
      {metric.available && metric.comparison ? (
        <MetricComparisonLine className="mt-3" comparison={metric.comparison} />
      ) : metric.unavailable_reason ? (
        <span className="mt-3 block text-xs font-bold text-muted">{metric.unavailable_reason}</span>
      ) : null}
      <span className="sr-only">
        {!metric.available ? "Indisponível" : active ? "visível no gráfico" : "oculto no gráfico"}
      </span>
    </button>
  );
};

const StatisticsStaticMetricCard = ({
  icon: Icon,
  iconClassName,
  iconToneClassName,
  metric,
}: {
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  metric: AdminPsychologistEngagementMetric;
}) => {
  const displayValue = metric.available ? formatEngagementMetricValue(metric) : "—";

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-card border border-primary/35 bg-surface p-4 text-left shadow-admin-soft ring-1 ring-primary/10",
        !metric.available && "border-border/75 bg-surface-muted opacity-80 ring-0",
      )}
      title={`${metric.label}: ${displayValue}. ${
        metric.available ? "Métrica real" : "Indisponível"
      }`}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          iconToneClassName,
          iconClassName,
        )}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="mt-4 block min-w-0 max-w-full">
        <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
          {metric.label}
        </span>
        <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
          {displayValue}
        </span>
      </span>
      {metric.available ? (
        <MetricComparisonLine className="mt-3" comparison={metric.comparison} />
      ) : metric.unavailable_reason ? (
        <span className="mt-3 block text-xs font-bold text-muted">{metric.unavailable_reason}</span>
      ) : null}
    </div>
  );
};

const aggregateStatisticsChartPoints = (
  points: AdminPsychologistStatistics["business"]["series"],
) => aggregateCalendarChartPoints(points, BUSINESS_SERIES_METRIC_KEYS);

const StatisticsSeriesChart = ({
  keys,
  points,
}: {
  keys: readonly StatisticsChartMetric[];
  points: AdminPsychologistStatistics["business"]["series"];
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

  const chartPoints = aggregateStatisticsChartPoints(points);
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
              <g key={`business-grid-${value}-${y}`}>
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

const formatVideoAxisTime = (positionPercent: number, durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return positionPercent === 0 ? "0:00" : "—";
  }

  const clampedPosition = Math.min(100, Math.max(0, positionPercent));
  const totalSeconds = Math.round((clampedPosition / 100) * durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const clampVideoPercent = (value: number) => Math.min(100, Math.max(0, value));

type VideoRetentionCurvePoint = {
  percentage: number;
  position_percent: number;
};

const ADMIN_RETENTION_CHART_WIDTH = 300;
const ADMIN_RETENTION_CHART_TOP = 12;
const ADMIN_RETENTION_CHART_BOTTOM = 116;
const ADMIN_RETENTION_CHART_LEFT_PADDING = 18;
const ADMIN_RETENTION_CHART_RIGHT_PADDING = 58;

const toVideoRetentionChartPoint = (positionPercent: number, percentage: number) => {
  const x =
    ADMIN_RETENTION_CHART_LEFT_PADDING +
    (clampVideoPercent(positionPercent) / 100) *
      (ADMIN_RETENTION_CHART_WIDTH -
        ADMIN_RETENTION_CHART_LEFT_PADDING -
        ADMIN_RETENTION_CHART_RIGHT_PADDING);
  const y =
    ADMIN_RETENTION_CHART_TOP +
    ((100 - clampVideoPercent(percentage)) / 100) *
      (ADMIN_RETENTION_CHART_BOTTOM - ADMIN_RETENTION_CHART_TOP);

  return { x, y };
};

const buildVideoRetentionCurvePoints = ({
  retention,
  views,
}: {
  retention: AdminPsychologistStatistics["video"]["retention"];
  views: number;
}): VideoRetentionCurvePoint[] => {
  if (views <= 0) {
    return [
      { percentage: 0, position_percent: 0 },
      { percentage: 0, position_percent: 100 },
    ];
  }

  const intermediatePoints = retention
    .filter((point) => point.position_percent > 0 && point.position_percent < 100)
    .sort((left, right) => left.position_percent - right.position_percent)
    .map((point) => ({
      percentage: clampVideoPercent(point.percentage),
      position_percent: clampVideoPercent(point.position_percent),
    }));

  return [
    { percentage: 100, position_percent: 0 },
    ...intermediatePoints,
    { percentage: 0, position_percent: 100 },
  ];
};

const buildSmoothVideoRetentionPath = (points: VideoRetentionCurvePoint[]) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) =>
    toVideoRetentionChartPoint(point.position_percent, point.percentage),
  );
  const firstPoint = chartPoints[0];
  if (!firstPoint) return "";
  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  if (chartPoints.length === 1) return path;

  if (chartPoints.length === 2) {
    const lastPoint = chartPoints[1];
    if (!lastPoint) return path;

    const control1X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.42;
    const control2X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.78;

    return `${path} C ${control1X.toFixed(2)} ${firstPoint.y.toFixed(
      2,
    )}, ${control2X.toFixed(2)} ${lastPoint.y.toFixed(2)}, ${lastPoint.x.toFixed(
      2,
    )} ${lastPoint.y.toFixed(2)}`;
  }

  for (let index = 1; index < chartPoints.length - 1; index += 1) {
    const point = chartPoints[index];
    const nextPoint = chartPoints[index + 1];

    if (!point || !nextPoint) continue;

    const midX = (point.x + nextPoint.x) / 2;
    const midY = (point.y + nextPoint.y) / 2;

    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const penultimatePoint = chartPoints[chartPoints.length - 2];
  const lastPoint = chartPoints[chartPoints.length - 1];

  if (penultimatePoint && lastPoint) {
    path += ` Q ${penultimatePoint.x.toFixed(2)} ${penultimatePoint.y.toFixed(
      2,
    )}, ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
  }

  return path;
};

const VideoRetentionLineChart = ({
  currentTimeSeconds,
  durationSeconds,
  dropoff,
  retention,
  views,
}: {
  currentTimeSeconds?: number | null;
  durationSeconds?: number | null;
  dropoff?: AdminPsychologistStatistics["video"]["retention_dropoff"];
  retention: AdminPsychologistStatistics["video"]["retention"];
  views: number;
}) => {
  const chartPoints = buildVideoRetentionCurvePoints({ retention, views });
  const smoothPath = buildSmoothVideoRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { percentage: 0, position_percent: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? {
    percentage: 0,
    position_percent: 100,
  };
  const firstAreaPoint = toVideoRetentionChartPoint(
    firstChartPoint.position_percent,
    firstChartPoint.percentage,
  );
  const lastAreaPoint = toVideoRetentionChartPoint(
    lastChartPoint.position_percent,
    lastChartPoint.percentage,
  );
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(
        2,
      )} ${ADMIN_RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(
        2,
      )} ${ADMIN_RETENTION_CHART_BOTTOM} Z`
    : "";
  const playbackPositionPercent =
    durationSeconds && durationSeconds > 0 && Number.isFinite(durationSeconds)
      ? clampVideoPercent((((currentTimeSeconds ?? 0) || 0) / durationSeconds) * 100)
      : 0;
  const playbackPoint = toVideoRetentionChartPoint(playbackPositionPercent, 0);
  const progressX =
    durationSeconds && durationSeconds > 0 ? playbackPoint.x : ADMIN_RETENTION_CHART_LEFT_PADDING;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative w-full overflow-hidden rounded-[22px] bg-transparent px-1 py-2 text-left">
        <svg
          aria-label="Curva estimada de retenção do vídeo de apresentação"
          className="mx-auto h-[clamp(170px,18vw,230px)] w-full max-w-[620px] overflow-visible text-subtle"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 130"
        >
          <title>Curva contínua estimada de retenção de 100% a 0%</title>
          <defs>
            <linearGradient id="admin-video-retention-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--admin-primary)" />
              <stop offset="100%" stopColor="var(--admin-primary-hover)" />
            </linearGradient>
            <linearGradient id="admin-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="admin-video-retention-shadow"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                floodColor="var(--admin-primary)"
                floodOpacity="0.14"
                stdDeviation="1.4"
              />
            </filter>
          </defs>
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="12"
            y2="12"
          />
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="64"
            y2="64"
          />
          {areaPath ? <path d={areaPath} fill="url(#admin-video-retention-fill)" /> : null}
          <path
            d={smoothPath}
            fill="none"
            filter="url(#admin-video-retention-shadow)"
            stroke="url(#admin-video-retention-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
          />
          {durationSeconds && durationSeconds > 0 ? (
            <line
              stroke="var(--admin-primary)"
              strokeOpacity="0.45"
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
              x1={playbackPoint.x}
              x2={playbackPoint.x}
              y1="12"
              y2="122"
            />
          ) : null}
          <line
            className="stroke-border"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={progressX}
            y1="122"
            y2="122"
          />
          <circle
            className="fill-surface stroke-border"
            cx={progressX}
            cy="122"
            r="6.5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="pointer-events-none absolute right-5 top-4 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          100%
        </span>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          50%
        </span>
      </div>

      {dropoff ? (
        <div className="rounded-2xl border border-border/70 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted">
          <span className="block font-black text-foreground">Maior queda estimada</span>
          <span>{`Entre ${dropoff.from_milestone}% e ${
            dropoff.to_milestone
          }% do vídeo (${formatVideoAxisTime(
            dropoff.from_milestone,
            durationSeconds,
          )} - ${formatVideoAxisTime(dropoff.to_milestone, durationSeconds)}).`}</span>
        </div>
      ) : null}
    </div>
  );
};

const VideoSummaryMetric = ({
  compact = false,
  comparison,
  label,
  value,
}: {
  compact?: boolean;
  comparison: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/50 p-3">
    <p className="text-xs font-black text-muted">{label}</p>
    <p
      className={cn(
        "mt-1 font-black leading-none text-foreground",
        compact ? "text-xl" : "text-2xl",
      )}
    >
      {value}
    </p>
    <MetricComparisonLine className={compact ? "mt-1.5" : "mt-2"} comparison={comparison} />
  </div>
);

const StatisticsVideoCard = ({
  className,
  detail,
  statistics,
}: {
  className?: string;
  detail: AdminPsychologistDetail;
  statistics: AdminPsychologistStatistics;
}) => {
  const video = statistics.video;
  const cover = renderableImageSrc(
    video.cover_url ||
      detail.profile.content.video_cover_url ||
      detail.profile.content.cover_image_url,
  );
  const videoSrc = resolveAdminMediaUrl(video.video_url || detail.profile.content.video_url);
  const [videoCurrentTimeSeconds, setVideoCurrentTimeSeconds] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);

  const updateVideoCurrentTime = (currentTime: number) => {
    setVideoCurrentTimeSeconds(Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0);
  };

  const updateVideoDuration = (duration: number) => {
    setVideoDurationSeconds(Number.isFinite(duration) && duration > 0 ? duration : null);
  };

  return (
    <CardShell className={cn("flex flex-col p-4 sm:p-5", className)}>
      <h2 className="text-lg font-black leading-tight text-foreground">
        Análises do vídeo de apresentação
      </h2>
      <p className="mt-1 text-sm font-bold text-muted">
        Período: {statistics.period.label} · {formatDateOnly(statistics.period.from)} a{" "}
        {formatDateOnly(statistics.period.to)}
      </p>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(150px,190px)_minmax(0,1fr)_minmax(220px,280px)] xl:items-stretch">
        <div className="order-1 min-w-0">
          <div className="mx-auto aspect-[9/16] w-full max-w-[176px] overflow-hidden rounded-[1.35rem] border border-border bg-black shadow-sm xl:mx-0 xl:max-w-[190px]">
            {videoSrc ? (
              <>
                {/* biome-ignore lint/a11y/useMediaCaption: o backend ainda não expõe arquivo de legenda para o vídeo do perfil. */}
                <video
                  aria-label={`Miniplayer do vídeo de apresentação de ${detail.header.name}`}
                  className="h-full w-full bg-black object-cover"
                  controls
                  onDurationChange={(event) => updateVideoDuration(event.currentTarget.duration)}
                  onLoadedMetadata={(event) => {
                    updateVideoDuration(event.currentTarget.duration);
                    updateVideoCurrentTime(event.currentTarget.currentTime);
                  }}
                  onSeeked={(event) => updateVideoCurrentTime(event.currentTarget.currentTime)}
                  onTimeUpdate={(event) => updateVideoCurrentTime(event.currentTarget.currentTime)}
                  playsInline
                  poster={cover || undefined}
                  preload="metadata"
                  src={videoSrc}
                />
              </>
            ) : (
              <div className="grid h-full place-items-center bg-surface-muted p-4 text-center">
                {cover ? (
                  <div className="relative h-full w-full overflow-hidden rounded-2xl">
                    <Image
                      alt={`Capa do vídeo de apresentação de ${detail.header.name}`}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1280px) 190px, 176px"
                      src={cover}
                      unoptimized={isPublicAdminMediaSrc(cover)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2 text-primary">
                    <Video aria-hidden className="mx-auto h-10 w-10" />
                    <span className="text-xs font-black text-muted">Nenhum vídeo cadastrado</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="order-3 min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/40 p-3 sm:p-4 xl:order-2">
          <VideoRetentionLineChart
            currentTimeSeconds={videoCurrentTimeSeconds}
            dropoff={video.retention_dropoff}
            durationSeconds={videoDurationSeconds ?? video.duration_seconds}
            retention={video.retention}
            views={video.metrics.sessions}
          />
        </div>

        <div className="order-2 min-w-0 xl:order-3">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <VideoSummaryMetric
              comparison={video.comparisons.sessions}
              label="Visualizações"
              value={numberFormatter.format(video.metrics.sessions)}
            />
            <VideoSummaryMetric
              comparison={video.comparisons.replay_rate_percent}
              label="Taxa de replays"
              value={`${video.metrics.replay_rate_percent.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}%`}
            />
            <VideoSummaryMetric
              comparison={video.comparisons.average_retention_percent}
              label="Retenção média"
              value={`${video.metrics.average_retention_percent.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}%`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-surface-muted/30 p-3 sm:p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Ações geradas pelo vídeo
          </p>
          <p className="mt-1 text-sm font-bold text-muted">
            Interações atribuídas ao vídeo de apresentação no período selecionado.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.favorites_from_video}
            label="Favoritados pelo vídeo"
            value={numberFormatter.format(video.metrics.favorites_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.profile_accesses_from_video}
            label="Acessos ao perfil"
            value={numberFormatter.format(video.metrics.profile_accesses_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.whatsapp_clicks_from_video}
            label="Cliques no WhatsApp"
            value={numberFormatter.format(video.metrics.whatsapp_clicks_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.shares_from_video}
            label="Compartilhamentos"
            value={numberFormatter.format(video.metrics.shares_from_video)}
          />
        </div>
      </div>
    </CardShell>
  );
};

const formatTrafficNullableCount = (value: number | null) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

const PsychologistTrafficSourcesCard = ({
  statistics,
}: {
  statistics: AdminPsychologistStatistics;
}) => {
  const traffic = statistics.traffic_sources;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {"Origem do tr\u00e1fego"}
          </p>
          <h2 className="mt-2 text-lg font-black text-foreground">
            {"Canais que levam pacientes at\u00e9 o perfil"}
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {"Per\u00edodo: "}
            {statistics.period.label} {"\u00b7"} {formatDateOnly(statistics.period.from)} a{" "}
            {formatDateOnly(statistics.period.to)}
          </p>
        </div>
        {traffic.updated_at ? (
          <Badge className="bg-surface-muted text-muted">
            {"Atualizado em "}
            {formatDateOnly(traffic.updated_at)}
          </Badge>
        ) : null}
      </div>

      {!traffic.unavailable_reason && traffic.attribution_unavailable_reason ? (
        <p className="mt-5 rounded-2xl border border-dashed border-primary/20 bg-primary-soft/30 p-4 text-sm font-bold leading-6 text-muted">
          {traffic.attribution_unavailable_reason}
        </p>
      ) : null}

      <div className="mt-5 hidden overflow-hidden rounded-[1.35rem] border border-border/70 md:block">
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(110px,0.75fr)_minmax(92px,0.55fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>{"Fonte"}</span>
          <span className="text-center">{"Visualiza\u00e7\u00f5es de perfil"}</span>
          <span className="text-center">{"WhatsApp"}</span>
        </div>
        <div className="divide-y divide-border">
          {traffic.sources.map((source) => (
            <div
              className="grid grid-cols-[minmax(0,1.25fr)_minmax(110px,0.75fr)_minmax(92px,0.55fr)] items-center gap-3 px-4 py-4"
              key={source.id}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-foreground">{source.label}</p>
                  {source.badge === "primary_source" ? (
                    <Badge className="bg-primary-soft text-primary">{"Principal origem"}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {source.description}
                </p>
              </div>
              <p className="text-center text-lg font-black text-foreground">
                {numberFormatter.format(source.profile_views)}
              </p>
              <p className="text-center text-lg font-black text-foreground">
                {formatTrafficNullableCount(source.whatsapp_clicks)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {traffic.sources.map((source) => (
          <article
            className="rounded-[1.35rem] border border-border/70 bg-surface-muted p-4"
            key={source.id}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-foreground">{source.label}</h3>
                {source.badge === "primary_source" ? (
                  <Badge className="bg-primary-soft text-primary">{"Principal origem"}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{source.description}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["Perfil", numberFormatter.format(source.profile_views)],
                ["WhatsApp", formatTrafficNullableCount(source.whatsapp_clicks)],
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-surface p-3" key={label}>
                  <p className="text-[0.68rem] font-black text-muted">{label}</p>
                  <p className="mt-1 text-base font-black text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </CardShell>
  );
};

const PsychologistPlatformUsageCard = ({
  statistics,
}: {
  statistics: AdminPsychologistStatistics;
}) => {
  const usage = statistics.platform_usage;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Uso da plataforma</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            Período: {statistics.period.label} · {formatDateOnly(usage.period_from)} a{" "}
            {formatDateOnly(usage.period_to)}
          </p>
        </div>
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

      {usage.unavailable_reason ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          {usage.unavailable_reason}
        </p>
      ) : (
        <div className="mt-5">
          <h3 className="text-sm font-black text-foreground">Páginas mais acessadas</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {usage.top_pages.map((page) => (
              <div className="rounded-2xl border border-border/70 p-3" key={page.label}>
                <div className="flex items-center justify-between gap-3 text-xs font-black">
                  <span className="text-muted">{page.label}</span>
                  <span className="text-foreground">
                    {numberFormatter.format(page.count)} · {page.percentage.toLocaleString("pt-BR")}
                    %
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
        </div>
      )}
    </CardShell>
  );
};

const StatisticsTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const [businessStatisticsSelectedPeriod, setBusinessStatisticsSelectedPeriod] =
    useState<StatisticsPeriodValue>("week");
  const [businessStatisticsAppliedPeriod, setBusinessStatisticsAppliedPeriod] =
    useState<StatisticsPeriodValue>("week");
  const [businessStatisticsDraftRange, setBusinessStatisticsDraftRange] =
    useState<StatisticsCustomRange>(() =>
      getStatisticsRangeForPeriod("week", detail.header.created_at),
    );
  const [businessStatisticsAppliedRange, setBusinessStatisticsAppliedRange] =
    useState<StatisticsCustomRange>(() =>
      getStatisticsRangeForPeriod("week", detail.header.created_at),
    );
  const [businessStatisticsRangeError, setBusinessStatisticsRangeError] = useState<string | null>(
    null,
  );
  const [communityStatisticsSelectedPeriod, setCommunityStatisticsSelectedPeriod] =
    useState<StatisticsPeriodValue>("week");
  const [communityStatisticsAppliedPeriod, setCommunityStatisticsAppliedPeriod] =
    useState<StatisticsPeriodValue>("week");
  const [communityStatisticsDraftRange, setCommunityStatisticsDraftRange] =
    useState<StatisticsCustomRange>(() =>
      getStatisticsRangeForPeriod("week", detail.header.created_at),
    );
  const [communityStatisticsAppliedRange, setCommunityStatisticsAppliedRange] =
    useState<StatisticsCustomRange>(() =>
      getStatisticsRangeForPeriod("week", detail.header.created_at),
    );
  const [communityStatisticsRangeError, setCommunityStatisticsRangeError] = useState<string | null>(
    null,
  );
  const [communityStatisticsSelectedCommunity, setCommunityStatisticsSelectedCommunity] =
    useState("all");
  const businessStatisticsPeriodQuery = useMemo(
    () =>
      buildStatisticsPeriodQuery(businessStatisticsAppliedPeriod, businessStatisticsAppliedRange),
    [businessStatisticsAppliedPeriod, businessStatisticsAppliedRange],
  );
  const communityStatisticsPeriodQuery = useMemo(
    () => ({
      ...buildStatisticsPeriodQuery(
        communityStatisticsAppliedPeriod,
        communityStatisticsAppliedRange,
      ),
      ...(communityStatisticsSelectedCommunity !== "all"
        ? { community: communityStatisticsSelectedCommunity }
        : {}),
    }),
    [
      communityStatisticsAppliedPeriod,
      communityStatisticsAppliedRange,
      communityStatisticsSelectedCommunity,
    ],
  );
  const businessStatisticsQuery = useAdminPsychologistStatistics(id, businessStatisticsPeriodQuery);
  const communityStatisticsQuery = useAdminPsychologistStatistics(
    id,
    communityStatisticsPeriodQuery,
  );
  const [visibleBusinessMetricIds, setVisibleBusinessMetricIds] = useState<BusinessChartMetricId[]>(
    () => BUSINESS_CHART_METRICS.map((item) => item.id),
  );
  const [visibleCommunityMetricIds, setVisibleCommunityMetricIds] = useState<
    CommunityChartMetricId[]
  >(() => COMMUNITY_CHART_METRICS.map((item) => item.id));
  const availableBusinessMetricIds = useMemo<BusinessChartMetricId[]>(() => {
    const availableIds = new Set(
      (businessStatisticsQuery.data?.business.cards ?? [])
        .filter((metric) => metric.available)
        .map((metric) => metric.id),
    );
    const ids = BUSINESS_CHART_METRICS.filter((item) => availableIds.has(item.id)).map(
      (item) => item.id,
    );

    return ids.length > 0 ? ids : BUSINESS_CHART_METRICS.map((item) => item.id);
  }, [businessStatisticsQuery.data?.business.cards]);
  const availableCommunityMetricIds = useMemo<CommunityChartMetricId[]>(() => {
    const availableIds = new Set(
      (communityStatisticsQuery.data?.community.cards ?? [])
        .filter((metric) => metric.available)
        .map((metric) => metric.id),
    );
    const ids = COMMUNITY_CHART_METRICS.filter((item) => availableIds.has(item.id)).map(
      (item) => item.id,
    );

    return ids.length > 0 ? ids : COMMUNITY_CHART_METRICS.map((item) => item.id);
  }, [communityStatisticsQuery.data?.community.cards]);
  const businessStatisticsErrorMessage = businessStatisticsQuery.error
    ? resolveApiError(businessStatisticsQuery.error)
    : null;
  const communityStatisticsErrorMessage = communityStatisticsQuery.error
    ? resolveApiError(communityStatisticsQuery.error)
    : null;
  const isInitialStatisticsLoading =
    (businessStatisticsQuery.isLoading && !businessStatisticsQuery.data) ||
    (communityStatisticsQuery.isLoading && !communityStatisticsQuery.data);
  const isBusinessRefreshing =
    businessStatisticsQuery.isFetching && Boolean(businessStatisticsQuery.data);
  const isCommunityRefreshing =
    communityStatisticsQuery.isFetching && Boolean(communityStatisticsQuery.data);
  const handleBusinessStatisticsPeriodChange = (period: StatisticsPeriodPreset) => {
    const nextRange = getStatisticsRangeForPeriod(period, detail.header.created_at);
    setBusinessStatisticsRangeError(null);
    setBusinessStatisticsSelectedPeriod(period);
    setBusinessStatisticsAppliedPeriod(period);
    setBusinessStatisticsDraftRange(nextRange);
    setBusinessStatisticsAppliedRange(nextRange);
  };
  const handleBusinessStatisticsDateChange = (
    field: keyof StatisticsCustomRange,
    value: string,
  ) => {
    setBusinessStatisticsRangeError(null);
    setBusinessStatisticsSelectedPeriod("custom");
    setBusinessStatisticsDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const commitBusinessStatisticsRange = () => {
    if (businessStatisticsSelectedPeriod !== "custom") return;

    if (!isValidStatisticsRange(businessStatisticsDraftRange)) {
      setBusinessStatisticsRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setBusinessStatisticsRangeError(null);
    setBusinessStatisticsAppliedPeriod("custom");
    setBusinessStatisticsAppliedRange(businessStatisticsDraftRange);
  };
  const handleBusinessStatisticsDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitBusinessStatisticsRange();
    }, 0);
  };
  const handleCommunityStatisticsPeriodChange = (period: StatisticsPeriodPreset) => {
    const nextRange = getStatisticsRangeForPeriod(period, detail.header.created_at);
    setCommunityStatisticsRangeError(null);
    setCommunityStatisticsSelectedPeriod(period);
    setCommunityStatisticsAppliedPeriod(period);
    setCommunityStatisticsDraftRange(nextRange);
    setCommunityStatisticsAppliedRange(nextRange);
  };
  const handleCommunityStatisticsDateChange = (
    field: keyof StatisticsCustomRange,
    value: string,
  ) => {
    setCommunityStatisticsRangeError(null);
    setCommunityStatisticsSelectedPeriod("custom");
    setCommunityStatisticsDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const commitCommunityStatisticsRange = () => {
    if (communityStatisticsSelectedPeriod !== "custom") return;

    if (!isValidStatisticsRange(communityStatisticsDraftRange)) {
      setCommunityStatisticsRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setCommunityStatisticsRangeError(null);
    setCommunityStatisticsAppliedPeriod("custom");
    setCommunityStatisticsAppliedRange(communityStatisticsDraftRange);
  };
  const handleCommunityStatisticsDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitCommunityStatisticsRange();
    }, 0);
  };

  if (isInitialStatisticsLoading) {
    return <EngagementLoadingState />;
  }
  if (
    businessStatisticsQuery.isError &&
    businessStatisticsErrorMessage &&
    !businessStatisticsQuery.data
  ) {
    return (
      <ErrorState
        message={businessStatisticsErrorMessage}
        onRetry={() => {
          void businessStatisticsQuery.refetch();
          void communityStatisticsQuery.refetch();
        }}
      />
    );
  }
  if (
    communityStatisticsQuery.isError &&
    communityStatisticsErrorMessage &&
    !communityStatisticsQuery.data
  ) {
    return (
      <ErrorState
        message={communityStatisticsErrorMessage}
        onRetry={() => {
          void businessStatisticsQuery.refetch();
          void communityStatisticsQuery.refetch();
        }}
      />
    );
  }
  if (!businessStatisticsQuery.data || !communityStatisticsQuery.data) return null;

  const businessStatistics = businessStatisticsQuery.data;
  const communityStatistics = communityStatisticsQuery.data;
  const businessMetricMap = new Map(
    businessStatistics.business.cards.map((metric) => [metric.id, metric]),
  );
  const communityMetricMap = new Map(
    communityStatistics.community.cards.map((metric) => [metric.id, metric]),
  );
  const businessCards = BUSINESS_CHART_METRICS.flatMap((config) => {
    const metric = businessMetricMap.get(config.id);

    return metric ? [{ config, metric }] : [];
  });
  const communityCards = COMMUNITY_CHART_METRICS.flatMap((config) => {
    const metric = communityMetricMap.get(config.id);

    return metric ? [{ config, metric }] : [];
  });
  const communityRankingMetric = communityMetricMap.get("ranking");
  const communityFilterOptions = [
    { id: "all", label: "Todas" },
    ...communityStatistics.community.communities.map((community) => ({
      id: community.id,
      label: community.name,
    })),
  ];
  const visibleBusinessChartKeys = businessCards
    .filter(
      ({ config, metric }) => visibleBusinessMetricIds.includes(config.id) && metric.available,
    )
    .map(({ config }) => config);
  const visibleCommunityChartKeys = communityCards
    .filter(
      ({ config, metric }) => visibleCommunityMetricIds.includes(config.id) && metric.available,
    )
    .map(({ config }) => config);
  const toggleBusinessMetric = (metricId: BusinessChartMetricId) => {
    const metric = businessMetricMap.get(metricId);
    if (!metric?.available) return;

    setVisibleBusinessMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      const hasAnotherAvailable = next.some((item) => availableBusinessMetricIds.includes(item));

      return hasAnotherAvailable ? next : current;
    });
  };
  const toggleCommunityMetric = (metricId: CommunityChartMetricId) => {
    const metric = communityMetricMap.get(metricId);
    if (!metric?.available) return;

    setVisibleCommunityMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      const hasAnotherAvailable = next.some((item) => availableCommunityMetricIds.includes(item));

      return hasAnotherAvailable ? next : current;
    });
  };

  return (
    <div className="space-y-5" data-psychologist-detail-tab="estatisticas">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black text-foreground">Estatísticas de negócio</h2>
          {isBusinessRefreshing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              Atualizando
            </span>
          ) : null}
        </div>
        <StatisticsPeriodControls
          idPrefix="business-statistics"
          onDateControlsBlur={handleBusinessStatisticsDateControlsBlur}
          onDateChange={handleBusinessStatisticsDateChange}
          onPeriodChange={handleBusinessStatisticsPeriodChange}
          period={businessStatisticsSelectedPeriod}
          range={businessStatisticsDraftRange}
          rangeError={businessStatisticsRangeError}
        />
      </div>

      <section aria-busy={isBusinessRefreshing} className="grid gap-5">
        <CardShell className="min-w-0 p-5">
          <fieldset className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <legend className="sr-only">Contadores exibidos no gráfico</legend>
            {businessCards.map(({ config, metric }) => (
              <StatisticsMetricToggleCard
                active={visibleBusinessMetricIds.includes(config.id) && metric.available}
                config={config}
                key={config.id}
                metric={metric}
                onToggle={() => toggleBusinessMetric(config.id)}
              />
            ))}
          </fieldset>

          <StatisticsSeriesChart
            keys={visibleBusinessChartKeys}
            points={businessStatistics.business.series}
          />
        </CardShell>

        <StatisticsVideoCard detail={detail} statistics={businessStatistics} />

        <PsychologistTrafficSourcesCard statistics={businessStatistics} />

        <PsychologistPlatformUsageCard statistics={businessStatistics} />
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="relative min-h-16 min-w-0">
          <h2 className="text-xl font-black text-foreground">Estatísticas de comunidade</h2>
          <span
            aria-hidden={!isCommunityRefreshing}
            className={cn(
              "absolute left-0 top-8 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary transition-opacity duration-150",
              isCommunityRefreshing ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Loader2
              aria-hidden
              className={cn("h-3.5 w-3.5", isCommunityRefreshing ? "animate-spin" : "")}
            />
            Atualizando
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end lg:flex-nowrap lg:justify-end">
          <label
            className="grid gap-1 text-xs font-black text-muted"
            htmlFor="community-statistics-community"
          >
            Comunidade
            <span className="relative">
              <select
                className="h-10 min-w-[210px] appearance-none rounded-2xl border border-border bg-surface py-0 pl-3 pr-11 text-sm font-black text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="community-statistics-community"
                onChange={(event) => setCommunityStatisticsSelectedCommunity(event.target.value)}
                value={communityStatisticsSelectedCommunity}
              >
                {communityFilterOptions.map((option) => (
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
          <StatisticsPeriodControls
            idPrefix="community-statistics"
            onDateControlsBlur={handleCommunityStatisticsDateControlsBlur}
            onDateChange={handleCommunityStatisticsDateChange}
            onPeriodChange={handleCommunityStatisticsPeriodChange}
            period={communityStatisticsSelectedPeriod}
            range={communityStatisticsDraftRange}
            rangeError={communityStatisticsRangeError}
          />
        </div>
      </div>

      <section aria-busy={isCommunityRefreshing} className="grid gap-5">
        <CardShell className="p-5">
          <fieldset className="grid min-w-0 grid-cols-8 gap-2">
            <legend className="sr-only">Contadores de comunidade</legend>
            {communityCards.map(({ config, metric }) => (
              <StatisticsMetricToggleCard
                active={visibleCommunityMetricIds.includes(config.id) && metric.available}
                config={config}
                key={config.id}
                metric={metric}
                onToggle={() => toggleCommunityMetric(config.id)}
              />
            ))}
            {communityRankingMetric ? (
              <StatisticsStaticMetricCard
                icon={Trophy}
                iconClassName="text-amber-500"
                iconToneClassName="bg-amber-50"
                metric={communityRankingMetric}
              />
            ) : null}
          </fieldset>

          <StatisticsSeriesChart
            keys={visibleCommunityChartKeys}
            points={communityStatistics.community.series}
          />
        </CardShell>
      </section>
    </div>
  );
};

const PublicationWhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
    />
  </svg>
);

const publicationMetricOrder: (keyof AdminPsychologistPublicationItem["metrics"])[] = [
  "views",
  "upvotes",
  "downvotes",
  "comments",
  "saves",
  "shares",
  "whatsapp_clicks",
  "reports",
];

const publicationMetricIcon: Partial<
  Record<keyof AdminPsychologistPublicationItem["metrics"], LucideIcon>
> = {
  comments: MessageCircle,
  downvotes: ArrowDown,
  reports: AlertTriangle,
  saves: Bookmark,
  shares: Share2,
  upvotes: ArrowUp,
  views: Eye,
};

const publicationMetricLabel: Record<keyof AdminPsychologistPublicationItem["metrics"], string> = {
  comments: "comentários",
  downvotes: "downvotes",
  reports: "denúncias",
  saves: "salvos",
  shares: "compartilhamentos",
  upvotes: "upvotes",
  views: "visualizações",
  whatsapp_clicks: "cliques WhatsApp",
};

const PublicationMedia = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  if (!item.media) return null;

  const src = item.media.url;
  const mediaType = item.media.type?.toLowerCase() ?? "";
  const isVideo = mediaType.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(src ?? "");
  const imageSrc = !isVideo ? renderableImageSrc(src) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(src) : null;
  const looksLikeImage =
    mediaType.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(src ?? "");
  const mediaLabel = isVideo ? "Miniplayer de vídeo publicado" : "Miniatura de mídia publicada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40 sm:w-28 sm:max-w-none" : "h-24 sm:h-28 sm:w-28",
      )}
    >
      {imageSrc && looksLikeImage ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="112px"
          src={imageSrc}
          unoptimized={isPublicAdminMediaSrc(imageSrc)}
        />
      ) : null}
      {videoSrc ? (
        <video
          aria-label={mediaLabel}
          className="h-full w-full object-cover"
          controls
          muted
          playsInline
          preload="metadata"
          src={videoSrc}
        />
      ) : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          {item.type === "post" ? (
            <FileText aria-hidden className="mx-auto h-5 w-5" />
          ) : (
            <MessageCircle aria-hidden className="mx-auto h-5 w-5" />
          )}
          <span>Mídia publicada</span>
        </div>
      ) : null}
    </div>
  );
};

const PublicationMetric = ({ metric }: { metric: AdminPsychologistPublicationMetric }) => {
  const Icon =
    publicationMetricIcon[metric.id as keyof AdminPsychologistPublicationItem["metrics"]] ??
    BarChart3;
  const label =
    publicationMetricLabel[metric.id as keyof AdminPsychologistPublicationItem["metrics"]] ??
    metric.label.toLowerCase();
  const displayValue = formatEngagementMetricValue(metric);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={metric.available ? metric.source : (metric.unavailable_reason ?? metric.source)}
    >
      {metric.id === "whatsapp_clicks" ? (
        <PublicationWhatsAppIcon aria-hidden />
      ) : (
        <Icon aria-hidden className="h-4 w-4" />
      )}
      {metric.available ? `${displayValue} ${label}` : `${label}: ${displayValue}`}
    </span>
  );
};

const PublicationItemHeader = ({ item }: { item: AdminPsychologistPublicationItem }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="bg-surface-muted text-muted">
      {item.type === "post" ? "Post" : "Resposta"}
    </Badge>
    <span className="text-xs font-bold text-muted">{formatDateTime(item.created_at)}</span>
  </div>
);

const PublicationCommunityIdentity = ({
  className,
  item,
}: {
  className?: string;
  item: AdminPsychologistPublicationItem;
}) => {
  const avatarSrc = renderableImageSrc(item.community.avatar_url);
  const fallbackStyle =
    !avatarSrc && item.community.color ? { backgroundColor: item.community.color } : undefined;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border text-xs font-black",
          avatarSrc ? "bg-surface-muted text-primary" : "bg-primary-soft text-primary",
          fallbackStyle ? "text-white" : null,
        )}
        style={fallbackStyle}
      >
        {avatarSrc ? (
          <Image
            alt={`Avatar da comunidade ${item.community.name}`}
            className="object-cover"
            fill
            sizes="40px"
            src={avatarSrc}
            unoptimized={isPublicAdminMediaSrc(avatarSrc)}
          />
        ) : (
          initials(item.community.name)
        )}
      </div>
      <div className="min-w-0">
        <span className="block truncate text-sm font-black text-foreground">
          {item.community.name}
        </span>
      </div>
    </div>
  );
};

const PublicationItemBody = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const hasText = item.excerpt.trim().length > 0;
  const showTitle = item.type === "post";

  return (
    <div className="min-w-0">
      {showTitle ? <h3 className="text-base font-black text-foreground">{item.title}</h3> : null}
      <p className={cn("text-sm leading-6 text-muted", showTitle && "mt-2")}>
        {hasText ? item.excerpt : "Sem texto."}
      </p>
    </div>
  );
};

const PublicationItemMain = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const mediaTextGridClass = cn(
    "mt-3 grid min-w-0 gap-3",
    item.media && "sm:grid-cols-[112px_1fr]",
  );

  return (
    <div className="min-w-0">
      <PublicationItemHeader item={item} />
      <PublicationCommunityIdentity className="mt-3" item={item} />
      <div className={mediaTextGridClass}>
        <PublicationMedia item={item} />
        <PublicationItemBody item={item} />
      </div>
    </div>
  );
};

const PublicationMetrics = ({ item }: { item: AdminPsychologistPublicationItem }) => (
  <div className="mt-4 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
      {publicationMetricOrder.map((metricId) => {
        const metric = item.metrics[metricId];

        return <PublicationMetric key={metric.id} metric={metric} />;
      })}
    </div>
  </div>
);

const publicationRemovalTargetType = (item: AdminPsychologistPublicationItem) =>
  item.type === "post" ? "post" : "comment";

const PublicationRemoveForm = ({
  item,
  onCancel,
  onRemoved,
}: {
  item: AdminPsychologistPublicationItem;
  onCancel: () => void;
  onRemoved: () => void;
}) => {
  const mutation = useAdminCommunityRemoveContent(item.community.slug);
  const form = useForm<PublicationRemoveFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(publicationRemoveSchema),
  });

  const onSubmit = async (values: PublicationRemoveFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
        },
        targetId: item.id,
        targetType: publicationRemovalTargetType(item),
      });
      toast.success("Publicação removida com auditoria administrativa.");
      form.reset();
      onRemoved();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="mt-3 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-3"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <p className="text-sm font-black text-danger">Remoção administrativa de publicação</p>
          <p className="mt-1 text-xs leading-5 text-danger">
            A ação remove o {item.type === "post" ? "post" : "comentário"} na comunidade{" "}
            {item.community.name} e registra auditoria real.
          </p>
        </div>
        <TextareaController<PublicationRemoveFormValues>
          label="Motivo interno obrigatório"
          name="reason"
          required
          rows={3}
        />
        <InputController<PublicationRemoveFormValues>
          label="Confirmação forte"
          name="confirmation"
          placeholder={PUBLICATION_REMOVE_CONFIRMATION}
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-danger px-4 text-xs font-black text-white disabled:opacity-70"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Remover publicação
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const PublicationsPagination = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page <= 1}
      onClick={() => setPage(Math.max(1, page - 1))}
      type="button"
    >
      <ChevronLeft aria-hidden className="h-4 w-4" />
    </button>
    {Array.from({ length: Math.min(5, pages) }, (_, index) => {
      const start = Math.min(Math.max(page - 2, 1), Math.max(pages - 4, 1));
      const itemPage = start + index;
      if (itemPage > pages) return null;

      return (
        <button
          className={cn(
            "h-10 min-w-10 rounded-control border px-3 text-sm font-black",
            itemPage === page
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-foreground",
          )}
          key={itemPage}
          onClick={() => setPage(itemPage)}
          type="button"
        >
          {itemPage}
        </button>
      );
    })}
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page >= pages}
      onClick={() => setPage(Math.min(pages, page + 1))}
      type="button"
    >
      <ChevronRight aria-hidden className="h-4 w-4" />
    </button>
  </div>
);

const PublicationFilterSelect = ({
  children,
  id,
  onChange,
  value,
}: {
  children: ReactNode;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <span className="relative mt-2 block">
    <select
      className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      id={id}
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
);

const PublicationsTab = ({ createdAt, id }: { createdAt: string; id: string }) => {
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [type, setType] = useState<AdminPsychologistPublicationsQuery["type"]>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<PublicationsPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<PublicationsPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<PublicationsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<PublicationsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedRemoval, setSelectedRemoval] = useState<AdminPsychologistPublicationItem | null>(
    null,
  );
  const customRangeIsValid = isValidStatisticsRange(draftRange);
  const queryInput = useMemo<AdminPsychologistPublicationsQuery>(
    () => ({
      community: community === "all" ? undefined : community,
      from: appliedPeriod === "custom" ? appliedRange.from : undefined,
      limit: 5,
      page,
      period: appliedPeriod,
      q: q || undefined,
      to: appliedPeriod === "custom" ? appliedRange.to : undefined,
      type,
    }),
    [appliedPeriod, appliedRange.from, appliedRange.to, community, page, q, type],
  );
  const query = useAdminPsychologistPublications(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;
  const closeRemoval = () => setSelectedRemoval(null);
  const resetToFirstPage = () => {
    closeRemoval();
    setPage(1);
  };
  const handlePageChange = (nextPage: number) => {
    closeRemoval();
    setPage(nextPage);
  };
  const handlePeriodChange = (period: PublicationsPeriodValue) => {
    setSelectedPeriod(period);
    setRangeError(null);
    resetToFirstPage();

    if (period === "custom") {
      if (!customRangeIsValid) {
        setRangeError(
          "Informe um período personalizado completo, com data inicial menor ou igual à final.",
        );
        return;
      }

      setAppliedPeriod("custom");
      setAppliedRange(draftRange);
      return;
    }

    const nextRange = getStatisticsRangeForPeriod(period, createdAt);

    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setAppliedPeriod(period);
  };
  const handleCustomDateChange = (field: keyof PublicationsCustomRange, value: string) => {
    const nextRange = { ...draftRange, [field]: value };

    setSelectedPeriod("custom");
    setDraftRange(nextRange);
    resetToFirstPage();

    if (!isValidStatisticsRange(nextRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(nextRange);
  };

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const publications = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="publicacoes">
      <CardShell className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr_0.75fr_0.9fr_0.8fr_0.8fr]">
          <label className="block text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
                onChange={(event) => {
                  setQ(event.target.value);
                  resetToFirstPage();
                }}
                placeholder="Título ou conteúdo"
                type="search"
                value={q}
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-community">
            Comunidade
            <PublicationFilterSelect
              id="publications-community"
              onChange={(value) => {
                setCommunity(value);
                resetToFirstPage();
              }}
              value={community}
            >
              <option value="all">Todas</option>
              {publications.filters.communities.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-type">
            Tipo
            <PublicationFilterSelect
              id="publications-type"
              onChange={(value) => {
                setType(value as AdminPsychologistPublicationsQuery["type"]);
                resetToFirstPage();
              }}
              value={type ?? "all"}
            >
              {publications.filters.types.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-period">
            Período
            <PublicationFilterSelect
              id="publications-period"
              onChange={(value) => handlePeriodChange(value as PublicationsPeriodValue)}
              value={selectedPeriod}
            >
              {PUBLICATIONS_PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              max={draftRange.to}
              onChange={(event) => handleCustomDateChange("from", event.target.value)}
              type="date"
              value={draftRange.from ?? ""}
            />
          </label>
          <label className="block text-sm font-black text-muted">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              min={draftRange.from}
              onChange={(event) => handleCustomDateChange("to", event.target.value)}
              type="date"
              value={draftRange.to ?? ""}
            />
          </label>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </CardShell>

      <CardShell className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Publicações</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(publications.data.length)} de{" "}
              {numberFormatter.format(publications.count)} registros.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {publications.data.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
              Nenhuma publicação real encontrada para os filtros atuais.
            </p>
          ) : null}
          {publications.data.map((item) => {
            const selected = selectedRemoval?.id === item.id && selectedRemoval.type === item.type;

            return (
              <article
                className="rounded-2xl border border-border bg-surface p-4"
                key={`${item.type}-${item.id}`}
              >
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <PublicationItemMain item={item} />
                  <div className="flex justify-end gap-2 lg:flex-col">
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
                    <button
                      aria-label={selected ? "Fechar exclusão" : "Excluir publicação"}
                      aria-pressed={selected}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-danger/20 text-danger transition hover:bg-danger/10"
                      onClick={() => setSelectedRemoval(selected ? null : item)}
                      title={selected ? "Fechar exclusão" : "Excluir"}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      <span className="sr-only">
                        {selected ? "Fechar exclusão" : "Excluir publicação"}
                      </span>
                    </button>
                  </div>
                </div>
                <PublicationMetrics item={item} />
                {selected ? (
                  <PublicationRemoveForm
                    item={item}
                    onCancel={closeRemoval}
                    onRemoved={() => {
                      closeRemoval();
                      void query.refetch();
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-5">
          <PublicationsPagination
            page={publications.page}
            pages={publications.pages}
            setPage={handlePageChange}
          />
        </div>
      </CardShell>
    </div>
  );
};

const ratingStarValues = [1, 2, 3, 4, 5] as const;

const RatingStars = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => (
  <span
    aria-label={`${rating} de 5 estrelas`}
    className="inline-flex items-center gap-1"
    role="img"
  >
    {ratingStarValues.map((star) => (
      <Star
        aria-hidden
        className={cn(
          size,
          star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border",
        )}
        key={star}
      />
    ))}
  </span>
);

const SmallAvatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = renderableImageSrc(src);

  if (imageSrc) {
    return (
      <Image
        alt={name}
        className="h-12 w-12 rounded-full object-cover"
        height={48}
        src={imageSrc}
        unoptimized={isPublicAdminMediaSrc(imageSrc)}
        width={48}
      />
    );
  }

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
      {initials(name)}
    </span>
  );
};

const ReviewsTab = ({ id }: { id: string }) => {
  const [rating, setRating] = useState("all");
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPsychologistReviewsQuery>(
    () => ({
      limit: 5,
      page,
      rating: rating === "all" ? undefined : Number(rating),
    }),
    [page, rating],
  );
  const query = useAdminPsychologistReviews(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reviews = query.data;
  const maxDistribution = Math.max(1, ...reviews.summary.distribution.map((item) => item.count));
  const ratingFilterLabel =
    rating === "all" ? null : `${rating} estrela${rating === "1" ? "" : "s"}`;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="avaliacoes">
      <CardShell className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Avaliação geral
            </h2>
          </div>
          {ratingFilterLabel ? (
            <button
              className="self-start rounded-full bg-primary-soft px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:self-auto"
              onClick={() => {
                setRating("all");
                setPage(1);
              }}
              type="button"
            >
              Ver todas as avaliações
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[160px_1fr] lg:items-center">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-muted/50 p-5">
            <p className="text-6xl font-semibold tracking-[-0.06em] text-foreground">
              {reviews.summary.rating_avg.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              })}
            </p>
            <div className="mt-2">
              <RatingStars rating={reviews.summary.rating_avg} size="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium leading-5 text-muted">
              {numberFormatter.format(reviews.summary.rating_count)} avaliações reais
            </p>
          </div>
          <div className="w-full space-y-1.5">
            {reviews.summary.distribution.map((item) => {
              const isSelected = rating === String(item.rating);

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "grid w-full grid-cols-[88px_1fr_36px] items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-primary/30 sm:grid-cols-[104px_1fr_40px]",
                    isSelected ? "bg-primary-soft" : "bg-transparent",
                  )}
                  key={item.rating}
                  onClick={() => {
                    setRating(isSelected ? "all" : String(item.rating));
                    setPage(1);
                  }}
                  type="button"
                >
                  <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                    {item.rating} estrelas
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-primary/90"
                      style={{ width: `${(item.count / maxDistribution) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-sm font-semibold text-muted">
                    {numberFormatter.format(item.count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Avaliações e depoimentos
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-muted">
              Mostrando {numberFormatter.format(reviews.data.length)} de{" "}
              {numberFormatter.format(reviews.count)} avaliações
              {ratingFilterLabel ? ` com ${ratingFilterLabel}` : " filtradas"}.
            </p>
          </div>
        </div>

        {reviews.data.length === 0 ? (
          <p className="p-5 text-sm font-medium text-muted">
            Nenhuma avaliação real encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {reviews.data.map((item: AdminPsychologistReviewItem) => (
              <article className="p-5 sm:p-6" key={item.id}>
                <div className="flex gap-4">
                  <SmallAvatar name={item.author.name} src={item.author.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                        {item.author.name}
                      </h3>
                      <span className="text-xs font-medium text-muted">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <RatingStars rating={item.rating} />
                    </div>
                    <p className="mt-3 text-[15px] font-medium leading-7 text-foreground">
                      {item.comment || "Avaliação sem comentário textual."}
                    </p>
                    {item.response ? (
                      <div className="mt-4 rounded-2xl border border-primary/10 bg-primary-soft/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          Resposta do psicólogo · {formatDate(item.responded_at)}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                          {item.response}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="border-t border-border p-4">
          <PublicationsPagination page={reviews.page} pages={reviews.pages} setPage={setPage} />
        </div>
      </CardShell>
    </div>
  );
};

const reportCardIcon: Record<"all" | "dismissed" | "pending" | "total" | "upheld", LucideIcon> = {
  all: Info,
  dismissed: CheckCircle2,
  pending: AlertTriangle,
  total: AlertTriangle,
  upheld: ShieldCheck,
};

type ReportPeriodValue = "30d" | "90d" | "180d" | "custom";
type ReportPeriodPreset = Exclude<ReportPeriodValue, "custom">;
type ReportDateRange = {
  from: string;
  to: string;
};

const REPORT_PERIOD_OPTIONS: { id: ReportPeriodPreset; label: string }[] = [
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
];

const getReportRangeForPeriod = (preset: ReportPeriodPreset): ReportDateRange => {
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

type ReportModerationAction = "dismiss" | "uphold";
type ReportModerationState = {
  action: ReportModerationAction;
  report: AdminPsychologistReportItem;
} | null;

const ReportModerationDialog = ({
  id,
  onClose,
  state,
}: {
  id: string;
  onClose: () => void;
  state: NonNullable<ReportModerationState>;
}) => {
  const title =
    state.action === "dismiss" ? "Resolver como improcedente" : "Resolver como procedente";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-surface p-5 shadow-admin-soft sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              Denúncias e moderação
            </p>
            <h3 className="mt-1 text-xl font-black text-foreground">{title}</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-muted">
              {state.report.content.type === "post" ? "Post" : "Resposta"} em{" "}
              {state.report.content.community.name}: {state.report.content.title}
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">
          {state.action === "dismiss" ? (
            <ReportDismissForm id={id} onClose={onClose} report={state.report} />
          ) : (
            <ReportUpholdForm id={id} onClose={onClose} report={state.report} />
          )}
        </div>
      </div>
    </div>
  );
};

const ReportDismissForm = ({
  id,
  onClose,
  report,
}: {
  id: string;
  onClose: () => void;
  report: AdminPsychologistReportItem;
}) => {
  const mutation = useAdminPsychologistResolveReport(id);
  const form = useForm<ReportDismissFormValues>({
    defaultValues: { confirmation: "", reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(reportDismissSchema),
  });

  const onSubmit: SubmitHandler<ReportDismissFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation.trim().toUpperCase(),
          reason: values.reason.trim(),
          resolution: "dismissed",
        },
        reportId: report.id,
      });
      form.reset();
      toast.success("Denúncia resolvida como improcedente.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">
          Esta ação encerra a denúncia como improcedente e não altera o conteúdo denunciado.
        </div>
        <TextareaController<ReportDismissFormValues>
          disabled={mutation.isPending}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que a denúncia foi considerada improcedente."
          required
          rows={4}
        />
        <InputController<ReportDismissFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder={REPORT_DISMISS_CONFIRMATION}
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-muted transition hover:bg-surface-muted"
            disabled={mutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-success bg-surface px-4 text-sm font-black text-success transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 aria-hidden className="h-4 w-4" />
            )}
            Resolver como improcedente
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const ReportUpholdForm = ({
  id,
  onClose,
  report,
}: {
  id: string;
  onClose: () => void;
  report: AdminPsychologistReportItem;
}) => {
  const mutation = useAdminPsychologistResolveReport(id);
  const measureOptions = report.capabilities.can_remove_content
    ? [
        { label: "Remover conteúdo denunciado", value: "remove_content" },
        { label: "Manter conteúdo sem alteração", value: "none" },
      ]
    : [{ label: "Manter conteúdo sem alteração", value: "none" }];
  const form = useForm<ReportUpholdFormValues>({
    defaultValues: {
      confirmation: "",
      measure: report.capabilities.can_remove_content ? "remove_content" : "none",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(reportUpholdSchema),
  });

  const onSubmit: SubmitHandler<ReportUpholdFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation.trim().toUpperCase(),
          measure: values.measure,
          reason: values.reason.trim(),
          resolution: "upheld",
        },
        reportId: report.id,
      });
      form.reset();
      toast.success(
        values.measure === "remove_content"
          ? "Denúncia procedente. Conteúdo removido."
          : "Denúncia resolvida como procedente.",
      );
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-800">
          {report.content.available
            ? "Se a medida for remover, o conteúdo sairá das listagens públicas. Esta ação não notifica nem aplica sanções de conta automaticamente."
            : (report.content.unavailable_reason ??
              "O conteúdo denunciado já está indisponível. A denúncia pode ser encerrada como procedente sem nova remoção.")}
        </div>
        <SelectController<ReportUpholdFormValues>
          disabled={mutation.isPending}
          label="Medida"
          name="measure"
          options={measureOptions}
          required
        />
        <TextareaController<ReportUpholdFormValues>
          disabled={mutation.isPending}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que a denúncia foi considerada procedente."
          required
          rows={4}
        />
        <InputController<ReportUpholdFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder={REPORT_UPHOLD_CONFIRMATION}
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-muted transition hover:bg-surface-muted"
            disabled={mutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck aria-hidden className="h-4 w-4" />
            )}
            Resolver como procedente
          </button>
        </div>
      </form>
    </FormProvider>
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

const ReportsTab = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("90d");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("90d"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("90d"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<AdminPsychologistReportsQuery["type"]>("all");
  const [status, setStatus] = useState<AdminPsychologistReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const [moderationState, setModerationState] = useState<ReportModerationState>(null);
  const queryInput = useMemo<AdminPsychologistReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 5,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const query = useAdminPsychologistReports(id, queryInput);
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

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reports = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="denuncias">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.cards.map((card) => {
          const Icon = reportCardIcon[card.id === "total" ? "total" : card.id];

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
              setType(nextValue as AdminPsychologistReportsQuery["type"]);
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
              setStatus(nextValue as AdminPsychologistReportsQuery["status"]);
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
                max={draftRange.to}
                onChange={(event) => handleReportDateChange("from", event.target.value)}
                type="date"
                value={draftRange.from}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={draftRange.from}
                onChange={(event) => handleReportDateChange("to", event.target.value)}
                type="date"
                value={draftRange.to}
              />
            </label>
          </div>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Denúncias recebidas</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(reports.data.length)} de{" "}
              {numberFormatter.format(reports.count)} denúncias filtradas.
            </p>
          </div>
          <Badge className="bg-primary-soft text-primary">Moderação auditada</Badge>
        </div>

        {reports.data.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma denúncia real encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {reports.data.map((item: AdminPsychologistReportItem) => (
              <article className="grid gap-4 p-4 xl:grid-cols-[1fr_220px]" key={item.id}>
                <div className="flex gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                    <AlertTriangle aria-hidden className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-surface-muted text-muted">
                        {item.content.type === "post" ? "Post" : "Resposta"}
                      </Badge>
                      <ReportStatusBadge group={item.status_group} label={item.status_label} />
                      <span className="text-xs font-bold text-muted">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-black text-foreground">{item.content.title}</h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-muted">
                      {item.content.excerpt}
                    </p>
                    <p className="mt-2 text-sm font-black text-foreground">
                      Motivo: {item.reason_label}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm font-bold leading-6 text-muted">
                        Descrição: {item.description}
                      </p>
                    ) : null}
                    {item.content.available && item.content.public_url ? (
                      <a
                        className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary"
                        href={toPublicHref(item.content.public_url)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ver detalhes
                        <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <p className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
                        {item.content.unavailable_reason ??
                          "Conteúdo indisponível nas listagens públicas."}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="rounded-2xl bg-surface-muted p-4 text-sm">
                  <div>
                    <dt className="font-black text-muted">Denunciado por</dt>
                    <dd className="mt-1 font-black text-foreground">{item.reported_by.label}</dd>
                  </div>
                  <div className="mt-4">
                    <dt className="font-black text-muted">Comunidade</dt>
                    <dd className="mt-1 font-black text-foreground">
                      {item.content.community.name}
                    </dd>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <dt className="font-black text-muted">Moderação</dt>
                    <dd className="mt-3 grid gap-2">
                      {item.capabilities.can_resolve_dismissed ? (
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-success/30 bg-emerald-50 px-3 py-2 text-xs font-black text-success transition hover:bg-emerald-100"
                          onClick={() => setModerationState({ action: "dismiss", report: item })}
                          type="button"
                        >
                          <CheckCircle2 aria-hidden className="h-4 w-4" />
                          Improcedente
                        </button>
                      ) : null}
                      {item.capabilities.can_resolve_upheld ? (
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-danger/30 bg-red-50 px-3 py-2 text-xs font-black text-danger transition hover:bg-red-100"
                          onClick={() => setModerationState({ action: "uphold", report: item })}
                          type="button"
                        >
                          <ShieldCheck aria-hidden className="h-4 w-4" />
                          Procedente
                        </button>
                      ) : null}
                      {!item.capabilities.can_resolve_dismissed &&
                      !item.capabilities.can_resolve_upheld ? (
                        <span className="rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-muted">
                          Denúncia já encerrada.
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        <div className="border-t border-border p-4">
          <PublicationsPagination page={reports.page} pages={reports.pages} setPage={setPage} />
        </div>
      </CardShell>

      {moderationState ? (
        <ReportModerationDialog
          id={id}
          onClose={() => setModerationState(null)}
          state={moderationState}
        />
      ) : null}
    </div>
  );
};

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
  const queryInput = useMemo<AdminPsychologistActivitiesQuery>(
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
  const query = useAdminPsychologistActivities(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const activities = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="atividades">
      <CardShell className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <DetailFilterSelect
            className="flex-1"
            label="Período"
            onChange={(nextValue) => {
              setPeriod(nextValue);
              setPage(1);
            }}
            value={period}
          >
            <option value="all">Todo histórico registrado</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="180d">Últimos 180 dias</option>
            <option value="custom">Personalizado</option>
          </DetailFilterSelect>
          <DetailFilterSelect
            className="flex-1"
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
            className="flex-1"
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
          <label className="block flex-1 text-sm font-black text-muted">
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
        </div>

        {period === "custom" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-black text-muted">
              De
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                onChange={(event) => {
                  setCustomFrom(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customFrom}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                onChange={(event) => {
                  setCustomTo(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customTo}
              />
            </label>
          </div>
        ) : null}
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
            <table className="w-full min-w-[720px] text-left text-sm">
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
          <PublicationsPagination
            page={activities.page}
            pages={activities.pages}
            setPage={setPage}
          />
        </div>
      </CardShell>
    </div>
  );
};

const booleanBadge = (value: boolean, labels: { false: string; true: string }) => (
  <Badge className={value ? "bg-emerald-50 text-success" : "bg-orange-50 text-orange-700"}>
    {value ? labels.true : labels.false}
  </Badge>
);

const AccountUnavailableNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
    {children}
  </div>
);

const ACCOUNT_STATUS_BADGE_CLASS: Record<AdminPsychologistAccount["account_status"], string> = {
  active: "bg-primary-soft text-primary",
  deactivated: "bg-surface-muted text-muted",
  deleted: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
};

const AccountSummaryCard = ({ account }: { account: AdminPsychologistAccount }) => (
  <InfoCard icon={ShieldCheck} title="Resumo da conta">
    <dl className="divide-y divide-border">
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
      <FieldRow label="Último acesso" value={formatDateTime(account.last_access_at)} />
      <FieldRow
        label="Sessões ativas"
        value={`${numberFormatter.format(account.sessions.active_count)} sessão(ões) em ${numberFormatter.format(
          account.sessions.devices_count,
        )} dispositivo(s)`}
      />
    </dl>
  </InfoCard>
);

const AccountChangeEmailForm = ({
  account,
  id,
}: {
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistChangeAccountEmail(id);
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
          placeholder="ALTERAR EMAIL"
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSendEmailConfirmation(id);
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSendPasswordReset(id);
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSetTemporaryPassword(id);
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
      toast.success("Senha temporária definida. O psicólogo deverá trocá-la no próximo login.");
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
          troca obrigatória no próximo login do psicólogo.
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
          placeholder="ALTERAR SENHA"
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistRevokeSessions(id);
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
      toast.success("Sessões do psicólogo encerradas.");
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
          placeholder="ENCERRAR SESSOES"
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
    canRun: (account: AdminPsychologistAccount) => boolean;
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
      "Ação administrativa reversível por decisão futura: bloqueia login, encerra sessões e remove o perfil da descoberta pública.",
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
      "Ação permanente: aplica soft delete, anonimiza dados da conta, remove o perfil público e encerra sessões. Não cancela cobrança ativa em gateway.",
    icon: AlertTriangle,
    schema: accountDeleteSchema,
    successMessage: "Conta excluída. Retornando para a lista de psicólogos.",
    title: "Excluir conta",
  },
  suspend: {
    blockedMessage: "A conta já está suspensa ou não pode receber esta ação.",
    buttonClassName: "bg-danger px-4 text-white hover:bg-danger/90",
    buttonLabel: "Suspender conta",
    canRun: (account) => account.capabilities.can_suspend_account,
    confirmation: "SUSPENDER CONTA",
    description:
      "Ação punitiva/operacional temporária: bloqueia login, encerra sessões e remove o perfil da descoberta pública sem apagar dados.",
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
  account: AdminPsychologistAccount;
  id: string;
  kind: AccountStatusActionKind;
  onDeleted?: () => void;
}) => {
  const config = ACCOUNT_STATUS_ACTION_CONFIG[kind];
  const suspendMutation = useAdminPsychologistSuspendAccount(id);
  const deactivateMutation = useAdminPsychologistDeactivateAccount(id);
  const deleteMutation = useAdminPsychologistDeleteAccount(id);
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
      if (kind === "delete") {
        onDeleted?.();
      }
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
  const query = useAdminPsychologistAccount(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const account = query.data;
  const googleOnly = account.provider === "google" && !account.has_password;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="conta">
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

        <InfoCard icon={Mail} title="E-mail da conta">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
              Alterar e-mail exige nova confirmação, envia e-mail transacional real quando
              configurado e encerra sessões do psicólogo.
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
        <InfoCard icon={KeyRound} title="Senha e recuperação">
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

        <InfoCard icon={ShieldCheck} title="Sessões e segurança">
          <div className="grid gap-4">
            <dl className="divide-y divide-border">
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

      <InfoCard icon={AlertTriangle} title="Ações da conta">
        <div className="grid gap-5">
          <dl className="divide-y divide-border">
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
              onDeleted={() => router.push("/psicologos/lista")}
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

const PaymentHistoryBadge = ({
  status,
  label,
}: {
  label: string;
  status: AdminPsychologistBilling["payment_history"]["items"][number]["status"];
}) => {
  const className =
    status === "pago"
      ? "bg-emerald-50 text-success"
      : status === "recusado" || status === "cancelado"
        ? "bg-red-50 text-danger"
        : status === "pendente"
          ? "bg-orange-50 text-orange-700"
          : "bg-surface-muted text-muted";

  return <Badge className={className}>{label}</Badge>;
};

const BillingLoadingState = () => (
  <div className="grid gap-5 xl:grid-cols-2" data-psychologist-billing-loading="true">
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-96 animate-pulse bg-surface-muted xl:col-span-2")} />
  </div>
);

const isCurrentCourtesyPlan = (billing: AdminPsychologistBilling) =>
  billing.plan.is_courtesy || billing.plan.source === "admin_grant" || billing.courtesy.can_revoke;

const CurrentPlanCard = ({
  billing,
  detail,
}: {
  billing: AdminPsychologistBilling;
  detail: AdminPsychologistDetail;
}) => {
  const plan = billing.plan;
  const isCourtesy = isCurrentCourtesyPlan(billing);
  const planTitle = isCourtesy ? "Plano de cortesia" : plan.plan_name || "Sem plano ativo";
  const planPrice = isCourtesy ? "R$ 0,00/mês" : formatPlanPrice(plan.price_cents, plan.interval);
  const planEndLabel = isCourtesy ? "Fim" : "Próxima renovação";
  const hasSubscription = Boolean(plan.id);
  const planEndValue = isCurrentFreePlan(billing)
    ? "Não se aplica"
    : formatDate(plan.current_period_end);
  const lifetimeValue = plan.lifetime_value_available
    ? formatMoney(plan.lifetime_value_cents ?? 0)
    : "Indisponível";

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Plano atual</h2>
        </div>
        <IconCircle icon={Wallet} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-primary-soft/60 p-4">
        <p className="text-lg font-black text-foreground">{planTitle}</p>
        {planPrice ? <p className="mt-1 text-sm font-bold text-muted">{planPrice}</p> : null}
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        <FieldRow label="Inicio" value={formatDate(plan.started_at)} />
        <FieldRow
          label="Tempo até assinatura"
          value={detail.general.subscription.time_to_first_paid_subscription.label}
        />
        <FieldRow label={planEndLabel} value={planEndValue} />
        {hasSubscription ? (
          <>
            <FieldRow
              label="Mensalidades"
              value={numberFormatter.format(plan.paid_installments_count)}
            />
            <FieldRow
              label="Lifetime Value (LTV)"
              value={
                plan.lifetime_value_available || !plan.lifetime_value_unavailable_reason ? (
                  lifetimeValue
                ) : (
                  <span className="flex flex-col gap-1">
                    <span>{lifetimeValue}</span>
                    <span className="text-xs font-bold text-subtle">
                      {plan.lifetime_value_unavailable_reason}
                    </span>
                  </span>
                )
              }
            />
          </>
        ) : null}
      </dl>
    </CardShell>
  );
};

const ActiveCourtesyCard = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) => {
  const revokeMutation = useAdminPsychologistRevokeCourtesy(id);
  const internalNote = billing.plan.grant_notes?.trim() || null;

  const onRevoke = async () => {
    const confirmed = window.confirm("Confirmar revogação da cortesia deste psicólogo?");
    if (!confirmed) return;

    try {
      await revokeMutation.mutateAsync();
      toast.success("Cortesia revogada com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Cortesia ativa</h2>
          <p className="mt-1 text-sm text-muted">
            Dados usados para a concessão administrativa vigente.
          </p>
        </div>
        <IconCircle icon={Gift} />
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        <FieldRow label="Regional CRP" value={billing.courtesy.regional_crp || "Não informado"} />
        <FieldRow
          label="CRP"
          value={billing.courtesy.registration_number || billing.courtesy.crp || "Não informado"}
        />
        <FieldRow
          label="Data inscrição CRP"
          value={formatDate(billing.courtesy.crp_registration_date)}
        />
        <FieldRow label="Concedida por" value={formatGrantedByName(billing.plan.granted_by)} />
        <FieldRow
          label="Nota interna"
          value={
            internalNote ? (
              <span className="whitespace-pre-line">{internalNote}</span>
            ) : (
              "Não informada"
            )
          }
        />
      </dl>

      <button
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
        disabled={!billing.courtesy.can_revoke || revokeMutation.isPending}
        onClick={() => void onRevoke()}
        type="button"
      >
        {revokeMutation.isPending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle aria-hidden className="h-4 w-4" />
        )}
        Revogar cortesia
      </button>
    </CardShell>
  );
};
const PaymentMethodCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-foreground">Forma de pagamento</h2>
        <p className="mt-1 text-sm text-muted">Somente brand, final e validade quando existirem.</p>
      </div>
      <IconCircle icon={CreditCard} />
    </div>

    <div className="mt-5 rounded-[1.5rem] border border-border bg-surface-muted p-4">
      {billing.payment_method ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-foreground">
              {formatPaymentMethod(billing.payment_method)}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">
              Gateway: {billing.payment_method.gateway}
            </p>
          </div>
          <Badge className="bg-emerald-50 text-success">Mascarado</Badge>
        </div>
      ) : (
        <p className="text-sm font-bold text-muted">
          Nenhuma forma de pagamento real vinculada foi encontrada para exibicao segura.
        </p>
      )}
    </div>

    <p className="mt-4 text-xs font-bold text-subtle">
      O endpoint nao retorna credenciais do gateway nem dados sensiveis do cartao.
    </p>
  </CardShell>
);

const PaymentHistoryCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5 xl:col-span-2">
    <h2 className="text-xl font-black text-foreground">Histórico de pagamentos</h2>

    {!billing.payment_history.available ? (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {billing.payment_history.reason ||
          "Histórico financeiro indisponível para este psicólogo no momento."}
      </div>
    ) : (
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">Descricao</th>
              <th className="px-3 py-3 font-black">Valor</th>
              <th className="px-3 py-3 font-black">Metodo</th>
              <th className="px-3 py-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {billing.payment_history.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-3 font-bold text-muted">{formatDate(item.occurred_at)}</td>
                <td className="px-3 py-3">
                  <p className="font-black text-foreground">{item.title}</p>
                  <p className="text-xs font-bold text-muted">{item.description}</p>
                </td>
                <td className="px-3 py-3 font-black text-foreground">
                  {formatMoney(item.amount_cents)}
                </td>
                <td className="px-3 py-3 font-bold text-muted">{item.gateway}</td>
                <td className="px-3 py-3">
                  <PaymentHistoryBadge label={item.status_label} status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

const CourtesyGrantForm = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) => {
  const mutation = useAdminPsychologistGrantCourtesy(id);
  const [pendingCourtesyValues, setPendingCourtesyValues] = useState<CourtesyFormValues | null>(
    null,
  );
  const form = useForm<CourtesyFormValues>({
    defaultValues: {
      cpf: formatCpfInput(billing.courtesy.cpf),
      crp: billing.courtesy.registration_number || billing.courtesy.crp || "",
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      regional_crp: billing.courtesy.regional_crp || "",
    },
    mode: "onSubmit",
    resolver: zodResolver(courtesyDetailsSchema),
  });
  const confirmationForm = useForm<CourtesyConfirmationFormValues>({
    defaultValues: {
      confirmation: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(courtesyConfirmationSchema),
  });
  const disabled = !billing.courtesy.can_grant || mutation.isPending;
  const regionalOptions = useMemo(
    () => createCrpRegionSelectOptions(billing.courtesy.regional_crp),
    [billing.courtesy.regional_crp],
  );

  useEffect(() => {
    form.reset({
      cpf: formatCpfInput(billing.courtesy.cpf),
      crp: billing.courtesy.registration_number || billing.courtesy.crp || "",
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      regional_crp: billing.courtesy.regional_crp || "",
    });
    confirmationForm.reset({ confirmation: "" });
  }, [billing.courtesy, confirmationForm, form]);

  const onSubmit: SubmitHandler<CourtesyFormValues> = async (values) => {
    confirmationForm.reset({ confirmation: "" });
    setPendingCourtesyValues(values);
  };

  const onConfirmSubmit: SubmitHandler<CourtesyConfirmationFormValues> = async (values) => {
    if (!pendingCourtesyValues) return;

    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        cpf: normalizeCpfInput(pendingCourtesyValues.cpf),
        crp: pendingCourtesyValues.crp.trim(),
        crp_registration_date: pendingCourtesyValues.crp_registration_date.trim(),
        notes: pendingCourtesyValues.notes.trim(),
        period_days: Number(pendingCourtesyValues.period_days),
        regional_crp: pendingCourtesyValues.regional_crp.trim(),
      });
      confirmationForm.reset({ confirmation: "" });
      setPendingCourtesyValues(null);
      toast.success("Cortesia concedida com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const closeConfirmationModal = () => {
    if (mutation.isPending) return;

    confirmationForm.reset({ confirmation: "" });
    setPendingCourtesyValues(null);
  };
  const pendingPeriodLabel = pendingCourtesyValues
    ? (billing.courtesy.period_options.find(
        (option) => String(option.days) === pendingCourtesyValues.period_days,
      )?.label ?? `${pendingCourtesyValues.period_days} dias`)
    : null;

  return (
    <>
      <CardShell className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground">Conceder cortesia</h2>
          </div>
          <IconCircle icon={Gift} />
        </div>

        {billing.courtesy.blocked_reason ? (
          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-800">
            {billing.courtesy.blocked_reason}
          </div>
        ) : null}

        <FormProvider {...form}>
          <form className="mt-5 space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectController<CourtesyFormValues>
                disabled={disabled}
                label="Regional CRP"
                name="regional_crp"
                options={regionalOptions}
                required
              />
              <InputController<CourtesyFormValues>
                autoComplete="off"
                disabled={disabled}
                label="CRP"
                name="crp"
                placeholder="Numero do registro"
                required
              />
              <InputController<CourtesyFormValues>
                disabled={disabled}
                label="Data inscrição CRP"
                name="crp_registration_date"
                required
                type="date"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputController<CourtesyFormValues>
                autoComplete="off"
                disabled={disabled}
                inputMode="numeric"
                label="CPF"
                maskValue={formatCpfInput}
                maxLength={14}
                name="cpf"
                placeholder="000.000.000-00"
                required
              />
              <SelectController<CourtesyFormValues>
                disabled={disabled}
                insetChevron
                label="Período de cortesia"
                name="period_days"
                options={billing.courtesy.period_options.map((option) => ({
                  label: option.label,
                  value: String(option.days),
                }))}
                required
              />
            </div>
            <TextareaController<CourtesyFormValues>
              disabled={disabled}
              label="Notas internas"
              name="notes"
              placeholder="Observações internas para auditoria"
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
                <Gift aria-hidden className="h-4 w-4" />
              )}
              Conceder cortesia
            </button>
          </form>
        </FormProvider>
      </CardShell>

      {pendingCourtesyValues ? (
        <div
          aria-labelledby="courtesy-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-surface p-5 shadow-admin-soft sm:max-w-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Confirmação forte
                </p>
                <h3
                  className="mt-1 text-xl font-black text-foreground"
                  id="courtesy-confirmation-title"
                >
                  Conceder cortesia
                </h3>
              </div>
              <button
                aria-label="Fechar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={mutation.isPending}
                onClick={closeConfirmationModal}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold leading-6 text-orange-800">
              Confira os dados de CRP inseridos. A cortesia cria acesso profissional gratuito e fica
              registrada para auditoria.
            </div>

            <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface-muted px-4 text-sm">
              <FieldRow label="Regional CRP" value={pendingCourtesyValues.regional_crp} />
              <FieldRow label="CRP" value={pendingCourtesyValues.crp} />
              <FieldRow
                label="Data inscrição CRP"
                value={formatDateOnly(pendingCourtesyValues.crp_registration_date)}
              />
              <FieldRow label="CPF" value={formatCpfInput(pendingCourtesyValues.cpf)} />
              <FieldRow label="Período de cortesia" value={pendingPeriodLabel} />
            </dl>

            <FormProvider {...confirmationForm}>
              <form
                className="mt-5 space-y-4"
                noValidate
                onSubmit={confirmationForm.handleSubmit(onConfirmSubmit)}
              >
                <InputController<CourtesyConfirmationFormValues>
                  autoComplete="off"
                  disabled={mutation.isPending}
                  label={`Digite ${COURTESY_GRANT_CONFIRMATION} para confirmar`}
                  name="confirmation"
                  placeholder={COURTESY_GRANT_CONFIRMATION}
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={mutation.isPending}
                    onClick={closeConfirmationModal}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
                    disabled={mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? (
                      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift aria-hidden className="h-4 w-4" />
                    )}
                    Confirmar concessão
                  </button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      ) : null}
    </>
  );
};

const isCurrentProfessionalPlan = (billing: AdminPsychologistBilling) => {
  const planSlug = billing.plan.plan_slug?.trim().toLowerCase();
  const planName = billing.plan.plan_name?.trim().toLowerCase();

  return Boolean(
    billing.plan.id &&
      !billing.plan.is_courtesy &&
      !billing.courtesy.can_revoke &&
      (billing.plan.is_paid || planSlug === "profissional" || planName === "plano profissional"),
  );
};

const isCurrentFreePlan = (billing: AdminPsychologistBilling) => {
  const planSlug = billing.plan.plan_slug?.trim().toLowerCase();
  const planName = billing.plan.plan_name?.trim().toLowerCase();

  return Boolean(
    billing.plan.id &&
      !billing.plan.is_courtesy &&
      !billing.courtesy.can_revoke &&
      !billing.plan.is_paid &&
      (planSlug === "gratuito" || planName === "plano gratuito" || billing.plan.price_cents === 0),
  );
};

const CourtesyActionCard = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) =>
  billing.plan.is_courtesy ||
  billing.courtesy.can_revoke ||
  isCurrentProfessionalPlan(billing) ? null : (
    <CourtesyGrantForm billing={billing} id={id} />
  );

const PlanBillingTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const query = useAdminPsychologistBilling(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <BillingLoadingState />;

  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) return null;

  const showActiveCourtesy = isCurrentCourtesyPlan(query.data);
  const showCourtesyBesidePlan = showActiveCourtesy || isCurrentFreePlan(query.data);

  return (
    <div className="space-y-5" data-psychologist-detail-tab="plano">
      <div className="grid gap-5 xl:grid-cols-2">
        <CurrentPlanCard billing={query.data} detail={detail} />
        {showActiveCourtesy ? (
          <ActiveCourtesyCard billing={query.data} id={id} />
        ) : showCourtesyBesidePlan ? (
          <CourtesyActionCard billing={query.data} id={id} />
        ) : (
          <PaymentMethodCard billing={query.data} />
        )}
        {!showCourtesyBesidePlan ? <CourtesyActionCard billing={query.data} id={id} /> : null}
        <PaymentHistoryCard billing={query.data} />
      </div>
    </div>
  );
};

const registryVerificationBadge = (registry: AdminPsychologistRegistryVerification) => (
  <Badge
    className={REGISTRY_VERIFICATION_TONE[registry.summary.status] ?? "bg-surface-muted text-muted"}
  >
    {registry.summary.approval_label}
  </Badge>
);

const RegistryAttemptItem = ({
  attempt,
}: {
  attempt: AdminPsychologistRegistryVerificationAttempt;
}) => (
  <li className="rounded-2xl border border-border bg-surface-muted/50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-black text-foreground">{attempt.result_label}</p>
        <p className="text-xs font-bold text-muted">
          {attempt.source_label} · {formatDateTime(attempt.checked_at)}
        </p>
      </div>
      <Badge
        className={attempt.found ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted"}
      >
        {attempt.found ? "Ativo" : "Inativo"}
      </Badge>
    </div>
    <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
      <span>
        CRP:{" "}
        {[attempt.regional_crp, attempt.registration_number].filter(Boolean).join(" / ") ||
          "Não informado"}
      </span>
    </div>
    {attempt.responsible_admin ? (
      <p className="mt-2 text-xs font-bold text-muted">
        Responsável:{" "}
        {[attempt.responsible_admin.name, attempt.responsible_admin.email]
          .filter(Boolean)
          .join(" · ") || "Admin Lectum"}
      </p>
    ) : null}
    {attempt.notes || attempt.reason ? (
      <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold leading-5 text-muted">
        {attempt.notes || attempt.reason}
      </p>
    ) : null}
  </li>
);

const RegistryVerificationDialog = ({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) => {
  const dialog = (
    <div
      aria-modal="true"
      className="admin-premium-pilot fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
    >
      <div className="w-full rounded-t-[32px] border border-border bg-surface p-5 shadow-admin sm:max-w-[54rem] sm:rounded-[32px] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Verificação profissional
            </p>
            <h3 className="mt-1 text-2xl font-black text-foreground">{title}</h3>
          </div>
          <button
            aria-label="Fechar"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-control transition hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
};

const RegistryIdentityForm = ({
  canApprove,
  canReject,
  onApprove,
  onReject,
  onSave,
  registry,
}: {
  canApprove: boolean;
  canReject: boolean;
  onApprove: (values: RegistryIdentityFormValues) => void;
  onReject: () => void;
  onSave: (values: RegistryIdentityFormValues) => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const form = useForm<RegistryIdentityFormValues>({
    defaultValues: {
      crp: registry.identity.registration_number || "",
      crp_registration_date: formatInputDate(registry.identity.crp_registration_date),
      regional_crp: registry.identity.regional_crp || "",
    },
    mode: "onSubmit",
    resolver: zodResolver(registryIdentitySchema),
  });
  const regionalOptions = useMemo(
    () => createCrpRegionSelectOptions(registry.identity.regional_crp),
    [registry.identity.regional_crp],
  );

  useEffect(() => {
    form.reset({
      crp: registry.identity.registration_number || "",
      crp_registration_date: formatInputDate(registry.identity.crp_registration_date),
      regional_crp: registry.identity.regional_crp || "",
    });
  }, [form, registry.identity]);

  const actionButtonCount = 1 + Number(canApprove) + Number(canReject);
  const actionGridClassName = cn(
    "grid gap-3",
    actionButtonCount === 2 ? "sm:grid-cols-2" : "",
    actionButtonCount >= 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "",
  );

  const normalizeValues = (values: RegistryIdentityFormValues): RegistryIdentityFormValues => ({
    crp: values.crp.trim(),
    crp_registration_date: values.crp_registration_date.trim(),
    regional_crp: values.regional_crp.trim(),
  });

  const onSubmit: SubmitHandler<RegistryIdentityFormValues> = (values) => {
    const normalizedValues = normalizeValues(values);
    onSave(normalizedValues);
  };

  const onApproveSubmit: SubmitHandler<RegistryIdentityFormValues> = (values) => {
    const normalizedValues = normalizeValues(values);
    onApprove({
      crp: normalizedValues.crp,
      crp_registration_date: normalizedValues.crp_registration_date,
      regional_crp: normalizedValues.regional_crp,
    });
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectController<RegistryIdentityFormValues>
            label="Regional CRP"
            name="regional_crp"
            options={regionalOptions}
            required
          />
          <InputController<RegistryIdentityFormValues>
            autoComplete="off"
            label="Nº CRP"
            name="crp"
            placeholder="Número do registro"
            required
          />
          <div className="sm:col-span-2">
            <InputController<RegistryIdentityFormValues>
              label="Data de inscrição no CRP"
              name="crp_registration_date"
              required
              type="date"
            />
          </div>
        </div>
        <div className={actionGridClassName}>
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={!form.formState.isDirty}
            type="submit"
          >
            Salvar registro
          </button>
          {canApprove ? (
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover"
              onClick={form.handleSubmit(onApproveSubmit)}
              type="button"
            >
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Aprovar manualmente
            </button>
          ) : null}
          {canReject ? (
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-red-50"
              onClick={onReject}
              type="button"
            >
              <AlertTriangle aria-hidden className="h-4 w-4" />
              Rejeitar verificação
            </button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
};

const RegistrySaveIdentityForm = ({
  id,
  identityDraft,
  onClose,
  registry,
}: {
  id: string;
  identityDraft: RegistryIdentityFormValues;
  onClose: () => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const mutation = useAdminPsychologistUpdateRegistryIdentity(id);
  const confirmationText = registry.actions.strong_save_confirmation;
  const form = useForm<RegistrySaveFormValues>({
    defaultValues: { confirmation: "" },
    mode: "onSubmit",
    resolver: zodResolver(registrySaveSchema),
  });

  useEffect(() => {
    form.reset({ confirmation: "" });
  }, [form]);

  const registrySummaryItems = [
    { label: "Regional CRP", value: formatNullable(identityDraft.regional_crp) },
    { label: "Nº CRP", value: formatNullable(identityDraft.crp) },
    { label: "Data de inscrição", value: formatDateOnly(identityDraft.crp_registration_date) },
  ];

  const onSubmit: SubmitHandler<RegistrySaveFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        ...identityDraft,
        confirmation: values.confirmation.trim(),
      });
      toast.success("Registro profissional atualizado.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-[28px] border border-primary/20 bg-primary-soft/70 p-4 text-sm font-bold leading-6 text-muted sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
                Registro editado
              </p>
              <p className="mt-1 text-base font-black text-foreground">
                Confirme antes de salvar a alteração do registro profissional.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-surface px-3 py-1 text-xs font-black text-primary shadow-control">
              Ação sensível
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {registrySummaryItems.map((item) => (
              <div
                className="rounded-[20px] border border-border/80 bg-surface p-4 shadow-control"
                key={item.label}
              >
                <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-base font-black text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3">
            Esta ação altera os dados públicos do conselho sem aprovar, rejeitar ou revalidar
            automaticamente o CRP. Digite <strong>{confirmationText}</strong> para continuar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
          <InputController<RegistrySaveFormValues>
            autoComplete="off"
            disabled={mutation.isPending}
            label="Confirmação forte"
            name="confirmation"
            placeholder={`Digite ${confirmationText}`}
            required
          />
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-white shadow-control transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted sm:mt-7"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Salvar registro
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const RegistryApproveForm = ({
  id,
  identityDraft,
  onClose,
  registry,
}: {
  id: string;
  identityDraft?: RegistryIdentityFormValues | null;
  onClose: () => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const mutation = useAdminPsychologistApproveRegistryVerification(id);
  const identityDefaults = useMemo(
    () => ({
      crp: identityDraft?.crp ?? registry.identity.registration_number ?? "",
      crp_registration_date:
        identityDraft?.crp_registration_date ??
        formatInputDate(registry.identity.crp_registration_date),
      regional_crp: identityDraft?.regional_crp ?? registry.identity.regional_crp ?? "",
    }),
    [
      identityDraft,
      registry.identity.crp_registration_date,
      registry.identity.regional_crp,
      registry.identity.registration_number,
    ],
  );
  const form = useForm<RegistryApproveFormValues>({
    defaultValues: {
      confirmation: "",
      cpf: formatCpfInput(registry.identity.cpf),
      crp: identityDefaults.crp,
      crp_registration_date: identityDefaults.crp_registration_date,
      regional_crp: identityDefaults.regional_crp,
      situation_confirmed: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(registryApproveSchema),
  });

  useEffect(() => {
    form.reset({
      confirmation: "",
      cpf: formatCpfInput(registry.identity.cpf),
      crp: identityDefaults.crp,
      crp_registration_date: identityDefaults.crp_registration_date,
      regional_crp: identityDefaults.regional_crp,
      situation_confirmed: "",
    });
  }, [form, identityDefaults, registry.identity.cpf]);

  const onSubmit: SubmitHandler<RegistryApproveFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim(),
        cpf: normalizeCpfInput(values.cpf),
        crp: values.crp.trim(),
        crp_registration_date: values.crp_registration_date.trim(),
        regional_crp: values.regional_crp.trim(),
        situation_confirmed: values.situation_confirmed === "sim",
      });
      toast.success("CRP aprovado manualmente.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <InputController<RegistryApproveFormValues>
            autoComplete="off"
            disabled={mutation.isPending}
            inputMode="numeric"
            label="CPF"
            maskValue={formatCpfInput}
            maxLength={14}
            name="cpf"
            placeholder="000.000.000-00"
            required
          />
        </div>
        <SelectController<RegistryApproveFormValues>
          disabled={mutation.isPending}
          label="Situação confirmada"
          name="situation_confirmed"
          options={[
            { label: "Selecione", value: "" },
            { label: "Sim, situação ativa conferida", value: "sim" },
          ]}
          required
        />
        <InputController<RegistryApproveFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder="Digite APROVAR CRP"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Aprovar manualmente
        </button>
      </form>
    </FormProvider>
  );
};

const RegistryRejectForm = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const mutation = useAdminPsychologistRejectRegistryVerification(id);
  const form = useForm<RegistryRejectFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(registryRejectSchema),
  });

  const onSubmit: SubmitHandler<RegistryRejectFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim(),
        reason: values.reason.trim(),
      });
      toast.success("Verificação rejeitada.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<RegistryRejectFormValues>
          disabled={mutation.isPending}
          label="Motivo da rejeição"
          name="reason"
          placeholder="Explique em PT-BR o motivo operacional da rejeição."
          required
          rows={5}
        />
        <InputController<RegistryRejectFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder="Digite REJEITAR CRP"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Rejeitar verificação
        </button>
      </form>
    </FormProvider>
  );
};

const RegistryVerificationCard = ({ id }: { id: string }) => {
  const [action, setAction] = useState<"approve" | "reject" | "save" | null>(null);
  const [identityDraft, setIdentityDraft] = useState<RegistryIdentityFormValues | null>(null);
  const query = useAdminPsychologistRegistryVerification(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) {
    return (
      <CardShell className="p-5">
        <div className="h-40 animate-pulse rounded-3xl bg-surface-muted" />
      </CardShell>
    );
  }

  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }

  const registry = query.data;
  if (!registry) return null;

  const emptyAttemptsText =
    registry.summary.plan_type === "cortesia" && registry.summary.source === "admin_grant"
      ? "Aprovação manual via Cortesia."
      : "Nenhuma tentativa automática ou decisão manual registrada.";

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={ShieldCheck} />
          <div>
            <h2 className="text-lg font-black text-foreground">Registro profissional</h2>
          </div>
        </div>
        {registryVerificationBadge(registry)}
      </div>

      <div className="mt-5 grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
        <RegistryIdentityForm
          canApprove={registry.actions.can_approve_manually}
          canReject={registry.actions.can_reject_manually}
          onApprove={(values) => {
            setIdentityDraft(values);
            setAction("approve");
          }}
          onReject={() => setAction("reject")}
          onSave={(values) => {
            setIdentityDraft(values);
            setAction("save");
          }}
          registry={registry}
        />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-foreground">Últimas tentativas</h3>
        {registry.latest_attempts.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            {emptyAttemptsText}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {registry.latest_attempts.slice(0, 4).map((attempt) => (
              <RegistryAttemptItem attempt={attempt} key={attempt.id} />
            ))}
          </ul>
        )}
      </div>

      {action === "save" && identityDraft ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Salvar registro">
          <RegistrySaveIdentityForm
            id={id}
            identityDraft={identityDraft}
            onClose={() => setAction(null)}
            registry={registry}
          />
        </RegistryVerificationDialog>
      ) : null}

      {action === "approve" && registry.actions.can_approve_manually ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Aprovar CRP manualmente">
          <RegistryApproveForm
            id={id}
            identityDraft={identityDraft}
            onClose={() => setAction(null)}
            registry={registry}
          />
        </RegistryVerificationDialog>
      ) : null}

      {action === "reject" && registry.actions.can_reject_manually ? (
        <RegistryVerificationDialog onClose={() => setAction(null)} title="Rejeitar verificação">
          <RegistryRejectForm id={id} onClose={() => setAction(null)} />
        </RegistryVerificationDialog>
      ) : null}
    </CardShell>
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

const isValidDateInput = (value?: string | null) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yearValue, monthValue, dayValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() >= Date.UTC(1900, 0, 1) &&
    date.getTime() <= todayTime
  );
};

const createPersonalDataSchema = (isRegistryApproved: boolean, currentCpf?: string | null) =>
  profilePersonalDataBaseSchema.superRefine((values, ctx) => {
    if (values.birthdate && !isValidDateInput(values.birthdate)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe uma data de nascimento válida.",
        path: ["birthdate"],
      });
    }

    const cpfChanged = onlyDigits(values.cpf) !== onlyDigits(currentCpf);
    if (isRegistryApproved && cpfChanged && values.confirm_cpf_change !== "sim") {
      ctx.addIssue({
        code: "custom",
        message:
          "Confirme que a alteração administrativa do CPF não revalida nem invalida o CRP automaticamente.",
        path: ["confirm_cpf_change"],
      });
    }
  });

const PersonalDataEditForm = ({
  detail,
  id,
  onCancel,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  onCancel: () => void;
}) => {
  const personal = detail.profile.personal;
  const professional = detail.profile.professional;
  const mutation = useAdminPsychologistUpdatePersonalData(id);
  const schema = useMemo(
    () => createPersonalDataSchema(professional.crp_status === "aprovado", personal.cpf),
    [personal.cpf, professional.crp_status],
  );
  const form = useForm<ProfilePersonalDataFormValues>({
    defaultValues: {
      address_city: personal.address.city || "",
      address_complement: personal.address.complement || "",
      address_district: personal.address.district || "",
      address_number: personal.address.number || "",
      address_state: personal.address.state || "",
      address_street: personal.address.street || "",
      address_zip: formatZipInput(personal.address.zip),
      birthdate: formatInputDate(personal.birthdate),
      confirm_cpf_change: "",
      cpf: formatCpfInput(personal.cpf),
      gender: professional.gender || "",
      race_color: professional.race_color || "",
      reason: "",
      religion: professional.religion || "",
      whatsapp: formatWhatsappInput(personal.phone),
    },
    mode: "onSubmit",
    resolver: zodResolver(schema),
  });
  const disabled = mutation.isPending;

  useEffect(() => {
    form.reset({
      address_city: personal.address.city || "",
      address_complement: personal.address.complement || "",
      address_district: personal.address.district || "",
      address_number: personal.address.number || "",
      address_state: personal.address.state || "",
      address_street: personal.address.street || "",
      address_zip: formatZipInput(personal.address.zip),
      birthdate: formatInputDate(personal.birthdate),
      confirm_cpf_change: "",
      cpf: formatCpfInput(personal.cpf),
      gender: professional.gender || "",
      race_color: professional.race_color || "",
      reason: "",
      religion: professional.religion || "",
      whatsapp: formatWhatsappInput(personal.phone),
    });
  }, [form, personal, professional.gender, professional.race_color, professional.religion]);

  const watchedCpf = useWatch({ control: form.control, name: "cpf" });
  const isApprovedCpfChanged =
    professional.crp_status === "aprovado" && onlyDigits(watchedCpf) !== onlyDigits(personal.cpf);

  const onSubmit: SubmitHandler<ProfilePersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        address_city: emptyToNull(values.address_city),
        address_complement: emptyToNull(values.address_complement),
        address_district: emptyToNull(values.address_district),
        address_number: emptyToNull(values.address_number),
        address_state: emptyToNull(values.address_state)?.toUpperCase() ?? null,
        address_street: emptyToNull(values.address_street),
        address_zip: emptyToNull(values.address_zip ? onlyDigits(values.address_zip) : ""),
        birthdate: emptyToNull(values.birthdate),
        confirm_cpf_change: isApprovedCpfChanged && values.confirm_cpf_change === "sim",
        cpf: emptyToNull(values.cpf ? onlyDigits(values.cpf) : ""),
        gender: emptyToNull(values.gender),
        race_color: emptyToNull(values.race_color),
        reason: values.reason.trim(),
        religion: emptyToNull(values.religion),
        whatsapp: emptyToNull(values.whatsapp ? onlyDigits(values.whatsapp) : ""),
      });
      toast.success("Dados pessoais atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="numeric"
            label="CPF"
            maskValue={formatCpfInput}
            maxLength={14}
            name="cpf"
            placeholder="000.000.000-00"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="tel"
            label="WhatsApp"
            maskValue={formatWhatsappInput}
            maxLength={20}
            name="whatsapp"
            placeholder="+55 (00) 00000-0000"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Data de nascimento"
            name="birthdate"
            type="date"
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Gênero"
            name="gender"
            options={mergeCurrentOption(GENDER_OPTIONS, professional.gender)}
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Raça/cor"
            name="race_color"
            options={mergeCurrentOption(RACE_COLOR_OPTIONS, professional.race_color)}
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Religião"
            name="religion"
            options={mergeCurrentOption(RELIGION_OPTIONS, professional.religion)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Logradouro"
            name="address_street"
            placeholder="Rua, avenida..."
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Número"
            name="address_number"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Complemento"
            name="address_complement"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Bairro"
            name="address_district"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="numeric"
            label="CEP"
            maskValue={formatZipInput}
            maxLength={9}
            name="address_zip"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Cidade"
            name="address_city"
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="UF"
            name="address_state"
            options={mergeCurrentOption(STATE_OPTIONS, personal.address.state)}
          />
        </div>
        {isApprovedCpfChanged ? (
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-bold text-orange-700">
            Alterar CPF em psicólogo aprovado não revalida nem invalida automaticamente o CRP.
            Decisões de aprovação/rejeição continuam no card Registro profissional.
          </div>
        ) : null}
        {isApprovedCpfChanged ? (
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Confirmação para alteração de CPF aprovado"
            name="confirm_cpf_change"
            options={[...CPF_CHANGE_CONFIRMATION_OPTIONS]}
          />
        ) : null}
        <TextareaController<ProfilePersonalDataFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Descreva a justificativa operacional da correção."
          required
          rows={4}
        />
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

const ProfileReadOnlyPersonalData = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const professional = detail.profile.professional;
  const personal = detail.profile.personal;

  return (
    <>
      <FieldRow label="CPF" value={formatCpfDisplay(personal.cpf)} />
      <FieldRow
        label="E-mail"
        value={
          <span className="inline-flex items-center gap-2">
            {personal.email}
            <Lock aria-label="Somente leitura" className="h-4 w-4 text-muted" />
          </span>
        }
      />
      <FieldRow label="WhatsApp" value={formatPhoneDisplay(personal.phone)} />
      <FieldRow label="Data de nascimento" value={formatDateOnly(personal.birthdate)} />
      <FieldRow label="Gênero" value={getStaticOptionLabel(GENDER_OPTIONS, professional.gender)} />
      <FieldRow
        label="Raça/cor"
        value={getStaticOptionLabel(RACE_COLOR_OPTIONS, professional.race_color)}
      />
      <FieldRow
        label="Religião"
        value={getStaticOptionLabel(RELIGION_OPTIONS, professional.religion)}
      />
      <FieldRow
        label="Endereço"
        value={
          <span className="whitespace-pre-line">{formatPersonalAddress(personal.address)}</span>
        }
      />
    </>
  );
};

const activeOrSelected = <T extends { active: boolean; id?: string; name: string; slug: string }>(
  item: T,
  selectedValues: string[],
  value: string,
) => item.active || selectedValues.includes(value);

type AdminProfessionalOption = {
  label: string;
  value: string;
};

type AdminProfessionalOptionGroup = {
  options: AdminProfessionalOption[];
  title: string;
};

const toggleSelectedValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const AdminProfessionalTagField = ({
  disabled = false,
  error,
  groups,
  label,
  onChange,
  options,
  placeholder,
  selected,
}: {
  disabled?: boolean;
  error?: string;
  groups?: AdminProfessionalOptionGroup[];
  label: string;
  onChange: (values: string[]) => void;
  options: AdminProfessionalOption[];
  placeholder: string;
  selected: string[];
}) => {
  const [open, setOpen] = useState(false);
  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.value, option] as const)),
    [options],
  );
  const selectedOptions = selected.map((value) => optionMap.get(value) ?? { label: value, value });
  const renderGroups =
    groups?.filter((group) => group.options.length > 0) ??
    (options.length > 0 ? [{ options, title: "Opções" }] : []);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <span className="mb-2 block text-sm font-black text-foreground">{label}</span>
      <div
        className={cn(
          "rounded-3xl border bg-surface p-3 shadow-sm transition",
          hasError ? "border-danger" : "border-border",
          disabled
            ? "opacity-60"
            : "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft",
        )}
      >
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary-soft px-3 py-2 text-xs font-black text-primary"
                key={option.value}
              >
                {option.label}
                <button
                  aria-label={`Remover ${option.label}`}
                  className="rounded-full p-0.5 text-primary transition hover:bg-surface"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(selected.filter((value) => value !== option.value));
                  }}
                  type="button"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm font-bold text-subtle">{placeholder}</span>
          )}
          <button
            aria-expanded={open}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted"
            disabled={disabled}
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown
              aria-hidden
              className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")}
            />
          </button>
        </div>
        {open && !disabled ? (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface-muted p-2">
            {renderGroups.length > 0 ? (
              renderGroups.map((group) => (
                <div className="py-1" key={group.title}>
                  {group.title ? (
                    <p className="px-2 py-2 text-xs font-black uppercase tracking-wide text-subtle">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="grid gap-1">
                    {group.options.map((option) => {
                      const isSelected = selected.includes(option.value);

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-bold transition",
                            isSelected
                              ? "bg-primary-soft text-primary"
                              : "text-foreground hover:bg-surface",
                          )}
                          key={option.value}
                          onClick={() => onChange(toggleSelectedValue(selected, option.value))}
                          type="button"
                        >
                          <span>{option.label}</span>
                          {isSelected ? (
                            <span className="text-xs font-black">Selecionado</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-4 text-sm font-bold text-muted">
                Nenhuma opção ativa disponível no catálogo.
              </p>
            )}
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "mt-1 block min-h-5 text-xs font-bold",
          hasError ? "text-danger" : "text-transparent",
        )}
      >
        {error || " "}
      </span>
    </div>
  );
};

const AdminProfessionalChipPicker = ({
  disabled = false,
  error,
  label,
  onChange,
  options,
  selected,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  onChange: (values: string[]) => void;
  options: AdminProfessionalOption[];
  selected: string[];
}) => {
  const hasError = Boolean(error);

  return (
    <fieldset className="w-full">
      <legend className="mb-2 text-sm font-black text-foreground">{label}</legend>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-3xl border bg-surface p-3 shadow-sm",
          hasError ? "border-danger" : "border-border",
          disabled ? "opacity-60" : "",
        )}
      >
        {options.length > 0 ? (
          options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  isSelected
                    ? "border-primary bg-primary-soft text-primary ring-1 ring-primary"
                    : "border-border bg-surface text-foreground hover:border-primary hover:text-primary",
                )}
                disabled={disabled}
                key={option.value}
                onClick={() => onChange(toggleSelectedValue(selected, option.value))}
                type="button"
              >
                {option.label}
              </button>
            );
          })
        ) : (
          <p className="px-1 py-2 text-sm font-bold text-muted">
            Nenhuma opção ativa disponível no catálogo.
          </p>
        )}
      </div>
      <span
        className={cn(
          "mt-1 block min-h-5 text-xs font-bold",
          hasError ? "text-danger" : "text-transparent",
        )}
      >
        {error || " "}
      </span>
    </fieldset>
  );
};

const ProfileProfessionalEditForm = ({
  detail,
  id,
  onCancel,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  onCancel: () => void;
}) => {
  const professional = detail.profile.professional;
  const mutation = useAdminPsychologistUpdateProfessionalData(id);
  const catalogsQuery = useAdminSettingsCatalogs();
  const form = useForm<ProfileProfessionalDataFormValues>({
    defaultValues: {
      approach_ids: professional.approaches.map((item) => item.id),
      language: professional.languages[0] || "",
      modality: professional.modality || "",
      reason: "",
      service_ids: professional.services.map((item) => item.id),
      specialty_ids: professional.specialties.map((item) => item.id),
      target_audience: professional.target_audience,
    },
    mode: "onSubmit",
    resolver: zodResolver(profileProfessionalDataSchema),
  });
  const disabled = mutation.isPending || catalogsQuery.isLoading;
  const catalogs = catalogsQuery.data;

  useEffect(() => {
    form.reset({
      approach_ids: professional.approaches.map((item) => item.id),
      language: professional.languages[0] || "",
      modality: professional.modality || "",
      reason: "",
      service_ids: professional.services.map((item) => item.id),
      specialty_ids: professional.specialties.map((item) => item.id),
      target_audience: professional.target_audience,
    });
  }, [form, professional]);

  const selected = useWatch({ control: form.control });
  const specialtyGroups = useMemo(() => {
    const selectedIds = selected.specialty_ids ?? [];

    return (catalogs?.specialty_categories ?? [])
      .map((category) => ({
        options: category.specialties
          .filter((item) => activeOrSelected(item, selectedIds, item.id))
          .map((item) => ({ label: item.name, value: item.id })),
        title: category.name,
      }))
      .filter((group) => group.options.length > 0);
  }, [catalogs?.specialty_categories, selected.specialty_ids]);
  const specialtyOptions = useMemo(
    () => specialtyGroups.flatMap((group) => group.options),
    [specialtyGroups],
  );
  const approachOptions = useMemo(() => {
    const selectedIds = selected.approach_ids ?? [];

    return (catalogs?.approaches ?? [])
      .filter((item) => activeOrSelected(item, selectedIds, item.id))
      .map((item) => ({ label: item.name, value: item.id }));
  }, [catalogs?.approaches, selected.approach_ids]);
  const serviceOptions = useMemo(() => {
    const selectedIds = selected.service_ids ?? [];

    return (catalogs?.services ?? [])
      .filter((item) => activeOrSelected(item, selectedIds, item.id))
      .map((item) => ({ label: item.name, value: item.id }));
  }, [catalogs?.services, selected.service_ids]);
  const languageOptions = useMemo(() => {
    const selectedValues = selected.language ? [selected.language] : [];

    return (catalogs?.languages ?? [])
      .filter((item) => activeOrSelected(item, selectedValues, item.name))
      .map((item) => ({ label: item.name, value: item.name }));
  }, [catalogs?.languages, selected.language]);
  const targetAudienceOptions = useMemo(() => {
    const selectedValues = selected.target_audience ?? [];

    return (catalogs?.target_audiences ?? [])
      .filter((item) => activeOrSelected(item, selectedValues, item.slug))
      .map((item) => ({ label: item.name, value: item.slug }));
  }, [catalogs?.target_audiences, selected.target_audience]);
  const catalogError = catalogsQuery.error ? resolveApiError(catalogsQuery.error) : null;

  const onSubmit: SubmitHandler<ProfileProfessionalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        approach_ids: values.approach_ids,
        languages: values.language ? [values.language] : [],
        modality: emptyToNull(values.modality) as "hibrido" | "online" | "presencial" | null,
        reason: values.reason.trim(),
        service_ids: values.service_ids,
        specialty_ids: values.specialty_ids,
        target_audience: values.target_audience,
      });
      toast.success("Dados profissionais atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {catalogError ? (
          <ErrorState message={catalogError} onRetry={() => void catalogsQuery.refetch()} />
        ) : null}
        <SelectController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          insetChevron
          label="Modalidades"
          name="modality"
          options={mergeCurrentOption(MODALITY_OPTIONS, professional.modality)}
        />
        <AdminProfessionalTagField
          disabled={disabled}
          error={form.formState.errors.specialty_ids?.message}
          groups={specialtyGroups}
          label="Especialidades"
          onChange={(values) =>
            form.setValue("specialty_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={specialtyOptions}
          placeholder="Selecione as especialidades"
          selected={selected.specialty_ids ?? []}
        />
        <AdminProfessionalTagField
          disabled={disabled}
          error={form.formState.errors.approach_ids?.message}
          label="Abordagens"
          onChange={(values) =>
            form.setValue("approach_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={approachOptions}
          placeholder="Selecione as abordagens"
          selected={selected.approach_ids ?? []}
        />
        <SelectController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          insetChevron
          label="Idiomas"
          name="language"
          options={mergeCurrentOption(
            [EMPTY_SELECT_OPTION, ...languageOptions],
            professional.languages[0],
          )}
        />
        <AdminProfessionalChipPicker
          disabled={disabled}
          error={form.formState.errors.service_ids?.message}
          label="Serviços"
          onChange={(values) =>
            form.setValue("service_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={serviceOptions}
          selected={selected.service_ids ?? []}
        />
        <AdminProfessionalChipPicker
          disabled={disabled}
          error={form.formState.errors.target_audience?.message}
          label="Público"
          onChange={(values) =>
            form.setValue("target_audience", values, { shouldDirty: true, shouldValidate: true })
          }
          options={targetAudienceOptions}
          selected={selected.target_audience ?? []}
        />
        <TextareaController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Descreva a justificativa operacional da correção profissional."
          required
          rows={3}
        />
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

const ProfileReadOnlyProfessionalData = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const professional = detail.profile.professional;
  const personal = detail.profile.personal;
  const visibilityStatus = detail.header.active ? "active" : "inactive";
  const visibilityDescription = detail.header.active
    ? "Perfil aparece para pacientes na busca pública."
    : detail.header.published
      ? "Visibilidade ativada pelo psicólogo, mas o perfil ainda não cumpre todos os critérios públicos."
      : "Visibilidade desativada pelo psicólogo.";

  return (
    <>
      <FieldRow label="Especialidades" value={listText(professional.specialties)} />
      <FieldRow label="Abordagens" value={listText(professional.approaches)} />
      <FieldRow label="Serviços" value={listText(professional.services)} />
      <FieldRow label="Público atendido" value={listText(professional.target_audience)} />
      <FieldRow label="Idiomas" value={listText(professional.languages)} />
      <FieldRow
        label="Modalidades"
        value={getStaticOptionLabel(MODALITY_OPTIONS, professional.modality)}
      />
      <FieldRow
        label="Perfil visível para pacientes"
        value={
          <span className="flex flex-col items-start gap-2">
            <Badge className={PROFILE_STATUS_COPY[visibilityStatus].className}>
              {detail.header.active ? "Sim" : "Não"}
            </Badge>
            <span className="text-xs font-bold leading-5 text-muted">{visibilityDescription}</span>
          </span>
        }
      />
      <FieldRow label="Cadastro via" value={formatNullable(personal.provider)} />
      <FieldRow label="Data cadastro Lectum" value={formatDate(detail.header.created_at)} />
    </>
  );
};

const ProfileTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const profile = detail.profile;
  const academic = profile.academic;
  const [editingSection, setEditingSection] = useState<"personal" | "professional" | null>(null);
  const hasAcademicFormation = Boolean(
    academic.title ||
      academic.institution ||
      academic.graduation_year ||
      academic.formations.length > 0,
  );
  const activeFeatures = [
    {
      enabled: profile.features.discount_first_session,
      icon: CreditCard,
      label: "Desconto 1ª sessão",
    },
    {
      enabled: profile.features.accepts_insurance,
      icon: ShieldCheck,
      label: "Aceita convênios",
    },
    {
      enabled: profile.features.social_value,
      icon: Heart,
      label: "Valor social",
    },
  ].filter((feature) => feature.enabled);

  return (
    <div className="space-y-5" data-psychologist-detail-tab="perfil">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] xl:items-start">
        <div className="space-y-5">
          <InfoCard
            action={
              editingSection === "personal" ? null : (
                <ProfileEditButton
                  disabled={editingSection === "professional"}
                  onClick={() => setEditingSection("personal")}
                />
              )
            }
            icon={UserRound}
            title="Dados pessoais"
          >
            {editingSection === "personal" ? (
              <PersonalDataEditForm
                detail={detail}
                id={id}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <ProfileReadOnlyPersonalData detail={detail} />
            )}
          </InfoCard>

          <InfoCard
            action={
              editingSection === "professional" ? null : (
                <ProfileEditButton
                  disabled={editingSection === "personal"}
                  onClick={() => setEditingSection("professional")}
                />
              )
            }
            icon={FileText}
            title="Dados profissionais"
          >
            {editingSection === "professional" ? (
              <ProfileProfessionalEditForm
                detail={detail}
                id={id}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <ProfileReadOnlyProfessionalData detail={detail} />
            )}
          </InfoCard>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={CheckCircle2} />
              <h2 className="text-lg font-black text-foreground">Selos e facilidades</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {activeFeatures.length > 0 ? (
                activeFeatures.map((feature) => (
                  <FeatureLine icon={feature.icon} key={feature.label} label={feature.label} />
                ))
              ) : (
                <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
                  Nenhum selo cadastrado.
                </p>
              )}
            </div>
          </CardShell>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Mail} />
              <h2 className="text-lg font-black text-foreground">Bio</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhuma bio cadastrada.">{profile.content.bio}</TextBlock>
            </div>
          </CardShell>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Globe2} />
              <h2 className="text-lg font-black text-foreground">Texto de apresentação</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhum texto de apresentação cadastrado.">
                {profile.content.headline}
              </TextBlock>
            </div>
          </CardShell>

          <VideoCard detail={detail} />

          <InfoCard icon={BookOpen} title="Formação & Títulos">
            {hasAcademicFormation ? (
              <>
                <FieldRow label="Título" value={formatNullable(academic.title)} />
                <FieldRow label="Instituição" value={formatNullable(academic.institution)} />
                <FieldRow
                  label="Ano de formação"
                  value={formatNullable(academic.graduation_year)}
                />
                <div className="border-b border-border py-3 last:border-0">
                  <dt className="text-sm font-black text-muted">Formações adicionais</dt>
                  <dd className="mt-2 text-sm font-bold text-foreground">
                    {academic.formations.length === 0 ? (
                      "Não informado"
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {academic.formations.map((formation) => (
                          <li key={formation}>{formation}</li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
                Nenhuma formação cadastrada.
              </div>
            )}
          </InfoCard>
        </div>

        <aside className="xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <RegistryVerificationCard id={id} />
        </aside>
      </div>
    </div>
  );
};

const Content = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  tab: ActiveTab;
}) => (
  <main className="space-y-7" data-psychologist-detail-id={id}>
    <DetailHeader detail={detail} id={id} tab={tab} />

    {tab === "perfil" ? (
      <ProfileTab detail={detail} id={id} />
    ) : tab === "plano" ? (
      <PlanBillingTab detail={detail} id={id} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} id={id} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab createdAt={detail.header.created_at} id={id} />
    ) : tab === "avaliacoes" ? (
      <ReviewsTab id={id} />
    ) : tab === "atividades" ? (
      <ActivitiesTab id={id} />
    ) : tab === "denuncias" ? (
      <ReportsTab id={id} />
    ) : tab === "conta" ? (
      <AccountTab id={id} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </main>
);

export const AdminPsychologistDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ActiveTab | null;
  const tab: ActiveTab =
    requestedTab === "perfil" ||
    requestedTab === "plano" ||
    requestedTab === "estatisticas" ||
    requestedTab === "publicacoes" ||
    requestedTab === "avaliacoes" ||
    requestedTab === "atividades" ||
    requestedTab === "denuncias" ||
    requestedTab === "conta"
      ? requestedTab
      : "geral";
  const query = useAdminPsychologistDetail(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-7">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <Content detail={query.data} id={id} tab={tab} /> : null}
      {query.isFetching && !query.isLoading ? (
        <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-black text-muted shadow-admin-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais
        </div>
      ) : null}
    </div>
  );
};
