import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminDashboardDateRange,
  AdminDashboardDeviceItem,
  AdminDashboardFinancialPoint,
  AdminDashboardLocationItem,
  AdminDashboardMetric,
  AdminDashboardPendingReport,
  AdminDashboardPeriod,
  AdminDashboardQuery,
  AdminDashboardSeverity,
  AdminDashboardSummary,
  IAdminDashboardSummaryDTO,
} from "../DTOs/IAdminDashboardSummaryDTO";
import { AdminDashboardRepository } from "../repositories/AdminDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const SEVERITY_WEIGHTS: Record<AdminDashboardSeverity, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};
const DEVICE_LABELS: Record<AdminDashboardDeviceItem["device_type"], string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};
const COUNTRY_LABELS: Record<string, string> = {
  AO: "Angola",
  BR: "Brasil",
  BRA: "Brasil",
  MZ: "Moçambique",
  PT: "Portugal",
  PRT: "Portugal",
  US: "Estados Unidos",
  USA: "Estados Unidos",
};

type DashboardPeriodResolution = {
  current: AdminDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminDashboardPeriod;
  previous: AdminDashboardDateRange;
};

type PeriodResult =
  | {
      period: DashboardPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

type SubscriptionRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPaidSubscriptionsUntil"]>
>[number];

type PendingReportRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPendingReports"]>
>[number];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);

  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / 86_400_000) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (
  query: AdminDashboardQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo)
      return { success: false, code: "invalid_analytics_date_range" };

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const today = new Date();
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDate(addDays(today, -(days - 1)));
    end = endOfDate(today);
    label = `Últimos ${days} dias`;
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o período";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));
  const previous = { start: previousStart, end: previousEnd };
  const current = { start, end };

  return {
    success: true,
    period: {
      current,
      days,
      labels: buildLabels(start, days),
      previous,
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
    },
  };
};
const roundPercent = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  id: string;
  label: string;
  previous: number;
  source: string;
  unit?: AdminDashboardMetric["unit"];
  unavailable?: boolean;
  unavailableReason?: string;
}): AdminDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: params.unit ?? "count",
    unavailable: params.unavailable ?? false,
    ...(params.unavailableReason ? { unavailable_reason: params.unavailableReason } : {}),
    value: params.current,
  };
};

