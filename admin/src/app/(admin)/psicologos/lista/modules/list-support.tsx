import {
  Award,
  BadgePercent,
  CalendarCheck,
  HandHeart,
  type LucideIcon,
  Stethoscope,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  PsychologistsListEngagementId,
  PsychologistsListOption,
  PsychologistsListProfileConversionCategoryId,
  PsychologistsListProfileConversionEngagementQuadrantId,
  PsychologistsListQuery,
  PsychologistsListSort,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";

export const SORT_OPTIONS: Array<{ id: PsychologistsListSort; label: string }> = [
  { id: "relevance", label: "Mais relevantes" },
  { id: "rating", label: "Melhor avaliação" },
  { id: "favorites", label: "Mais favoritados" },
  { id: "whatsapp", label: "Mais cliques WhatsApp" },
  { id: "recent", label: "Cadastro recente" },
  { id: "name", label: "Nome" },
];

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const registrationDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

export const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));

export const LOADING_ROWS = [
  "loading-1",
  "loading-2",
  "loading-3",
  "loading-4",
  "loading-5",
  "loading-6",
];

export const FILTER_MODAL_CLOSE_DELAY_MS = 260;

export const SEARCH_DEBOUNCE_MS = 350;

export const FILTER_KEYS = [
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "engagement",
  "gender",
  "language",
  "modality",
  "more_experienced",
  "plan",
  "profile_status",
  "q",
  "race_color",
  "registry_status",
  "religion",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
  "profile_conversion",
  "profile_conversion_engagement",
] as const satisfies readonly (keyof PsychologistsListQuery)[];

export type FilterQueryKey = (typeof FILTER_KEYS)[number];

export const DEPRECATED_FILTER_KEYS = ["experience", "status", "verified"] as const;

export type FilterFeatureKey = Extract<
  FilterQueryKey,
  | "accepts_insurance"
  | "available_today"
  | "discount_first_session"
  | "more_experienced"
  | "social_value"
>;

export type FilterFeatureOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  name: FilterFeatureKey;
};

export const FILTER_FEATURE_OPTIONS: FilterFeatureOption[] = [
  {
    description: "Psicólogos com disponibilidade para atendimento ainda hoje.",
    icon: CalendarCheck,
    label: "Disponível hoje",
    name: "available_today",
  },
  {
    description: "Psicólogos com mais de 10 anos de experiência.",
    icon: Award,
    label: "Mais experientes",
    name: "more_experienced",
  },
  {
    description: "Psicólogos com condição especial para a primeira consulta.",
    icon: BadgePercent,
    label: "Desconto na 1ª sessão",
    name: "discount_first_session",
  },
  {
    description: "Psicólogos que atendem por planos de saúde.",
    icon: Stethoscope,
    label: "Aceita convênios",
    name: "accepts_insurance",
  },
  {
    description: "Para a população de baixa renda.",
    icon: HandHeart,
    label: "Valor social",
    name: "social_value",
  },
];

export const MODALITY_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "online", label: "Online" },
  { count: 0, id: "presencial", label: "Presencial" },
];

export const PLAN_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "professional", label: "Assinante" },
  { count: 0, id: "courtesy", label: "Cortesia" },
  { count: 0, id: "free", label: "Gratuito" },
];

export const PROFILE_STATUS_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "active", label: "Ativo" },
  { count: 0, id: "inactive", label: "Inativo" },
];

export const REGISTRY_STATUS_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "active", label: "Ativo" },
  { count: 0, id: "pending", label: "Pendente" },
];

export const PROFILE_CONVERSION_ENGAGEMENT_FILTER_OPTIONS: PsychologistsListOption[] = [
  {
    count: 0,
    id: "strong_conversion_very_engaged",
    label: "Alta conversão + muito engajado",
  },
  {
    count: 0,
    id: "strong_conversion_engaged",
    label: "Alta conversão + engajado",
  },
  {
    count: 0,
    id: "strong_conversion_low_engaged",
    label: "Alta conversão + pouco engajado",
  },
  {
    count: 0,
    id: "strong_conversion_no_engagement",
    label: "Alta conversão + sem engajamento",
  },
  {
    count: 0,
    id: "standard_conversion_very_engaged",
    label: "Conversão padrão + muito engajado",
  },
  {
    count: 0,
    id: "standard_conversion_engaged",
    label: "Conversão padrão + engajado",
  },
  {
    count: 0,
    id: "standard_conversion_low_engaged",
    label: "Conversão padrão + pouco engajado",
  },
  {
    count: 0,
    id: "standard_conversion_no_engagement",
    label: "Conversão padrão + sem engajamento",
  },
  {
    count: 0,
    id: "low_conversion_very_engaged",
    label: "Baixa conversão + muito engajado",
  },
  {
    count: 0,
    id: "low_conversion_engaged",
    label: "Baixa conversão + engajado",
  },
  {
    count: 0,
    id: "low_conversion_low_engaged",
    label: "Baixa conversão + pouco engajado",
  },
  {
    count: 0,
    id: "low_conversion_no_engagement",
    label: "Baixa conversão + sem engajamento",
  },
  {
    count: 0,
    id: "no_conversion_very_engaged",
    label: "Sem conversão + muito engajado",
  },
  {
    count: 0,
    id: "no_conversion_engaged",
    label: "Sem conversão + engajado",
  },
  {
    count: 0,
    id: "no_conversion_low_engaged",
    label: "Sem conversão + pouco engajado",
  },
  {
    count: 0,
    id: "no_conversion_no_engagement",
    label: "Sem conversão + sem engajamento",
  },
];

