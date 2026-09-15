import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  Reply,
  UserRound,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type {
  AdminCommunityStatistics,
  AdminCommunityStatisticsDailyPoint,
  AdminCommunityStatisticsQuery,
} from "@/api/req/communities";

import {
  buildPreviousStatisticsRange,
  type CommunityStatisticsPeriodOption,
  formatCountLabel,
  formatDayMonth,
  getStatisticsRangeForPeriod,
  isValidContentRange,
  numberFormatter,
  percentageFormatter,
  type StatisticsCustomRange,
  type StatisticsPeriodPreset,
  type StatisticsPeriodValue,
} from "./detail-support";

export type CommunityStatisticsDailyMetricKey = Exclude<
  keyof AdminCommunityStatisticsDailyPoint,
  "date"
>;

export type CommunityStatisticsMetricAggregation = "last" | "sum";

export type CommunityStatisticsMetricDetail = {
  id: string;
  label: string;
  percentage: number;
  value: number;
};

export type CommunityStatisticsMetricTrend = "down" | "flat" | "unavailable" | "up";

export type CommunityStatisticsMetricComparison = {
  change_percent: number | null;
  previous_from: string;
  previous_to: string;
  previous_value: number;
  trend: CommunityStatisticsMetricTrend;
};

export type CommunityStatisticsMetricConfig = {
  dotClassName: string;
  getDetails?: (statistics: AdminCommunityStatistics) => CommunityStatisticsMetricDetail[];
  getValue: (statistics: AdminCommunityStatistics) => number;
  icon: LucideIcon;
  iconClassName: string;
  iconToneClassName: string;
  id: string;
  key: CommunityStatisticsDailyMetricKey;
  label: string;
  strokeClassName: string;
};

export type CommunityStatisticsMetricItem = CommunityStatisticsMetricConfig & {
  comparison?: CommunityStatisticsMetricComparison;
  details?: CommunityStatisticsMetricDetail[];
  value: number;
};

export type CommunityStatisticsDateFilterProps = {
  draftRange: Required<StatisticsCustomRange>;
  onDateChange: (field: keyof StatisticsCustomRange, value: string) => void;
  onDateControlsBlur: (event: {
    currentTarget: HTMLDivElement;
    relatedTarget: EventTarget | null;
  }) => void;
  onPeriodChange: (period: StatisticsPeriodValue) => void;
  periodOptions?: ReadonlyArray<CommunityStatisticsPeriodOption>;
  rangeError: string | null;
  selectedPeriod: StatisticsPeriodValue;
};

