import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  BookOpen,
  Eye,
  FileText,
  Heart,
  type LucideIcon,
  MessageCircle,
  Search,
  Share2,
  Star,
  Trophy,
  UserRound,
  Video,
} from "lucide-react";
import type {
  AdminPsychologistEngagementMetric,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistStatistics,
  AdminPsychologistStatisticsQuery,
} from "@/api/req/psychologists";
import { capitalizeOptionLabel } from "./text";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});

export const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export const dayShortMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const TABS = [
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

export type ActiveTab = (typeof TABS)[number]["id"];

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

const getCrpRegionCode = (value?: string | null) => {
  const match = String(value ?? "").match(/\d{1,2}/);

  return match ? match[0].padStart(2, "0") : null;
};

const normalizeCrpRegionToken = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const getCrpRegionAcronyms = (value?: string | null) => {
  const suffix = String(value ?? "")
    .split(" - ")
    .at(1);
  if (!suffix) return [];

  return [suffix, ...suffix.split("/")].map(normalizeCrpRegionToken).filter(Boolean);
};

export const resolveCrpRegionFieldValue = (value?: string | null) => {
  const currentRegional = String(value ?? "").trim();
  if (!currentRegional) return "";

  const exactOption = CRP_REGION_OPTIONS.find((option) => option.value === currentRegional);
  if (exactOption) return exactOption.value;

  const currentCode = getCrpRegionCode(currentRegional);
  const matchingOption = currentCode
    ? CRP_REGION_OPTIONS.find((option) => getCrpRegionCode(option.value) === currentCode)
    : null;
  if (matchingOption) return matchingOption.value;

  const currentToken = normalizeCrpRegionToken(currentRegional);
  const matchingAcronymOption = CRP_REGION_OPTIONS.find((option) =>
    getCrpRegionAcronyms(option.value).includes(currentToken),
  );

  return matchingAcronymOption?.value ?? currentRegional;
};

export const createCrpRegionSelectOptions = (currentValue?: string | null) => {
  const currentRegional = resolveCrpRegionFieldValue(currentValue);
  const baseOptions = [CRP_REGION_PLACEHOLDER, ...CRP_REGION_OPTIONS];

  if (!currentRegional || CRP_REGION_OPTIONS.some((option) => option.value === currentRegional)) {
    return baseOptions;
  }

  return [
    CRP_REGION_PLACEHOLDER,
    { label: currentRegional, value: currentRegional },
    ...CRP_REGION_OPTIONS,
  ];
};

export const EMPTY_SELECT_OPTION = { label: "Não informado", value: "" };

// Mantém as opções administrativas alinhadas com
// frontend/src/app/app/professional/profile/setup/options.ts.
// O Admin adiciona apenas a opção vazia para permitir limpar campos opcionais.
export const GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não informar", value: "nao_informar" },
] as const;

export const RACE_COLOR_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Branca", value: "branca" },
  { label: "Preta", value: "preta" },
  { label: "Parda", value: "parda" },
  { label: "Amarela", value: "amarela" },
  { label: "Indígena", value: "indigena" },
  { label: "Prefiro não informar", value: "nao_informar" },
] as const;

