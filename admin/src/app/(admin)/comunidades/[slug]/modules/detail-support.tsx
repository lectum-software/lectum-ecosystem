import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import type { LucideIcon } from "lucide-react";
import { z } from "zod";
import type {
  AdminCommunityContentQuery,
  AdminCommunityIdentity,
  AdminCommunityRule,
  AdminCommunityRuleInput,
  AdminCommunityStatisticsQuery,
  AdminCommunityUpdateInput,
} from "@/api/req/communities";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const hexColor = /^#[0-9A-Fa-f]{6}$/;

export const colorSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || hexColor.test(value), "Use uma cor no formato #RRGGBB.");

export const communityFormSchema = z.object({
  description: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Use até 120 caracteres."),
  visual_primary_color: colorSchema,
});

export const ruleFormSchema = z.object({
  description: z.string().trim().min(3, "Informe a descrição.").max(500, "Use até 500 caracteres."),
});

export const COMMUNITY_DEACTIVATE_CONFIRMATION = "DESATIVAR COMUNIDADE";

export const COMMUNITY_REACTIVATE_CONFIRMATION = "REATIVAR COMUNIDADE";

export const communityStatusFormSchema = (expectedConfirmation: string) =>
  z.object({
    confirmation: z
      .string()
      .trim()
      .refine(
        (value) => value.toUpperCase() === expectedConfirmation,
        `Digite ${expectedConfirmation} para confirmar.`,
      ),
    reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use ate 500 caracteres."),
  });

export const communityReportResolveSchema = (expectedConfirmation: string) =>
  z.object({
    confirmation: z
      .string()
      .trim()
      .refine(
        (value) => value.toUpperCase() === expectedConfirmation,
        `Digite ${expectedConfirmation} para confirmar.`,
      ),
    reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use ate 500 caracteres."),
    resolution: z.enum(["dismissed", "pending", "upheld"], {
      message: "Selecione o novo status.",
    }),
  });

export type CommunityFormValues = z.infer<typeof communityFormSchema>;

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

export type CommunityStatusFormValues = z.infer<ReturnType<typeof communityStatusFormSchema>>;

export type CommunityReportResolveFormValues = z.infer<
  ReturnType<typeof communityReportResolveSchema>
>;

export type RuleDragMetric = {
  bottom: number;
  height: number;
  id: string;
  top: number;
};

export type RuleDragSession = {
  draggedSlotSize: number;
  metrics: RuleDragMetric[];
  pointerId: number;
  sourceIndex: number;
  sourceRuleId: string;
  startClientY: number;
};

export type RuleDragState = {
  draggedSlotSize: number;
  offsetY: number;
  sourceIndex: number;
  sourceRuleId: string;
  targetIndex: number;
};

export const communityTabs = [
  { id: "geral", label: "Geral" },
  { id: "dados", label: "Dados" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "ranking", label: "Ranking" },
  { id: "denuncias", label: "Denúncias" },
  { id: "atividades", label: "Atividades" },
] as const;

export type CommunityTab = (typeof communityTabs)[number]["id"];

export const contentTypeOptions = [
  { id: "all", label: "Todos os tipos" },
  { id: "posts", label: "Todos os posts" },
  { id: "verified_psychologist_post", label: "Posts de psicólogo verificado" },
  { id: "unverified_psychologist_post", label: "Posts de psicólogo não verificado" },
  { id: "verified_psychologist_reply", label: "Respostas de psicólogo verificado" },
  { id: "unverified_psychologist_reply", label: "Respostas de psicólogo não verificado" },
  { id: "patient_comment", label: "Comentários de pacientes" },
  { id: "anonymous_post", label: "Posts anônimos" },
] as const satisfies ReadonlyArray<{
  id: NonNullable<AdminCommunityContentQuery["type"]>;
  label: string;
}>;

export type ContentPeriodValue = NonNullable<AdminCommunityContentQuery["period"]>;

export type ContentPeriodPreset = Exclude<ContentPeriodValue, "custom">;

export type ContentCustomRange = Pick<AdminCommunityContentQuery, "from" | "to">;

export type ContentSortValue = NonNullable<AdminCommunityContentQuery["sort"]>;

export type StatisticsPeriodValue = NonNullable<AdminCommunityStatisticsQuery["period"]>;

export type StatisticsPeriodPreset = Exclude<StatisticsPeriodValue, "custom">;

export type StatisticsCustomRange = Pick<AdminCommunityStatisticsQuery, "from" | "to">;