export const useCommunityStatisticsDateFilterState = (
  createdAt: string,
  initialPeriod: StatisticsPeriodPreset = "all",
) => {
  const [selectedPeriod, setSelectedPeriod] = useState<StatisticsPeriodValue>(initialPeriod);
  const initialRange = useMemo(
    () => getStatisticsRangeForPeriod(initialPeriod, createdAt),
    [createdAt, initialPeriod],
  );
  const [draftRange, setDraftRange] = useState<Required<StatisticsCustomRange>>(initialRange);
  const [appliedRange, setAppliedRange] = useState<Required<StatisticsCustomRange>>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const queryInput = useMemo<AdminCommunityStatisticsQuery>(
    () => ({
      period: selectedPeriod,
      ...(selectedPeriod === "custom" ? appliedRange : {}),
    }),
    [appliedRange, selectedPeriod],
  );
  const comparisonRange = useMemo(
    () => (selectedPeriod === "all" ? null : buildPreviousStatisticsRange(appliedRange)),
    [appliedRange, selectedPeriod],
  );
  const comparisonQueryInput = useMemo<AdminCommunityStatisticsQuery | null>(
    () => (comparisonRange ? { ...comparisonRange, period: "custom" } : null),
    [comparisonRange],
  );

  const handlePeriodChange = useCallback(
    (period: StatisticsPeriodValue) => {
      setSelectedPeriod(period);
      if (period !== "custom") {
        const nextRange = getStatisticsRangeForPeriod(period as StatisticsPeriodPreset, createdAt);
        setDraftRange(nextRange);
        setAppliedRange(nextRange);
        setRangeError(null);
      }
    },
    [createdAt],
  );

  const handleDateChange = useCallback(
    (field: keyof StatisticsCustomRange, value: string) => {
      const nextRange = { ...draftRange, [field]: value };
      setDraftRange(nextRange);
      setSelectedPeriod("custom");
    },
    [draftRange],
  );

  const commitRange = useCallback(() => {
    if (!isValidContentRange(draftRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedRange(draftRange);
  }, [draftRange]);

  const handleDateControlsBlur = useCallback(
    (event: { currentTarget: HTMLDivElement; relatedTarget: EventTarget | null }) => {
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

  const dateFilters = useMemo<CommunityStatisticsDateFilterProps>(
    () => ({
      draftRange,
      onDateChange: handleDateChange,
      onDateControlsBlur: handleDateControlsBlur,
      onPeriodChange: handlePeriodChange,
      rangeError,
      selectedPeriod,
    }),
    [
      draftRange,
      handleDateChange,
      handleDateControlsBlur,
      handlePeriodChange,
      rangeError,
      selectedPeriod,
    ],
  );

  return { comparisonQueryInput, dateFilters, queryInput };
};

export const communityStatisticsMetricAggregations = {
  followers_patients: "last",
  followers_psychologists: "last",
} as const satisfies Partial<
  Record<CommunityStatisticsDailyMetricKey, CommunityStatisticsMetricAggregation>
>;

export const safeCommunityStatisticCount = (value: number | null | undefined) => {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
};

export const communityStatisticPercentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

export const roundCommunityStatisticPercent = (value: number) => Math.round(value * 10) / 10;

export const formatCommunityStatisticPercent = (value: number) =>
  `${percentageFormatter.format(roundCommunityStatisticPercent(value))}%`;

export const formatCommunityVerifiedResponseDetail = (responded: number, total: number) =>
  `${formatCountLabel(
    responded,
    "respondido por psicólogo verificado",
    "respondidos por psicólogos verificados",
  )} (${formatCommunityStatisticPercent(communityStatisticPercentage(responded, total))})`;

export const formatCommunityCareCoverageDuration = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  const minutes = safeCommunityStatisticCount(value);

  if (minutes < 60) return `${numberFormatter.format(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${numberFormatter.format(hours)}h ${numberFormatter.format(remainingMinutes)}min`
      : `${numberFormatter.format(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${numberFormatter.format(days)}d ${numberFormatter.format(remainingHours)}h`
    : `${numberFormatter.format(days)}d`;
};

export const communityStatisticPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundCommunityStatisticPercent(((current - previous) / previous) * 100);
};

export const buildCommunityStatisticsMetricComparison = (
  currentValue: number,
  previousValue: number,
  previousPeriod: AdminCommunityStatistics["period"],
): CommunityStatisticsMetricComparison => {
  const change = communityStatisticPercentageChange(currentValue, previousValue);

  return {
    change_percent: change,
    previous_from: previousPeriod.from,
    previous_to: previousPeriod.to,
    previous_value: previousValue,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
};

export const COMMUNITY_PEOPLE_STATISTICS_METRICS = [
  {
    dotClassName: "bg-primary",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.accesses.total,
    icon: Eye,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "accesses",
    key: "accesses",
    label: "Acessos",
    strokeClassName: "stroke-primary",
  },
  {
    dotClassName: "bg-primary",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.followers.psychologists,
    icon: UserRound,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "followers_psychologists",
    key: "followers_psychologists",
    label: "Psicólogos seguidores",
    strokeClassName: "stroke-primary",
  },
  {
    dotClassName: "bg-success",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.followers.patients,
    icon: Users,
    iconClassName: "text-success",
    iconToneClassName: "bg-success/10",
    id: "followers_patients",
    key: "followers_patients",
    label: "Pacientes seguidores",
    strokeClassName: "stroke-success",
  },
  {
    dotClassName: "bg-warning",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.active_users.psychologists,
    icon: UserRound,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning/10",
    id: "active_psychologists",
    key: "active_psychologists",
    label: "Psicólogos ativos",
    strokeClassName: "stroke-warning",
  },
  {
    dotClassName: "bg-danger",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.active_users.patients,
    icon: Users,
    iconClassName: "text-danger",
    iconToneClassName: "bg-danger/10",
    id: "active_patients",
    key: "active_patients",
    label: "Pacientes ativos",
    strokeClassName: "stroke-danger",
  },
  {
    dotClassName: "bg-muted",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.new_active_users.patients,
    icon: Users,
    iconClassName: "text-muted",
    iconToneClassName: "bg-surface-muted",
    id: "new_active_patients",
    key: "new_active_patients",
    label: "Novos pacientes ativos",
    strokeClassName: "stroke-muted",
  },
  {
    dotClassName: "bg-subtle",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.new_active_users.psychologists,
    icon: UserRound,
    iconClassName: "text-subtle",
    iconToneClassName: "bg-surface-muted",
    id: "new_active_psychologists",
    key: "new_active_psychologists",
    label: "Novos psicólogos ativos",
    strokeClassName: "stroke-subtle",
  },
] as const satisfies readonly CommunityStatisticsMetricConfig[];

export const COMMUNITY_CONTENT_STATISTICS_METRICS = [
  {
    dotClassName: "bg-success",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.posts.patients,
    icon: FileText,
    iconClassName: "text-success",
    iconToneClassName: "bg-success/10",
    id: "patient_posts",
    key: "patient_posts",
    label: "Postagens de pacientes",
    strokeClassName: "stroke-success",
  },
  {
    dotClassName: "bg-primary",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.posts.psychologists,
    icon: FileText,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "psychologist_posts",
    key: "psychologist_posts",
    label: "Postagens de Psicólogos",
    strokeClassName: "stroke-primary",
  },
  {
    dotClassName: "bg-warning",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.replies.verified_psychologists,
    icon: Reply,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning/10",
    id: "verified_psychologist_replies",
    key: "verified_psychologist_replies",
    label: "Respostas de psicólogos verificados",
    strokeClassName: "stroke-warning",
  },
  {
    dotClassName: "bg-danger",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.replies.unverified_psychologists,
    icon: Reply,
    iconClassName: "text-danger",
    iconToneClassName: "bg-danger/10",
    id: "unverified_psychologist_replies",
    key: "unverified_psychologist_replies",
    label: "Respostas de psicólogos não verificados",
    strokeClassName: "stroke-danger",
  },
  {
    dotClassName: "bg-muted",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.replies.patient_comments,
    icon: MessageCircle,
    iconClassName: "text-muted",
    iconToneClassName: "bg-surface-muted",
    id: "patient_comments",
    key: "patient_comments",
    label: "Comentários de pacientes",
    strokeClassName: "stroke-muted",
  },
  {
    dotClassName: "bg-subtle",
    getValue: (statistics: AdminCommunityStatistics) => statistics.counters.reports.total,
    icon: AlertTriangle,
    iconClassName: "text-subtle",
    iconToneClassName: "bg-surface-muted",
    id: "reports",
    key: "reports",
    label: "Denúncias",
    strokeClassName: "stroke-subtle",
  },
  {
    dotClassName: "bg-success",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.content_engagement.upvotes,
    icon: ArrowUp,
    iconClassName: "text-success",
    iconToneClassName: "bg-success/10",
    id: "upvotes",
    key: "upvotes",
    label: "Upvotes",
    strokeClassName: "stroke-success",
  },
  {
    dotClassName: "bg-danger",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.content_engagement.downvotes,
    icon: ArrowDown,
    iconClassName: "text-danger",
    iconToneClassName: "bg-danger/10",
    id: "downvotes",
    key: "downvotes",
    label: "Downvotes",
    strokeClassName: "stroke-danger",
  },
  {
    dotClassName: "bg-warning",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.content_engagement.saves,
    icon: Bookmark,
    iconClassName: "text-warning",
    iconToneClassName: "bg-warning/10",
    id: "saves",
    key: "saves",
    label: "Salvamentos",
    strokeClassName: "stroke-warning",
  },
  {
    dotClassName: "bg-primary",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.content_engagement.whatsapp_clicks,
    icon: MessageCircle,
    iconClassName: "text-primary",
    iconToneClassName: "bg-primary-soft",
    id: "whatsapp_clicks",
    key: "whatsapp_clicks",
    label: "Cliques WhatsApp",
    strokeClassName: "stroke-primary",
  },
  {
    dotClassName: "bg-muted",
    getValue: (statistics: AdminCommunityStatistics) =>
      statistics.counters.content_engagement.profile_accesses,
    icon: Eye,
    iconClassName: "text-muted",
    iconToneClassName: "bg-surface-muted",
    id: "profile_accesses",
    key: "profile_accesses",
    label: "Acesso ao perfil",
    strokeClassName: "stroke-muted",
  },
] as const satisfies readonly CommunityStatisticsMetricConfig[];

export const communityStatisticsMetricValue = (
  statistics: AdminCommunityStatistics,
  config: CommunityStatisticsMetricConfig,
) => safeCommunityStatisticCount(config.getValue(statistics));

export const buildCommunityStatisticsMetricItems = (
  statistics: AdminCommunityStatistics,
  configs: readonly CommunityStatisticsMetricConfig[],
  previousStatistics?: AdminCommunityStatistics,
): CommunityStatisticsMetricItem[] =>
  configs.map((config) => {
    const value = communityStatisticsMetricValue(statistics, config);
    const previousValue =
      previousStatistics && communityStatisticsMetricValue(previousStatistics, config);

    return {
      ...config,
      comparison: previousStatistics
        ? buildCommunityStatisticsMetricComparison(
            value,
            previousValue ?? 0,
            previousStatistics.period,
          )
        : undefined,
      details: config.getDetails?.(statistics),
      value,
    };
  });

export const formatCommunityStatisticsComparisonChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatCommunityStatisticsPreviousPeriod = (
  comparison: CommunityStatisticsMetricComparison,
) => `${formatDayMonth(comparison.previous_from)} - ${formatDayMonth(comparison.previous_to)}`;

export const toggleCommunityStatisticsMetricIds = (current: string[], metricId: string) => {
  if (!current.includes(metricId)) return [...current, metricId];
  if (current.length <= 1) return current;

  return current.filter((item) => item !== metricId);
};
