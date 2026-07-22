import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminFinanceDashboard,
  AdminFinanceDateRange,
  AdminFinanceGroupBy,
  AdminFinanceMetric,
  AdminFinancePeriod,
  AdminFinanceQuery,
  AdminFinanceSeriesPoint,
  AdminFinanceSubscriptionItem,
  IAdminFinanceDashboardDTO,
} from "../DTOs/IAdminFinanceDashboardDTO";
import { AdminFinanceDashboardRepository } from "../repositories/AdminFinanceDashboardRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const DEFAULT_SUBSCRIPTION_TAKE = 50;

const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

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

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);

const resolveGroupBy = (value: AdminFinanceQuery["groupBy"], days: number): AdminFinanceGroupBy => {
  if (value === "month" || value === "week") return value;
  if (days > 180) return "month";
  if (days > 62) return "week";

  return "day";
};

type FinancePeriodResolution = {
  current: AdminFinanceDateRange;
  days: number;
  groupBy: AdminFinanceGroupBy;
  period: AdminFinancePeriod;
  previous: AdminFinanceDateRange;
};

type PeriodResult =
  | {
      period: FinancePeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

const resolvePeriod = (
  query: AdminFinanceQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 30 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { code: "invalid_analytics_date_range", success: false };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { code: "invalid_analytics_date_range", success: false };
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
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    if (start > end) start = startOfDate(today);
    label = "Todo o período";
  } else if (preset) {
    return { code: "invalid_analytics_date_range", success: false };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { code: "invalid_analytics_date_range", success: false };
  }

  const groupBy = resolveGroupBy(query.groupBy, days);
  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    period: {
      current: { end, start },
      days,
      groupBy,
      period: {
        days,
        from: toDateKey(start),
        group_by: groupBy,
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
      previous: { end: previousEnd, start: previousStart },
    },
    success: true,
  };
};

type Bucket = {
  end: Date;
  end_date: string;
  start: Date;
  start_date: string;
};

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const minDate = (left: Date, right: Date) => (left < right ? left : right);
const maxDate = (left: Date, right: Date) => (left > right ? left : right);

const buildBuckets = (range: AdminFinanceDateRange, groupBy: AdminFinanceGroupBy): Bucket[] => {
  const buckets: Bucket[] = [];
  let cursor = startOfDate(range.start);

  while (cursor <= range.end) {
    let bucketStart = cursor;
    let bucketEnd: Date;

    if (groupBy === "week") {
      bucketEnd = endOfDate(addDays(bucketStart, 6));
    } else if (groupBy === "month") {
      bucketStart = maxDate(startOfMonth(cursor), startOfDate(range.start));
      bucketEnd = endOfMonth(cursor);
    } else {
      bucketEnd = endOfDate(cursor);
    }

    const clippedEnd = minDate(bucketEnd, range.end);
    buckets.push({
      end: clippedEnd,
      end_date: toDateKey(clippedEnd),
      start: bucketStart,
      start_date: toDateKey(bucketStart),
    });

    cursor = startOfDate(addDays(clippedEnd, 1));
  }

  return buckets;
};

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  available?: boolean;
  current: number;
  description: string;
  id: AdminFinanceMetric["id"];
  label: string;
  previous: number;
  source: string;
  unit: AdminFinanceMetric["unit"];
  unavailableReason?: string | null;
}): AdminFinanceMetric => {
  const available = params.available ?? true;
  const change = available ? percentageChange(params.current, params.previous) : null;

  return {
    available,
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend:
      !available || change === null
        ? "unavailable"
        : change > 0
          ? "up"
          : change < 0
            ? "down"
            : "flat",
    unit: params.unit,
    unavailable_reason: params.unavailableReason ?? null,
    value: params.current,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const findPayloadValue = (value: unknown, keys: string[]): unknown => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys);
      if (found !== undefined) return found;
    }

    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const [key, entry] of Object.entries(value)) {
    if (normalizedKeys.includes(key.toLowerCase())) return entry;
  }

  for (const entry of Object.values(value)) {
    const found = findPayloadValue(entry, keys);
    if (found !== undefined) return found;
  }

  return undefined;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toAmountCents = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized =
    trimmed.includes(",") && !trimmed.includes(".") ? trimmed.replace(",", ".") : trimmed;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 100);
};

const extractPaymentAmountCents = (payload: unknown) =>
  toAmountCents(
    findPayloadValue(payload, [
      "transaction_amount",
      "total_paid_amount",
      "paid_amount",
      "amount",
      "value",
    ]),
  );

const isConfirmedPaymentStatus = (payload: unknown) => {
  const status = normalizeText(
    findPayloadValue(payload, ["status", "status_detail", "action", "payment_status"]),
  );

  return ["approved", "accredited", "paid"].some((term) => status.includes(term));
};

