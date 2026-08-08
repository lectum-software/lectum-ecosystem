import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardPlanSegment,
  PsychologistsDashboardQuery,
} from "@/api/req/psychologists";

export const CARD_ORDER = [
  "total_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
  "courtesy_psychologists",
  "new_signups",
  "churn",
] as const;

export type DashboardMetricKey = (typeof CARD_ORDER)[number];

export type DashboardPeriodValue = NonNullable<PsychologistsDashboardQuery["period"]>;

export type DashboardPeriodPreset = Exclude<DashboardPeriodValue, "custom">;

export type DashboardRange = Pick<PsychologistsDashboardQuery, "from" | "to">;

export type DeviceUsageItem = AdminPsychologistsDashboard["device_usage"]["items"][number];

export type ProfileActivityCategoryItem =
  AdminPsychologistsDashboard["profile_activity"]["categories"][number];

export type ProfileActivityCategoryId = ProfileActivityCategoryItem["id"];

export type ProfileCoverageCategoryItem =
  AdminPsychologistsDashboard["profile_coverage"]["categories"][number];

export type ProfileCoverageCategoryId = ProfileCoverageCategoryItem["id"];

export type ProfileConversionCategoryItem =
  AdminPsychologistsDashboard["profile_conversion"]["categories"][number];

export type ProfileConversionGoalCategoryItem =
  AdminPsychologistsDashboard["profile_conversion_goal"]["categories"][number];

export type ProfileExposureCategoryItem =
  AdminPsychologistsDashboard["profile_exposure"]["categories"][number];

export type ProfileExposureCommunityCategoryId = NonNullable<
  ProfileExposureCategoryItem["community_id"]
>;

export type ProfileExposureVideoCategoryId = NonNullable<ProfileExposureCategoryItem["video_id"]>;

export type ProfileEngagementFavoritesCategoryItem =
  AdminPsychologistsDashboard["profile_engagement_favorites"]["categories"][number];

export type ProfileEngagementFavoritesCommunityCategoryId = NonNullable<
  ProfileEngagementFavoritesCategoryItem["engagement_id"]
>;

export type ProfileEngagementFavoritesFavoriteCategoryId = NonNullable<
  ProfileEngagementFavoritesCategoryItem["favorites_id"]
>;

export type ProfileConversionBehaviorResults =
  AdminPsychologistsDashboard["profile_conversion_behavior"];

export type ProfileConversionBehaviorCell = ProfileConversionBehaviorResults["cells"][number];

export type ProfileConversionBehaviorMetric = ProfileConversionBehaviorCell["metrics"][number];

export type ProfileCrossMatrixResults = AdminPsychologistsDashboard["profile_cross_matrix"];

export type ProfileCrossMatrixAxisId = ProfileCrossMatrixResults["default_row_axis_id"];

export type ProfileCrossMatrixAxis = ProfileCrossMatrixResults["axes"][number];

export type ProfileCrossMatrixCategory = ProfileCrossMatrixAxis["categories"][number];

export type ProfileCrossMatrix = ProfileCrossMatrixResults["matrices"][number];

export type ProfileCrossMatrixQuadrant = ProfileCrossMatrix["quadrants"][number];

export type PsychologistsDonutChartItem = {
  color: string;
  count: number;
  description?: string;
  id: string;
  label: string;
  percentage: number;
};

export type PlanSegmentFilter = PsychologistsDashboardPlanSegment;

export type SignupMethodItem = AdminPsychologistsDashboard["signup_method"]["items"][number];

export type SupplyDemandSortKey = "psychologists" | "searches" | "searches_per_psychologist";

export type ConversionJourney = "registration" | "subscription";

export type PlatformPagesView = "accesses" | "average_duration";

export type TrafficSourceItem = AdminPsychologistsDashboard["traffic_sources"]["sources"][number];

export type CommunityTrafficSourceId = Extract<
  TrafficSourceItem["id"],
  | "community_post_text"
  | "community_post_video"
  | "community_reply_text"
  | "community_reply_video"
  | "community_top_mentors"
>;

export type PresentationVideoTrafficSourceId = Extract<
  TrafficSourceItem["id"],
  "explore" | "search_filters"
>;

export type TrafficSourceGroupId =
  | "communities_group"
  | "presentation_video_group"
  | "profile_group";