export type CommunityStatisticsPeriodOption = {
  id: StatisticsPeriodValue;
  label: string;
};

export const contentPeriodOptions = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<{
  id: ContentPeriodPreset;
  label: string;
}>;

export const contentSortOptions = [
  { id: "engagement", label: "Mais populares" },
  { id: "recent", label: "Mais recentes" },
  { id: "oldest", label: "Mais antigos" },
] as const satisfies ReadonlyArray<{
  id: ContentSortValue;
  label: string;
}>;

export const contentTypeValues = contentTypeOptions.map((option) => option.id) as readonly string[];

export const contentSortValues = contentSortOptions.map((option) => option.id) as readonly string[];

export const contentPeriodPresetValues = [
  "today",
  "week",
  "month",
  "year",
  "7d",
  "30d",
  "90d",
  "all",
] as const;

export const parseContentTypeParam = (
  value: string | null,
): NonNullable<AdminCommunityContentQuery["type"]> =>
  value && contentTypeValues.includes(value)
    ? (value as NonNullable<AdminCommunityContentQuery["type"]>)
    : "all";

export const parseContentSortParam = (value: string | null): ContentSortValue =>
  value && contentSortValues.includes(value) ? (value as ContentSortValue) : "engagement";

export const parseContentPeriodParam = (value: string | null): ContentPeriodPreset =>
  contentPeriodPresetValues.includes(value as ContentPeriodPreset)
    ? (value as ContentPeriodPreset)
    : "all";

export const statisticsPeriodOptions = contentPeriodOptions satisfies ReadonlyArray<{
  id: StatisticsPeriodValue;
  label: string;
}>;

export const activityHoursPeriodOptions = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<CommunityStatisticsPeriodOption>;

export const disabledCommunityStatisticsComparisonQuery = {
  from: "",
  period: "custom",
  to: "",
} satisfies AdminCommunityStatisticsQuery;

export const parseCommunityTab = (value: string | null): CommunityTab =>
  communityTabs.some((tab) => tab.id === value) ? (value as CommunityTab) : "geral";

export const cardClass = "rounded-card border border-border bg-surface shadow-admin-soft";

export const SummaryBlockTitle = ({ icon: Icon, title }: { icon: LucideIcon; title: string }) => (
  <h2 className="inline-flex min-w-0 items-center gap-2 text-lg font-black text-foreground">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/10">
      <Icon aria-hidden className="h-4 w-4" />
    </span>
    <span className="truncate">{title}</span>
  </h2>
);

export const formatDate = (value: string) => dateFormatter.format(new Date(value));

export const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

export const formatActivityDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return `${dateFormatter.format(date)} às ${timeFormatter.format(date)}`;
};

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};

export const getContentRangeForPeriod = (
  period: ContentPeriodPreset,
  createdAt?: string | null,
): Required<ContentCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toDateInputValue(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toDateInputValue(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toDateInputValue(startOfLastDays(90)), to: today };
  if (period === "all") return { from: dateInputValueFromString(createdAt), to: today };

  return { from: toDateInputValue(startOfCurrentWeek()), to: today };
};

export const getStatisticsRangeForPeriod = (
  period: StatisticsPeriodPreset,
  createdAt?: string | null,
): Required<StatisticsCustomRange> => getContentRangeForPeriod(period, createdAt);

export const contentDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const isValidContentRange = (range: ContentCustomRange) => {
  if (!range.from || !range.to) return false;

  return contentDateFromInput(range.from) <= contentDateFromInput(range.to);
};

export const daysBetweenDateInputValues = (from: string, to: string) => {
  const start = contentDateFromInput(from);
  const end = contentDateFromInput(to);

  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
};

export const addDaysToDateInputValue = (value: string, days: number) => {
  const date = contentDateFromInput(value);
  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
};

export const buildPreviousStatisticsRange = (
  range: Required<StatisticsCustomRange>,
): Required<StatisticsCustomRange> | null => {
  if (!isValidContentRange(range)) return null;

  const days = daysBetweenDateInputValues(range.from, range.to);
  if (days < 1) return null;

  const previousTo = addDaysToDateInputValue(range.from, -1);
  const previousFrom = addDaysToDateInputValue(previousTo, -(days - 1));

  return { from: previousFrom, to: previousTo };
};

export const formatDayMonth = (value: string) =>
  dayMonthFormatter.format(contentDateFromInput(value));