const isPaymentEvent = (type: string, payload: unknown) => {
  const typeText = normalizeText(type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

type PaymentEventRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaymentEvents"]>
>[number];

type PaymentRevenue = {
  confirmed_count: number;
  missing_amount_count: number;
  revenue_cents: number;
};

const summarizeRevenue = (events: PaymentEventRecord[]): PaymentRevenue =>
  events.reduce<PaymentRevenue>(
    (accumulator, event) => {
      if (!isPaymentEvent(event.type, event.payload) || !isConfirmedPaymentStatus(event.payload)) {
        return accumulator;
      }

      const amount = extractPaymentAmountCents(event.payload);
      accumulator.confirmed_count += 1;

      if (amount === null) {
        accumulator.missing_amount_count += 1;
        return accumulator;
      }

      accumulator.revenue_cents += amount;
      return accumulator;
    },
    { confirmed_count: 0, missing_amount_count: 0, revenue_cents: 0 },
  );

const recordsInBucket = <T extends { createdAt: Date }>(items: T[], bucket: Bucket) =>
  items.filter((item) => item.createdAt >= bucket.start && item.createdAt <= bucket.end);

type SubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listNewPaidSubscriptions"]>
>[number];

const monthlyPriceCents = (subscription: Pick<SubscriptionRecord, "plan">) => {
  const interval = subscription.plan.interval.toLowerCase();
  if (interval.includes("year") || interval.includes("ano") || interval.includes("annual")) {
    return Math.round(subscription.plan.price_cents / 12);
  }

  return subscription.plan.price_cents;
};

const formatStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ativa: "Ativa",
    cancelada: "Cancelada",
    inadimplente: "Inadimplente",
    inativa: "Inativa",
  };

  return labels[status] ?? status;
};

const mapSubscription = (subscription: SubscriptionRecord): AdminFinanceSubscriptionItem => ({
  created_at: subscription.createdAt.toISOString(),
  current_period_end: subscription.current_period_end?.toISOString() ?? null,
  gateway: subscription.gateway,
  id: subscription.id,
  plan: {
    id: subscription.plan.id,
    interval: subscription.plan.interval,
    name: subscription.plan.name,
    price_cents: subscription.plan.price_cents,
    slug: subscription.plan.slug,
  },
  psychologist: {
    crp: subscription.psychologist.crp,
    email: subscription.psychologist.user.email,
    id: subscription.psychologist.id,
    name: subscription.psychologist.user.name,
  },
  source: subscription.source,
  started_at: subscription.createdAt.toISOString(),
  status: subscription.status,
  status_label: formatStatusLabel(subscription.status),
});

const buildSeries = async (
  buckets: Bucket[],
  paymentEvents: PaymentEventRecord[],
  repository: AdminFinanceDashboardRepository,
): Promise<AdminFinanceSeriesPoint[]> =>
  Promise.all(
    buckets.map(async (bucket) => {
      const [newSubscriptions, activeSubscriptions, cancellations] = await Promise.all([
        repository.countNewPaidSubscriptions(bucket),
        repository.countActivePaidSubscriptionsAt(bucket.end),
        repository.countCancelledPaidSubscriptions(bucket),
      ]);
      const revenue = summarizeRevenue(recordsInBucket(paymentEvents, bucket));

      return {
        active_subscriptions: activeSubscriptions,
        cancellations,
        confirmed_payments: revenue.confirmed_count,
        end_date: bucket.end_date,
        new_subscriptions: newSubscriptions,
        revenue_cents: revenue.revenue_cents,
        start_date: bucket.start_date,
      };
    }),
  );

const buildUnavailable = (currentRevenue: PaymentRevenue, previousRevenue: PaymentRevenue) => {
  const unavailable = [];

  if (currentRevenue.missing_amount_count > 0 || previousRevenue.missing_amount_count > 0) {
    unavailable.push({
      description:
        "Existem eventos de pagamento confirmado sem valor monetário extraível no payload bruto do Mercado Pago; a receita total é exibida como indisponível para não somar valor parcial.",
      id: "revenue_total",
      label: "Receita total",
      source: "payment_event.payload",
    });
  }

  return unavailable;
};