export const RELIGION_OPTIONS = [
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

export const STATE_OPTIONS = [
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

export const MODALITY_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Online", value: "online" },
  { label: "Presencial", value: "presencial" },
  { label: "Presencial e Online", value: "hibrido" },
] as const;

export const CPF_CHANGE_CONFIRMATION_OPTIONS = [
  { label: "Não, manter sem confirmação", value: "" },
  { label: "Sim, confirmo a alteração administrativa", value: "sim" },
] as const;

export const mergeCurrentOption = (
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

export const getStaticOptionLabel = (
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

export const PROFILE_STATUS_COPY: Record<
  "active" | "inactive",
  { className: string; label: string }
> = {
  active: { className: "bg-emerald-50 text-success", label: "Ativo" },
  inactive: { className: "bg-red-50 text-danger", label: "Inativo" },
};

export const REGISTRY_VERIFICATION_TONE: Record<string, string> = {
  api_indisponivel: "bg-orange-50 text-orange-700",
  aprovado: "bg-emerald-50 text-success",
  em_analise: "bg-blue-50 text-blue-700",
  limite_tentativas: "bg-orange-50 text-orange-700",
  pendente: "bg-red-50 text-danger",
  rejeitado: "bg-red-50 text-danger",
};

export const METRIC_ICONS: Record<string, LucideIcon> = {
  engagement: MessageCircle,
  favorites: Heart,
  profile_views: Eye,
  ranking: Trophy,
  rating_avg: Star,
  profile_conversion: BarChart3,
  whatsapp_clicks: MessageCircle,
};

export const GENERAL_METRIC_LABELS: Record<string, string> = {
  favorites: "Favoritado",
  profile_views: "Visualizações de perfil",
  ranking: "Ranking",
  rating_avg: "Avaliações",
  whatsapp_clicks: "WhatsApp",
};

export const GENERAL_TAB_STATISTICS_QUERY = {
  period: "all",
} as const satisfies AdminPsychologistStatisticsQuery;

type StatisticsSeriesPoint = AdminPsychologistStatistics["business"]["series"][number];

type StatisticsSeriesMetricKey = Exclude<keyof StatisticsSeriesPoint, "date">;

type BusinessProfileConversionQualityId =
  AdminPsychologistStatistics["business"]["profile_conversion"]["quality"]["id"];

type BusinessVisibilityDiagnosisId =
  AdminPsychologistStatistics["business"]["visibility"]["diagnosis"]["id"];

export type StatisticsChartMetric = {
  dotRadius: number;
  getValue: (point: StatisticsSeriesPoint) => number;
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  id: string;
  label: string;
  source: string;
  shortLabel: string;
  strokeClassName: string;
  swatchClassName: string;
  unit?: AdminPsychologistEngagementMetric["unit"];
};

type VisibilitySeriesPoint =
  AdminPsychologistStatistics["business"]["visibility"]["series"][number];

export type VisibilityMetricValuePoint = Pick<
  VisibilitySeriesPoint,
  "community_content_seconds" | "presentation_video_seconds" | "profile_seconds"
>;

export type VisibilityChartMetric = {
  fillClassName: string;
  getValue: (point: VisibilityMetricValuePoint) => number;
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  id: "community_content" | "presentation_video" | "profile";
  label: string;
  shortLabel: string;
  swatchClassName: string;
};

export const BUSINESS_PROFILE_CONVERSION_QUALITY_BADGE_CLASS: Record<
  BusinessProfileConversionQualityId,
  string
> = {
  excellent_conversion: "bg-success/10 text-success",
  good_conversion: "bg-primary-soft text-primary",
  insufficient_data: "bg-surface-muted text-subtle",
  low_conversion: "bg-warning/10 text-warning",
  no_conversion: "bg-danger/10 text-danger",
};

export const BUSINESS_VISIBILITY_DIAGNOSIS_BADGE_CLASS: Record<
  BusinessVisibilityDiagnosisId,
  string
> = {
  high_exposure: "bg-success/10 text-success",
  insufficient_data: "bg-surface-muted text-subtle",
  low_exposure: "bg-warning/10 text-warning",
  no_exposure: "bg-danger/10 text-danger",
  standard_exposure: "bg-primary-soft text-primary",
};

export const BUSINESS_VISIBILITY_DIAGNOSIS_LABEL: Record<BusinessVisibilityDiagnosisId, string> = {
  high_exposure: "Alta visibilidade",
  insufficient_data: "Dados insuficientes",
  low_exposure: "Baixa visibilidade",
  no_exposure: "Sem visibilidade",
  standard_exposure: "Visibilidade padrão",
};

export const BUSINESS_CHART_METRICS = [
  {
    dotRadius: 4.2,
    id: "whatsapp_clicks",
    icon: MessageCircle,
    iconClassName: "text-emerald-500",
    iconToneClassName: "bg-emerald-50",
    getValue: (point) => point.whatsapp_clicks,
    label: "Cliques no WhatsApp",
    source: "contact_request.channel=whatsapp",
    shortLabel: "Conversão",
    strokeClassName: "stroke-emerald-500",
    swatchClassName: "bg-emerald-500",
  },
  {
    dotRadius: 3.8,
    id: "visibility_signal",
    icon: Search,
    iconClassName: "text-blue-500",
    iconToneClassName: "bg-blue-50",
    getValue: (point) => point.visibility_seconds,
    label: "Visibilidade (tempo)",
    source:
      "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds",
    shortLabel: "Visibilidade",
    strokeClassName: "stroke-blue-500",
    swatchClassName: "bg-blue-500",
    unit: "seconds",
  },
  {
    dotRadius: 3.5,
    id: "engagement_score",
    icon: Heart,
    iconClassName: "text-pink-500",
    iconToneClassName: "bg-pink-50",
    getValue: (point) =>
      Math.max(
        0,
        point.upvotes * 2 +
          point.comments_received * 5 +
          point.shares * 8 +
          point.saves * 2 -
          point.downvotes * 3,
      ),
    label: "Engajamento (score)",
    source: "post_vote+post_reply+post_save+post_reply_save+post_share",
    shortLabel: "Engajamento",
    strokeClassName: "stroke-pink-500",
    swatchClassName: "bg-pink-500",
  },
  {
    dotRadius: 3.2,
    id: "activity_score",
    icon: Activity,
    iconClassName: "text-amber-500",
    iconToneClassName: "bg-amber-50",
    getValue: (point) => point.posts + point.replies,
    label: "Atividade (ações)",
    source: "community_post.author_id+post_reply.author_id",
    shortLabel: "Atividade",
    strokeClassName: "stroke-amber-500",
    swatchClassName: "bg-amber-500",
  },
  {
    dotRadius: 3,
    id: "reviews",
    icon: Star,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning/10",
    getValue: (point) => point.reviews,
    label: "Avaliações",
    source: "professional_review",
    shortLabel: "Avaliações",
    strokeClassName: "stroke-warning",
    swatchClassName: "bg-warning",
  },
] as const satisfies readonly StatisticsChartMetric[];

export const VISIBILITY_CHART_METRICS = [
  {
    fillClassName: "fill-primary",
    icon: UserRound,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "profile",
    getValue: (point) => point.profile_seconds,
    label: "Perfil",
    shortLabel: "Perfil",
    swatchClassName: "bg-primary",
  },
  {
    fillClassName: "fill-success",
    icon: Video,
    iconClassName: "text-success",
    iconToneClassName: "bg-success/10",
    id: "presentation_video",
    getValue: (point) => point.presentation_video_seconds,
    label: "Vídeo de apresentação",
    shortLabel: "Vídeo",
    swatchClassName: "bg-success",
  },
  {
    fillClassName: "fill-warning",
    icon: BookOpen,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning/10",
    id: "community_content",
    getValue: (point) => point.community_content_seconds,
    label: "Conteúdo na comunidade",
    shortLabel: "Comunidade",
    swatchClassName: "bg-warning",
  },
] as const satisfies readonly VisibilityChartMetric[];

export const COMMUNITY_CHART_METRICS = [
  {
    dotRadius: 4.4,
    icon: Eye,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "community_visibility",
    getValue: (point) => point.visibility_seconds,
    label: "Visibilidade",
    source: "content_attention_session.attention_seconds",
    shortLabel: "Visibilidade",
    strokeClassName: "stroke-primary",
    swatchClassName: "bg-primary",
    unit: "seconds",
  },
  {
    dotRadius: 4.2,
    icon: FileText,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "posts",
    getValue: (point) => point.posts,
    label: "Posts",
    source: "community_post.author_id",
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
    getValue: (point) => point.replies,
    label: "Respostas",
    source: "post_reply.author_id",
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
    getValue: (point) => point.upvotes,
    label: "Upvotes recebidos",
    source: "post_vote.value=1 em conteúdos do psicólogo",
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
    getValue: (point) => point.downvotes,
    label: "Downvotes recebidos",
    source: "post_vote.value=-1 em conteúdos do psicólogo",
    shortLabel: "Downvotes",
    strokeClassName: "stroke-red-500",
    swatchClassName: "bg-red-500",
  },
  {
    dotRadius: 3.3,
    icon: BookOpen,
    iconClassName: "text-pink-500",
    iconToneClassName: "bg-pink-50",
    id: "comments_received",
    getValue: (point) => point.comments_received,
    label: "Comentários recebidos",
    source: "post_reply em posts do psicólogo",
    shortLabel: "Comentários",
    strokeClassName: "stroke-pink-500",
    swatchClassName: "bg-pink-500",
  },
  {
    dotRadius: 3.1,
    icon: Bookmark,
    iconClassName: "text-orange-500",
    iconToneClassName: "bg-orange-50",
    id: "saves",
    getValue: (point) => point.saves,
    label: "Salvamentos recebidos",
    source: "post_save+post_reply_save",
    shortLabel: "Salvos",
    strokeClassName: "stroke-orange-500",
    swatchClassName: "bg-orange-500",
  },
  {
    dotRadius: 3,
    icon: Share2,
    iconClassName: "text-violet-500",
    iconToneClassName: "bg-violet-50",
    id: "shares",
    getValue: (point) => point.shares,
    label: "Compartilhamentos recebidos",
    source: "post_share em conteúdos do psicólogo",
    shortLabel: "Shares",
    strokeClassName: "stroke-violet-500",
    swatchClassName: "bg-violet-500",
  },
] as const satisfies readonly StatisticsChartMetric[];

type BusinessChartMetric = (typeof BUSINESS_CHART_METRICS)[number];

export type BusinessChartMetricId = BusinessChartMetric["id"];

export type VisibilityChartMetricId = (typeof VISIBILITY_CHART_METRICS)[number]["id"];

type CommunityChartMetric = (typeof COMMUNITY_CHART_METRICS)[number];

export type CommunityChartMetricId = CommunityChartMetric["id"];

export type StatisticsPeriodValue = NonNullable<AdminPsychologistStatisticsQuery["period"]>;

export type StatisticsPeriodPreset = Exclude<StatisticsPeriodValue, "custom">;

export type StatisticsCustomRange = Pick<AdminPsychologistStatisticsQuery, "from" | "to">;

export type PublicationsPeriodValue = NonNullable<AdminPsychologistPublicationsQuery["period"]>;

export type PublicationsPeriodPreset = Exclude<PublicationsPeriodValue, "custom">;

export type PublicationsCustomRange = Pick<AdminPsychologistPublicationsQuery, "from" | "to">;

export type StatisticsMetricComparison = NonNullable<
  AdminPsychologistEngagementMetric["comparison"]
>;

export const BUSINESS_SERIES_METRIC_KEYS = [
  "comments_received",
  "coverage_rate_percent",
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
  "visibility_seconds",
] as const satisfies readonly StatisticsSeriesMetricKey[];

export const VISIBILITY_SERIES_METRIC_KEYS = [
  "community_content_seconds",
  "presentation_video_seconds",
  "profile_seconds",
  "total_seconds",
] as const satisfies readonly (keyof VisibilitySeriesPoint)[];

export const STATISTICS_PERIOD_OPTIONS: { id: StatisticsPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

export const PUBLICATIONS_PERIOD_OPTIONS: { id: PublicationsPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

export type PublicationSortValue = NonNullable<AdminPsychologistPublicationsQuery["sort"]>;

export const PUBLICATIONS_SORT_OPTIONS: { id: PublicationSortValue; label: string }[] = [
  { id: "engagement", label: "Mais populares" },
  { id: "recent", label: "Mais recentes" },
  { id: "oldest", label: "Mais antigos" },
];

export const CARD =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const COURTESY_GRANT_CONFIRMATION = "CONCEDER CORTESIA";

export const DATE_INPUT_MAX_FOUR_DIGIT_YEAR = "9999-12-31";