export type ReportPeriodValue =
  | "today"
  | "week"
  | "month"
  | "year"
  | "7d"
  | "30d"
  | "90d"
  | "180d"
  | "all"
  | "custom";

export type ReportPeriodPreset = Exclude<ReportPeriodValue, "custom">;

export type ReportDateRange = {
  from?: string;
  to?: string;
};

export const reportPeriodOptions: { id: ReportPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
  { id: "all", label: "Todo o período" },
];

export const getReportRangeForPeriod = (period: ReportPeriodPreset): ReportDateRange => {
  const today = toDateInputValue(new Date());

  if (period === "all") return { from: "", to: "" };
  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };

  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: today,
  };
};

export const isValidReportRange = (range: ReportDateRange) => {
  if (!range.from || !range.to) return false;

  return contentDateFromInput(range.from) <= contentDateFromInput(range.to);
};

export type ActivityPeriodValue =
  | "today"
  | "week"
  | "month"
  | "year"
  | "7d"
  | "30d"
  | "90d"
  | "180d"
  | "all"
  | "custom";

export const resolveCommunityActivityPeriod = (
  preset: ActivityPeriodValue,
  customFrom: string,
  customTo: string,
) => {
  if (preset === "all") return {};
  if (preset === "custom") {
    return customFrom && customTo ? { from: customFrom, to: customTo } : {};
  }

  const today = toDateInputValue(new Date());

  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (preset === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (preset === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: today,
  };
};

export const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`;

export const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CO";

export const colorValue = (value?: string | null) => value || "";

export const nullableText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};

export const nullableColor = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized.toUpperCase() : null;
};

export const defaultCommunityValues = (community: AdminCommunityIdentity): CommunityFormValues => ({
  description: community.description ?? "",
  name: community.name,
  visual_primary_color: colorValue(community.visual_primary_color),
});

export const toCommunityPayload = (values: CommunityFormValues): AdminCommunityUpdateInput => ({
  description: nullableText(values.description),
  name: values.name.trim(),
  visual_primary_color: nullableColor(values.visual_primary_color),
});

export const deriveRuleTitle = (description: string) => {
  const normalized = description.trim().replace(/\s+/g, " ");
  const title = normalized.slice(0, 80).trim();

  return title.length >= 2 ? title : "Regra da comunidade";
};

export const toRulePayload = (
  values: RuleFormValues,
  rule?: Pick<AdminCommunityRule, "active" | "position">,
): AdminCommunityRuleInput => ({
  active: rule?.active ?? true,
  description: values.description.trim(),
  position: rule?.position ?? 0,
  title: deriveRuleTitle(values.description),
});

export const existingRulePayload = (
  rule: AdminCommunityRule,
  position = rule.position,
): AdminCommunityRuleInput => ({
  active: rule.active,
  description: rule.description,
  position,
  title: rule.title.trim() || deriveRuleTitle(rule.description),
});

export const isRuleDragBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest("button, a, input, textarea, select, label, [contenteditable='true']"),
  );
};

export const isRuleDragHandleTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-rule-drag-handle='true']"));

export const measureRuleCards = (container: HTMLDivElement | null): RuleDragMetric[] =>
  Array.from(container?.querySelectorAll<HTMLElement>("[data-rule-card='true']") ?? [])
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        id: element.dataset.ruleId ?? "",
        top: rect.top,
      };
    })
    .filter((metric) => metric.id);

export const resolveRuleSlotSize = (metrics: RuleDragMetric[], sourceIndex: number) => {
  const sourceMetric = metrics[sourceIndex];
  if (!sourceMetric) return 0;

  const nextMetric = metrics[sourceIndex + 1];
  const previousMetric = metrics[sourceIndex - 1];
  const nextGap = nextMetric ? nextMetric.top - sourceMetric.bottom : null;
  const previousGap = previousMetric ? sourceMetric.top - previousMetric.bottom : null;
  const gap = [nextGap, previousGap].find((value) => typeof value === "number" && value > 0) ?? 12;

  return sourceMetric.height + gap;
};

export const resolveRuleTargetIndex = (clientY: number, session: RuleDragSession) => {
  const metricsWithoutDragged = session.metrics.filter(
    (metric) => metric.id !== session.sourceRuleId,
  );
  const beforeMetricIndex = metricsWithoutDragged.findIndex(
    (metric) => clientY < metric.top + metric.height / 2,
  );

  return beforeMetricIndex >= 0 ? beforeMetricIndex : metricsWithoutDragged.length;
};