export const buildAdminFinanceDashboard = async (
  query: AdminFinanceQuery,
  options: { subscriptionTake?: number } = {},
): Promise<Resolve> => {
  const normalizedQuery = query ?? {};
  const repository = new AdminFinanceDashboardRepository();
  const allPeriodStartDate =
    normalizedQuery.period === "all" ? await repository.findFinanceStartDate() : null;
  const resolvedPeriod = resolvePeriod(normalizedQuery, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, groupBy, period, previous } = resolvedPeriod.period;
  const subscriptionTake = options.subscriptionTake ?? DEFAULT_SUBSCRIPTION_TAKE;

  const [
    currentPaymentEvents,
    previousPaymentEvents,
    currentNewSubscriptionCount,
    previousNewSubscriptionCount,
    currentActiveSubscriptionCount,
    previousActiveSubscriptionCount,
    currentCancellationCount,
    previousCancellationCount,
    activeSubscriptions,
    newSubscriptions,
  ] = await Promise.all([
    repository.listPaymentEvents(current),
    repository.listPaymentEvents(previous),
    repository.countNewPaidSubscriptions(current),
    repository.countNewPaidSubscriptions(previous),
    repository.countActivePaidSubscriptionsAt(current.end),
    repository.countActivePaidSubscriptionsAt(previous.end),
    repository.countCancelledPaidSubscriptions(current),
    repository.countCancelledPaidSubscriptions(previous),
    repository.listActivePaidSubscriptionsAt(current.end),
    repository.listNewPaidSubscriptions(current, subscriptionTake),
  ]);

  const currentRevenue = summarizeRevenue(currentPaymentEvents);
  const previousRevenue = summarizeRevenue(previousPaymentEvents);
  const revenueAvailable =
    currentRevenue.missing_amount_count === 0 && previousRevenue.missing_amount_count === 0;
  const mrrCents = activeSubscriptions.reduce(
    (sum, subscription) => sum + monthlyPriceCents(subscription),
    0,
  );
  const averageTicketCents =
    currentActiveSubscriptionCount > 0 ? Math.round(mrrCents / currentActiveSubscriptionCount) : 0;
  const nonMonthlyIntervals = activeSubscriptions.some(
    (subscription) => !subscription.plan.interval.toLowerCase().includes("month"),
  );
  const buckets = buildBuckets(current, groupBy);
  const series = await buildSeries(buckets, currentPaymentEvents, repository);
  const unavailable = buildUnavailable(currentRevenue, previousRevenue);

  const dashboard: AdminFinanceDashboard = {
    average_ticket: {
      description:
        "MRR dividido pela quantidade de assinaturas profissionais pagas ativas no snapshot do período.",
      source: "mrr_divided_by_active_paid_subscriptions",
      value_cents: averageTicketCents,
    },
    cards: {
      active_subscriptions: metric({
        current: currentActiveSubscriptionCount,
        description:
          "Assinaturas profissionais pagas ativas no snapshot final do período. Planos gratuitos e cortesias são excluídos.",
        id: "active_subscriptions",
        label: "Assinaturas ativas",
        previous: previousActiveSubscriptionCount,
        source: "professional_subscription.status=ativa + source=mercadopago",
        unit: "count",
      }),
      cancellations: metric({
        current: currentCancellationCount,
        description:
          "Cancelamentos reais persistidos no status local sincronizado pelo gateway, usando updatedAt no período.",
        id: "cancellations",
        label: "Cancelamentos",
        previous: previousCancellationCount,
        source: "professional_subscription.status=cancelada",
        unit: "count",
      }),
      new_subscriptions: metric({
        current: currentNewSubscriptionCount,
        description:
          "Assinaturas profissionais pagas iniciadas no período, sem plano gratuito e sem source=admin_grant.",
        id: "new_subscriptions",
        label: "Novas assinaturas",
        previous: previousNewSubscriptionCount,
        source: "professional_subscription.createdAt + source=mercadopago",
        unit: "count",
      }),
      revenue_total: metric({
        available: revenueAvailable,
        current: currentRevenue.revenue_cents,
        description: revenueAvailable
          ? "Somatório de pagamentos confirmados do Mercado Pago com valor extraído do payload bruto."
          : "Indisponível porque há pagamento confirmado sem valor monetário extraível no payload bruto.",
        id: "revenue_total",
        label: "Receita total",
        previous: previousRevenue.revenue_cents,
        source: "payment_event.gateway=mercadopago",
        unavailableReason: revenueAvailable
          ? null
          : "payment_event_confirmado_sem_valor_monetario_extraivel",
        unit: "currency_cents",
      }),
    },
    coverage_notes: [
      "Fonte visual: _product/proto/admin/Financeiro.png. Builder/Quick Copy não está acessível neste ambiente; a implementação usa a imagem local como referência.",
      "Receita só considera payment_event real do Mercado Pago com status confirmado e valor monetário extraível; não há projeção por quantidade de assinaturas.",
      "Plano gratuito e cortesia administrativa source=admin_grant são excluídos de receita, MRR, ticket médio e cards financeiros.",
      "Cancelamentos usam somente status=cancelada persistido no banco pelo fluxo real de assinatura; não há inferência por ausência de renovação.",
      nonMonthlyIntervals
        ? "Há planos ativos com intervalo não mensal; o MRR normaliza plano anual dividindo por 12 conforme ADR da task."
        : "Todos os planos ativos considerados usam o preço em subscription_plan.price_cents, sem hardcode de valor.",
    ],
    export: {
      available: true,
      format: "csv",
    },
    mrr: {
      description:
        "Soma mensal dos planos pagos ativos no snapshot final do período, usando subscription_plan.price_cents e excluindo gratuito/cortesia.",
      source: "active_paid_subscriptions",
      value_cents: mrrCents,
    },
    new_subscriptions: {
      items: newSubscriptions.map(mapSubscription),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: currentNewSubscriptionCount,
    },
    period,
    series: {
      points: series,
      source: "payment_event+professional_subscription",
    },
    unavailable,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: dashboard,
  };
};