export type TrafficSourceGroupKind = "communities" | "presentation_video" | "profile";

export type TrafficSourceDisplayItem = Omit<TrafficSourceItem, "id"> & {
  children?: TrafficSourceItem[];
  groupKind?: TrafficSourceGroupKind;
  id: TrafficSourceItem["id"] | TrafficSourceGroupId;
  isExpandableGroup?: boolean;
};

export const PLAN_SEGMENT_FILTER_OPTIONS: { id: PlanSegmentFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "free", label: "Gratuitos" },
  { id: "courtesy", label: "Cortesia" },
];

export const SUPPLY_DEMAND_SORT_OPTIONS: { id: SupplyDemandSortKey; label: string }[] = [
  { id: "searches", label: "Mais buscas" },
  { id: "psychologists", label: "Mais psicólogos" },
  { id: "searches_per_psychologist", label: "Mais buscas por psicólogo" },
];

export const CONVERSION_JOURNEY_OPTIONS: { id: ConversionJourney; label: string }[] = [
  { id: "subscription", label: "Conversão do cadastro até assinatura" },
  { id: "registration", label: "Conversão até o cadastro" },
];

export const PLATFORM_PAGES_VIEW_OPTIONS: { id: PlatformPagesView; label: string }[] = [
  { id: "accesses", label: "Páginas mais acessadas" },
  { id: "average_duration", label: "Páginas com maior tempo médio" },
];

export const COMMUNITY_TRAFFIC_SOURCE_IDS = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
  "community_top_mentors",
] as const satisfies readonly CommunityTrafficSourceId[];

export const COMMUNITY_TRAFFIC_SOURCE_ID_SET = new Set<TrafficSourceItem["id"]>(
  COMMUNITY_TRAFFIC_SOURCE_IDS,
);

export const COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS = {
  community_post_text: "Posts sem vídeo",
  community_post_video: "Posts com vídeo",
  community_reply_text: "Respostas sem vídeo",
  community_reply_video: "Respostas com vídeo",
  community_top_mentors: "Ranking Top Mentores",
} satisfies Record<CommunityTrafficSourceId, string>;

export const PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS = [
  "explore",
  "search_filters",
] as const satisfies readonly PresentationVideoTrafficSourceId[];

export const PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET = new Set<TrafficSourceItem["id"]>(
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS,
);

export const toOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const normalizeFilterOptionKey = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const DASHBOARD_PERIOD_OPTIONS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

export const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "7d") return { from: toInputDate(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toInputDate(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toInputDate(startOfLastDays(90)), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

export const buildDashboardPeriodQuery = (
  period: DashboardPeriodValue,
  range: DashboardRange,
): PsychologistsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

export const formatSelectedPeriod = (period: AdminPsychologistsDashboard["period"]) => {
  if (!period.from || !period.to) return period.label;

  return `${period.label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;
};

export const getDashboardPeriodLabel = (period: DashboardPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Todo o período";
};

export const formatDraftSelectedPeriod = (period: DashboardPeriodValue, range: DashboardRange) => {
  const label = getDashboardPeriodLabel(period);

  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}`;
};

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

export const calculatePercentage = (value: number, total: number) =>
  total > 0 ? toOneDecimal((Math.max(0, value) / total) * 100) : 0;

export const formatNullablePercentage = (value: number | null) =>
  typeof value === "number" ? formatPercentageValue(value) : "Indisponível";

export const formatDaysMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";
  if (value === 0) return "Mesmo dia";

  return `${numberFormatter.format(value)} dias`;
};

export const formatDecimalMetric = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "Indisponível";

export const formatSecondsMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

export const formatNullableCount = (value: number | null) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

export const isValidRange = (range: DashboardRange, period: DashboardPeriodValue) => {
  if (period !== "custom") return true;
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

export const hasDashboardRecords = (summary: AdminPsychologistsDashboard) => {
  const cardsHaveData = Object.values(summary.cards).some((metric) => metric.value > 0);
  const timelineHasData = summary.timeline.points.some(
    (point) =>
      point.total_psychologists > 0 ||
      point.free_psychologists > 0 ||
      point.subscriber_psychologists > 0 ||
      point.courtesy_psychologists > 0 ||
      point.new_signups > 0 ||
      point.churn > 0,
  );

  return cardsHaveData || timelineHasData;
};