const countByDate = (items: Array<{ createdAt: Date }>, labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return labels.map((date) => ({ date, count: counts.get(date) ?? 0 }));
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const normalizeDeviceType = (value: string): AdminDashboardDeviceItem["device_type"] => {
  const normalized = value.toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDevices = (sessions: Array<{ device_type: string }>) => {
  const counts: Record<AdminDashboardDeviceItem["device_type"], number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };

  for (const session of sessions) {
    counts[normalizeDeviceType(session.device_type)] += 1;
  }

  const total = sessions.length;
  const items = (Object.keys(counts) as AdminDashboardDeviceItem["device_type"][])
    .map((deviceType) => ({
      count: counts[deviceType],
      device_type: deviceType,
      label: DEVICE_LABELS[deviceType],
      percentage: safePercentage(counts[deviceType], total),
    }))
    .sort((left, right) => right.count - left.count);

  return { items, total };
};

const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

const buildLocations = (locations: Array<{ country: string | null }>) => {
  const counts = new Map<string, number>();

  for (const location of locations) {
    const country = normalizeCountry(location.country);
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  const total = locations.length;
  const items: AdminDashboardLocationItem[] = [...counts.entries()]
    .map(([country, count]) => ({
      count,
      country,
      percentage: safePercentage(count, total),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  return { items, total };
};

const isBillableSubscription = (subscription: SubscriptionRecord) =>
  subscription.status === "ativa" &&
  subscription.source !== "admin_grant" &&
  subscription.plan.price_cents > 0 &&
  subscription.plan.slug !== "gratuito";

const isActiveAt = (subscription: SubscriptionRecord, day: Date) => {
  const dayEnd = endOfDate(day);

  return (
    subscription.createdAt <= dayEnd &&
    (!subscription.current_period_end || subscription.current_period_end >= startOfDate(day))
  );
};

const estimateMrrAt = (subscriptions: SubscriptionRecord[], day: Date) => {
  const activeSubscriptions = subscriptions.filter(
    (subscription) => isBillableSubscription(subscription) && isActiveAt(subscription, day),
  );
  const mrrCents = activeSubscriptions.reduce(
    (sum, subscription) => sum + subscription.plan.price_cents,
    0,
  );

  return {
    activeSubscriptions: activeSubscriptions.length,
    mrrCents,
  };
};

const buildFinancial = (
  subscriptions: SubscriptionRecord[],
  labels: string[],
  periodEnd: Date,
  days: number,
) => {
  const daily: AdminDashboardFinancialPoint[] = labels.map((label) => {
    const day = parseDateOnly(label, "end")!;
    const estimate = estimateMrrAt(subscriptions, day);

    return {
      active_subscriptions: estimate.activeSubscriptions,
      date: label,
      value_cents: estimate.mrrCents,
    };
  });
  const currentEstimate = estimateMrrAt(subscriptions, periodEnd);

  return {
    confirmed_revenue_available: false,
    daily,
    label:
      "MRR estimado por assinaturas profissionais ativas, excluindo cortesias administrativas.",
    mrr_cents: currentEstimate.mrrCents,
    period_estimate_cents: Math.round((currentEstimate.mrrCents / 30) * days),
    source: "active_subscription_estimate" as const,
    unavailable_reason:
      "Eventos de pagamento não possuem campo monetário normalizado; por isso o Dashboard exibe estimativa de assinatura ativa, não receita confirmada.",
  };
};

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const normalizeSeverityText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const deriveReportSeverity = (
  report: Pick<PendingReportRecord, "reason" | "target_type">,
) => {
  const text = normalizeSeverityText(`${report.reason} ${report.target_type}`);

  if (
    ["odio", "violencia", "risco", "ameaca", "suic", "automutil", "abuso"].some((term) =>
      text.includes(term),
    )
  ) {
    return "alta" as const;
  }

  if (
    report.target_type === "reply" ||
    ["ofens", "desrespeito", "desinform", "assedio", "spam"].some((term) => text.includes(term))
  ) {
    return "media" as const;
  }

  return "baixa" as const;
};

const mapPendingReport = (report: PendingReportRecord): AdminDashboardPendingReport => {
  const severity = deriveReportSeverity(report);
  const isReply = report.target_type === "reply" && report.reply;
  const communityName = isReply ? report.reply?.post.community.name : report.post.community.name;
  const targetTitle = isReply
    ? report.reply?.title ||
      snippet(report.reply?.content, report.reply?.post.title || "Comentário denunciado")
    : report.post.title || snippet(report.post.content, "Post denunciado");

  return {
    community_name: communityName ?? null,
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reporter_role: report.reporter.role,
    severity,
    status: report.status,
    target_id: report.target_id,
    target_title: targetTitle,
    target_type: report.target_type,
  };
};

const buildPendingReports = (reports: PendingReportRecord[], total: number) => ({
  items: reports
    .map(mapPendingReport)
    .sort((left, right) => {
      const severityDiff = SEVERITY_WEIGHTS[right.severity] - SEVERITY_WEIGHTS[left.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })
    .slice(0, 5),
  source: "post_report" as const,
  total,
});

export const buildDashboardSummary = async (query: AdminDashboardQuery): Promise<Resolve> => {
  const repository = new AdminDashboardRepository();
  const allPeriodStartDate =
    query?.period === "all" ? await repository.findEarliestDashboardDate() : null;
  const resolvedPeriod = resolvePeriod(query ?? {}, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, days, labels, period, previous } = resolvedPeriod.period;

  const [
    sessions,
    previousSessions,
    patients,
    previousPatients,
    psychologists,
    previousPsychologists,
    pendingReportsTotal,
    previousPendingReports,
    patientCommunityPostDates,
    psychologistCommunityPostDates,
    patientCommentDates,
    psychologistReplyDates,
    visitorLocations,
    visitorSessions,
    paidSubscriptions,
    pendingReportRows,
  ] = await Promise.all([
    repository.countVisitorSessions(current),
    repository.countVisitorSessions(previous),
    repository.countUsersByRole("paciente", current),
    repository.countUsersByRole("paciente", previous),
    repository.countUsersByRole("psicologo", current),
    repository.countUsersByRole("psicologo", previous),
    repository.countPendingReports(current),
    repository.countPendingReports(previous),
    repository.listCommunityPostDates(current, "paciente"),
    repository.listCommunityPostDates(current, "psicologo"),
    repository.listPostReplyDates(current, "paciente"),
    repository.listPostReplyDates(current, "psicologo"),
    repository.listVisitorLocations(current),
    repository.listVisitorSessions(current),
    repository.listPaidSubscriptionsUntil(current.end),
    repository.listPendingReports(current),
  ]);

  const financial = buildFinancial(paidSubscriptions, labels, current.end, days);
  const previousFinancial = estimateMrrAt(paidSubscriptions, previous.end);
  const devices = buildDevices(visitorSessions);
  const locations = buildLocations(visitorLocations);

  const summary: AdminDashboardSummary = {
    cards: {
      patients: metric({
        current: patients,
        description: "Pacientes ativos cadastrados no período selecionado.",
        id: "patients",
        label: "Pacientes",
        previous: previousPatients,
        source: "user.role=paciente",
      }),
      pending_reports: metric({
        current: pendingReportsTotal,
        description: "Denúncias pendentes registradas no período selecionado.",
        id: "pending_reports",
        label: "Denúncias pendentes",
        previous: previousPendingReports,
        source: "post_report.status=pendente",
      }),
      psychologists: metric({
        current: psychologists,
        description: "Psicólogos ativos cadastrados no período selecionado.",
        id: "psychologists",
        label: "Psicólogos",
        previous: previousPsychologists,
        source: "user.role=psicologo",
      }),
      revenue: metric({
        current: financial.mrr_cents,
        description:
          "MRR estimado por assinaturas profissionais ativas. Não representa receita confirmada no gateway.",
        id: "revenue",
        label: "MRR estimado",
        previous: previousFinancial.mrrCents,
        source: financial.source,
        unit: "currency_cents",
      }),
      sessions: metric({
        current: sessions,
        description: "Sessões reais capturadas em visitor_session no período selecionado.",
        id: "sessions",
        label: "Sessões do site",
        previous: previousSessions,
        source: "visitor_session",
      }),
    },
    community_activity: {
      comments: countByDate([...patientCommentDates, ...psychologistReplyDates], labels),
      patient_comments: countByDate(patientCommentDates, labels),
      patient_posts: countByDate(patientCommunityPostDates, labels),
      posts: countByDate([...patientCommunityPostDates, ...psychologistCommunityPostDates], labels),
      psychologist_posts: countByDate(psychologistCommunityPostDates, labels),
      psychologist_replies: countByDate(psychologistReplyDates, labels),
      source: "community_post+post_reply+user.role",
    },
    devices: {
      ...devices,
      source: "visitor_session.device_type",
    },
    financial: {
      confirmed_revenue_available: financial.confirmed_revenue_available,
      daily: financial.daily,
      label: financial.label,
      mrr_cents: financial.mrr_cents,
      period_estimate_cents: financial.period_estimate_cents,
      source: financial.source,
      unavailable_reason: financial.unavailable_reason,
    },
    locations: {
      ...locations,
      source: "visitor_location.country",
    },
    pending_reports: buildPendingReports(pendingReportRows, pendingReportsTotal),
    period,
    unavailable: [
      {
        description:
          "O schema payment_event armazena payload bruto do gateway sem valor monetário normalizado para somatório confiável.",
        id: "confirmed_revenue",
        label: "Receita confirmada",
        source: "payment_event",
      },
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminDashboardSummaryDTO): Promise<Resolve> => {
  return buildDashboardSummary(data.q ?? {});
};