const csvCell = (value: unknown) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const csvRow = (values: unknown[]) => values.map(csvCell).join(",");

const isAdminFinanceDashboard = (data: unknown): data is AdminFinanceDashboard =>
  Boolean(data && typeof data === "object" && "period" in data && "cards" in data);

const buildCsv = (dashboard: AdminFinanceDashboard) => {
  const rows: string[] = [];

  rows.push(csvRow(["Lectum Admin Financeiro"]));
  rows.push(
    csvRow(["periodo", dashboard.period.from, dashboard.period.to, dashboard.period.label]),
  );
  rows.push("");
  rows.push(csvRow(["section", "id", "label", "date", "value", "source", "extra"]));

  for (const card of Object.values(dashboard.cards)) {
    rows.push(
      csvRow([
        "resumo_financeiro",
        card.id,
        card.label,
        "",
        card.available ? card.value : "indisponivel",
        card.source,
        `unit=${card.unit};previous=${card.previous_value};change_percent=${card.change_percent ?? "n/a"};reason=${card.unavailable_reason ?? ""}`,
      ]),
    );
  }

  rows.push(
    csvRow([
      "resumo_financeiro",
      "mrr",
      "Receita recorrente mensal (MRR)",
      "",
      dashboard.mrr.value_cents,
      dashboard.mrr.source,
      dashboard.mrr.description,
    ]),
  );
  rows.push(
    csvRow([
      "resumo_financeiro",
      "average_ticket",
      "Ticket medio mensal por assinatura",
      "",
      dashboard.average_ticket.value_cents,
      dashboard.average_ticket.source,
      dashboard.average_ticket.description,
    ]),
  );

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "start_date",
      "end_date",
      "revenue_cents",
      "confirmed_payments",
      "new_subscriptions",
      "active_subscriptions",
      "cancellations",
    ]),
  );
  for (const point of dashboard.series.points) {
    rows.push(
      csvRow([
        "serie_agregada",
        point.start_date,
        point.end_date,
        point.revenue_cents,
        point.confirmed_payments,
        point.new_subscriptions,
        point.active_subscriptions,
        point.cancellations,
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "subscription_id",
      "created_at",
      "psychologist",
      "email",
      "crp",
      "plan",
      "plan_slug",
      "price_cents",
      "status",
      "source",
      "gateway",
    ]),
  );
  for (const item of dashboard.new_subscriptions.items) {
    rows.push(
      csvRow([
        "novas_assinaturas_de_psicologos",
        item.id,
        item.created_at,
        item.psychologist.name,
        item.psychologist.email,
        item.psychologist.crp ?? "",
        item.plan.name,
        item.plan.slug,
        item.plan.price_cents,
        item.status_label,
        item.source,
        item.gateway ?? "",
      ]),
    );
  }

  rows.push("");
  rows.push(csvRow(["section", "id", "label", "source", "description"]));
  for (const item of dashboard.unavailable) {
    rows.push(csvRow(["indisponivel", item.id, item.label, item.source, item.description]));
  }

  rows.push("");
  rows.push(csvRow(["observacoes"]));
  for (const note of dashboard.coverage_notes) rows.push(csvRow([note]));

  return rows.join("\r\n");
};

export const exportAdminFinanceDashboardCsv = async (
  query: AdminFinanceQuery,
): Promise<Resolve> => {
  const resolve = await buildAdminFinanceDashboard(query, { subscriptionTake: 5000 });
  if (!resolve.success || !isAdminFinanceDashboard(resolve.data)) return resolve;

  const dashboard = resolve.data;
  return {
    status: 200,
    ...msg("index", {}),
    data: {
      csv: buildCsv(dashboard),
      filename: `lectum-financeiro-${dashboard.period.from}_${dashboard.period.to}.csv`,
      mime: "text/csv; charset=utf-8",
    },
  };
};

export default async (data: IAdminFinanceDashboardDTO): Promise<Resolve> => {
  return buildAdminFinanceDashboard(data.q ?? {});
};