export const PROFILE_CONVERSION_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "strong_conversion", label: "Alta Conversão" },
  { count: 0, id: "standard_conversion", label: "Conversão Padrão" },
  { count: 0, id: "low_conversion", label: "Baixa Conversão" },
  { count: 0, id: "no_conversion", label: "Sem Conversão" },
  { count: 0, id: "insufficient_data", label: "Dados Insuficientes" },
];

export const ENGAGEMENT_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "muito_ativo", label: "Muito engajado" },
  { count: 0, id: "ativo", label: "Engajado" },
  { count: 0, id: "pouco_ativo", label: "Pouco engajado" },
  { count: 0, id: "sem_base", label: "Sem engajamento" },
];

export const listProfileConversionCategories =
  new Set<PsychologistsListProfileConversionCategoryId>(
    PROFILE_CONVERSION_FILTER_OPTIONS.map(
      (option) => option.id as PsychologistsListProfileConversionCategoryId,
    ),
  );

export const listEngagementCategories = new Set<PsychologistsListEngagementId>(
  ENGAGEMENT_FILTER_OPTIONS.map((option) => option.id as PsychologistsListEngagementId),
);

export const listProfileConversionEngagementQuadrants =
  new Set<PsychologistsListProfileConversionEngagementQuadrantId>(
    PROFILE_CONVERSION_ENGAGEMENT_FILTER_OPTIONS.map(
      (option) => option.id as PsychologistsListProfileConversionEngagementQuadrantId,
    ),
  );

export const CardShell = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

export const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

export const parseBoolean = (value: string | null) => (value === "true" ? true : undefined);

export const parseProfileConversionCategory = (
  value: string | null,
): PsychologistsListProfileConversionCategoryId | undefined =>
  value &&
  listProfileConversionCategories.has(value as PsychologistsListProfileConversionCategoryId)
    ? (value as PsychologistsListProfileConversionCategoryId)
    : undefined;

export const parseEngagementCategory = (
  value: string | null,
): PsychologistsListEngagementId | undefined =>
  value && listEngagementCategories.has(value as PsychologistsListEngagementId)
    ? (value as PsychologistsListEngagementId)
    : undefined;

export const parseProfileConversionEngagementQuadrant = (
  value: string | null,
): PsychologistsListProfileConversionEngagementQuadrantId | undefined =>
  value &&
  listProfileConversionEngagementQuadrants.has(
    value as PsychologistsListProfileConversionEngagementQuadrantId,
  )
    ? (value as PsychologistsListProfileConversionEngagementQuadrantId)
    : undefined;

export const parseQuery = (params: URLSearchParams): PsychologistsListQuery => {
  const sort = params.get("sort") as PsychologistsListSort | null;

  return {
    accepts_insurance: parseBoolean(params.get("accepts_insurance")),
    approach: params.get("approach") || undefined,
    available_today: parseBoolean(params.get("available_today")),
    city: params.get("city") || undefined,
    discount_first_session: parseBoolean(params.get("discount_first_session")),
    engagement: parseEngagementCategory(params.get("engagement")),
    gender: params.get("gender") || undefined,
    language: params.get("language") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    modality: params.get("modality") || undefined,
    more_experienced: parseBoolean(params.get("more_experienced")),
    page: parsePositiveNumber(params.get("page"), 1),
    plan: params.get("plan") || undefined,
    profile_status: params.get("profile_status") || undefined,
    q: params.get("q") || undefined,
    race_color: params.get("race_color") || undefined,
    registry_status: params.get("registry_status") || undefined,
    religion: params.get("religion") || undefined,
    service: params.get("service") || undefined,
    social_value: parseBoolean(params.get("social_value")),
    sort: sort && listSorts.has(sort) ? sort : "relevance",
    specialty: params.get("specialty") || undefined,
    state: params.get("state") || undefined,
    target_audience: params.get("target_audience") || undefined,
    profile_conversion: parseProfileConversionCategory(params.get("profile_conversion")),
    profile_conversion_engagement: parseProfileConversionEngagementQuadrant(
      params.get("profile_conversion_engagement"),
    ),
  };
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

export const formatRegistrationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return registrationDateFormatter.format(date);
};
