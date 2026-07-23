import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminFinanceChargeItem,
  AdminFinanceDashboard,
  AdminFinanceDateRange,
  AdminFinanceGroupBy,
  AdminFinanceMetric,
  AdminFinancePaymentHealth,
  AdminFinancePaymentHistory,
  AdminFinancePaymentHistoryItem,
  AdminFinancePaymentHistoryStatus,
  AdminFinancePaymentMethod,
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
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const DASHBOARD_TABLE_PREVIEW_TAKE = 5;
const MAX_PAYMENT_HISTORY_ITEMS = 10;
const DAYS_PER_AVERAGE_MONTH = 30.4375;
const MILLISECONDS_PER_DAY = 86_400_000;
const SUBSCRIPTION_STATUS_FILTERS = new Set(["ativa", "cancelada", "inadimplente"]);

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

export const resolveAdminFinancePeriod = (
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
  ratePercent?: number | null;
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
    rate_percent: params.ratePercent ?? null,
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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyPayload = (value: unknown) => {
  try {
    return JSON.stringify(value ?? "").toLowerCase();
  } catch {
    return String(value ?? "").toLowerCase();
  }
};

export const payloadContainsAnyReference = (payload: unknown, references: string[]) => {
  const text = stringifyPayload(payload);

  return references.some((reference) => text.includes(reference.toLowerCase()));
};

export const findPayloadValue = (value: unknown, keys: string[]): unknown => {
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

export const extractPaymentAmountCents = (payload: unknown) =>
  toAmountCents(
    findPayloadValue(payload, [
      "transaction_amount",
      "total_paid_amount",
      "paid_amount",
      "amount",
      "value",
    ]),
  );

export const isConfirmedPaymentStatus = (payload: unknown) => {
  const status = normalizeText(
    findPayloadValue(payload, ["status", "status_detail", "action", "payment_status"]),
  );

  return ["approved", "accredited", "paid"].some((term) => status.includes(term));
};

export const isPaymentEvent = (type: string, payload: unknown) => {
  const typeText = normalizeText(type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

type PaymentEventRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaymentEvents"]>
>[number];

type LifetimeSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForLifetime"]>
>[number];

type CancelledLifetimeSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listCancelledPaidSubscriptionsForLifetime"]>
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

const summarizeAverageLtv = (
  subscriptions: LifetimeSubscriptionRecord[],
  paymentEvents: PaymentEventRecord[],
) => {
  const paidPsychologistCount = new Set(
    subscriptions.map((subscription) => subscription.psychologist_id),
  ).size;
  const references = Array.from(
    new Set(
      subscriptions.flatMap((subscription) =>
        [subscription.id, subscription.gateway_subscription_id].filter(
          (reference): reference is string => Boolean(reference && reference.length > 3),
        ),
      ),
    ),
  );

  let linkedConfirmedPayments = 0;
  let missingAmountCount = 0;
  let revenueCents = 0;

  if (references.length > 0) {
    for (const event of paymentEvents) {
      if (!isPaymentEvent(event.type, event.payload)) continue;
      if (!isConfirmedPaymentStatus(event.payload)) continue;
      if (!payloadContainsAnyReference(event.payload, references)) continue;

      linkedConfirmedPayments += 1;
      const amount = extractPaymentAmountCents(event.payload);
      if (amount === null) {
        missingAmountCount += 1;
        continue;
      }

      revenueCents += amount;
    }
  }

  const available = missingAmountCount === 0;

  return {
    available,
    linkedConfirmedPayments,
    paidPsychologistCount,
    unavailableReason: available ? null : "payment_event_vinculado_sem_valor_monetario_extraivel",
    valueCents:
      available && paidPsychologistCount > 0 ? Math.round(revenueCents / paidPsychologistCount) : 0,
  };
};

const summarizeAverageSubscriptionLifetime = (
  subscriptions: CancelledLifetimeSubscriptionRecord[],
) => {
  if (subscriptions.length === 0) {
    return {
      available: false,
      cancelledSubscriptionCount: 0,
      unavailableReason: "Sem assinaturas pagas canceladas em todo o período.",
      valueDays: 0,
      valueMonths: 0,
    };
  }

  const totalDays = subscriptions.reduce((sum, subscription) => {
    const durationInDays = Math.max(
      0,
      (subscription.updatedAt.getTime() - subscription.createdAt.getTime()) / MILLISECONDS_PER_DAY,
    );

    return sum + durationInDays;
  }, 0);
  const valueDays = roundPercent(totalDays / subscriptions.length);

  return {
    available: true,
    cancelledSubscriptionCount: subscriptions.length,
    unavailableReason: null,
    valueDays,
    valueMonths: roundPercent(valueDays / DAYS_PER_AVERAGE_MONTH),
  };
};

const recordsInBucket = <T extends { createdAt: Date }>(items: T[], bucket: Bucket) =>
  items.filter((item) => item.createdAt >= bucket.start && item.createdAt <= bucket.end);

type SubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listNewPaidSubscriptions"]>
>[number];

type SubscriptionRelationRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForRelation"]>
>[number];

type PaymentReferenceSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForPaymentReferenceAt"]>
>[number];

type NewSubscriptionValueRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listNewPaidSubscriptionValues"]>
>[number];

type FinanceSubscriptionRecord =
  | PaymentReferenceSubscriptionRecord
  | SubscriptionRecord
  | SubscriptionRelationRecord;

type SubscriptionReferenceRecord = {
  gateway_subscription_id: string | null;
  id: string;
};

const monthlyPriceCents = (subscription: Pick<SubscriptionRecord, "plan">) => {
  const interval = subscription.plan.interval.toLowerCase();
  if (interval.includes("year") || interval.includes("ano") || interval.includes("annual")) {
    return Math.round(subscription.plan.price_cents / 12);
  }

  return subscription.plan.price_cents;
};

const sumSubscriptionPlanRevenueCents = (subscriptions: NewSubscriptionValueRecord[]) =>
  subscriptions.reduce((sum, subscription) => sum + subscription.plan.price_cents, 0);

const calculateChurnRatePercent = (cancellations: number, openingBase: number) => {
  if (openingBase === 0) return null;

  return roundPercent((cancellations / openingBase) * 100);
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

const mapPaymentMethod = (
  subscription: FinanceSubscriptionRecord,
): AdminFinancePaymentMethod | null => {
  const methods = subscription.psychologist.user.payment_methods;
  const matchedMethod =
    methods.find(
      (method) =>
        Boolean(subscription.gateway_subscription_id) &&
        method.gateway_token === subscription.gateway_subscription_id,
    ) ?? null;
  const method = matchedMethod ?? methods[0] ?? null;

  if (!method) return null;

  return {
    brand: method.brand ?? null,
    exp_month: method.exp_month ?? null,
    exp_year: method.exp_year ?? null,
    gateway: method.gateway,
    last4: method.last4 ?? null,
    matches_subscription: Boolean(matchedMethod),
    saved_at: method.updatedAt?.toISOString() ?? null,
  };
};

const subscriptionReferenceValues = (subscription: SubscriptionReferenceRecord) =>
  [subscription.id, subscription.gateway_subscription_id].filter((reference): reference is string =>
    Boolean(reference && reference.length > 3),
  );

const toPayloadString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
};

const extractPaymentReference = (payload: unknown) =>
  toPayloadString(
    findPayloadValue(payload, [
      "external_reference",
      "preapproval_id",
      "preapproval",
      "subscription_id",
      "gateway_subscription_id",
      "payment_id",
      "id",
    ]),
  );

const extractPaymentStatusDetail = (payload: unknown) =>
  toPayloadString(findPayloadValue(payload, ["status_detail", "status", "payment_status"]));

const plural = (count: number, singular: string, pluralized: string) =>
  count === 1 ? singular : pluralized;

const daysSince = (date: Date, now = new Date()) =>
  Math.max(
    0,
    Math.floor((startOfDate(now).getTime() - startOfDate(date).getTime()) / MILLISECONDS_PER_DAY),
  );

const resolvePaymentHistoryStatus = (
  event: PaymentEventRecord,
): {
  label: string;
  status: AdminFinancePaymentHistoryStatus;
} => {
  const status = normalizeText(
    findPayloadValue(event.payload, ["status", "status_detail", "action", "payment_status"]),
  );
  const source = `${status} ${normalizeText(event.type)}`;

  if (["approved", "accredited", "paid"].some((term) => source.includes(term))) {
    return { label: "Aprovada", status: "successful" };
  }

  if (["rejected", "refused", "charged_back", "chargeback"].some((term) => source.includes(term))) {
    return { label: "Recusada", status: "failed" };
  }

  if (source.includes("cancelled") || source.includes("canceled")) {
    return { label: "Cancelada", status: "failed" };
  }

  if (
    ["pending", "in_process", "authorized", "in_mediation"].some((term) => source.includes(term))
  ) {
    return { label: "Pendente", status: "pending" };
  }

  return { label: "Processada", status: "processed" };
};

const mapPaymentHistoryItem = (event: PaymentEventRecord): AdminFinancePaymentHistoryItem => {
  const amountCents = extractPaymentAmountCents(event.payload);
  const status = resolvePaymentHistoryStatus(event);

  return {
    amount_available: amountCents !== null,
    amount_cents: amountCents,
    event_id: event.id,
    event_type: event.type,
    external_id: event.external_id,
    gateway: "mercadopago",
    occurred_at: event.createdAt.toISOString(),
    reference: extractPaymentReference(event.payload),
    status: status.status,
    status_detail: extractPaymentStatusDetail(event.payload),
    status_label: status.label,
    title: "Cobrança da assinatura",
    unavailable_reason:
      amountCents === null && status.status === "successful"
        ? "payment_event_confirmado_sem_valor_monetario_extraivel"
        : null,
  };
};

const paymentHistoryForSubscription = (
  subscription: SubscriptionReferenceRecord,
  paymentEvents?: PaymentEventRecord[],
) => {
  if (!paymentEvents || paymentEvents.length === 0) return [];

  const references = subscriptionReferenceValues(subscription);
  if (references.length === 0) return [];

  return paymentEvents
    .filter((event) => isPaymentEvent(event.type, event.payload))
    .filter((event) => payloadContainsAnyReference(event.payload, references))
    .map(mapPaymentHistoryItem)
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));
};

const buildPaymentHealthSummary = (params: {
  consecutiveFailures: number;
  daysOverdue: number | null;
  failedPayments: number;
  finalAttempts: number;
  pendingPayments: number;
  status: AdminFinancePaymentHealth["status"];
  successRatePercent: number | null;
}) => {
  if (params.status === "critical") {
    if (params.daysOverdue !== null && params.daysOverdue > 0) {
      const failureSummary =
        params.consecutiveFailures > 0
          ? `${params.consecutiveFailures} ${plural(params.consecutiveFailures, "falha seguida", "falhas seguidas")}`
          : "histórico insuficiente";

      return `Inadimplente há ${params.daysOverdue} ${plural(params.daysOverdue, "dia", "dias")} · ${failureSummary}`;
    }

    return `${params.consecutiveFailures} ${plural(params.consecutiveFailures, "falha seguida", "falhas seguidas")} · crítico`;
  }

  if (params.status === "risk") {
    if (params.consecutiveFailures > 0) {
      return `${params.consecutiveFailures} ${plural(params.consecutiveFailures, "falha seguida", "falhas seguidas")} · risco`;
    }

    return params.successRatePercent === null
      ? "Inadimplente · risco"
      : `${params.successRatePercent}% de sucesso · risco`;
  }

  if (params.status === "attention") {
    if (params.pendingPayments > 0) {
      return `${params.pendingPayments} ${plural(params.pendingPayments, "cobrança pendente", "cobranças pendentes")} · atenção`;
    }

    if (params.failedPayments > 0 && params.successRatePercent !== null) {
      return `${params.successRatePercent}% de sucesso · atenção`;
    }

    return "Histórico recente exige atenção";
  }

  if (params.status === "healthy") {
    return params.successRatePercent === null
      ? "Sem falhas recentes"
      : `${params.successRatePercent}% de sucesso · saudável`;
  }

  return "Histórico insuficiente";
};

const buildPaymentInsights = (
  subscription: FinanceSubscriptionRecord,
  paymentEvents?: PaymentEventRecord[],
): {
  health: AdminFinancePaymentHealth;
  history: AdminFinancePaymentHistory;
} => {
  const now = new Date();
  const allHistory = paymentHistoryForSubscription(subscription, paymentEvents);
  const successfulPayments = allHistory.filter((item) => item.status === "successful");
  const failedPayments = allHistory.filter((item) => item.status === "failed");
  const pendingPayments = allHistory.filter((item) => item.status === "pending");
  const finalAttempts = successfulPayments.length + failedPayments.length;
  const successRatePercent =
    finalAttempts > 0 ? roundPercent((successfulPayments.length / finalAttempts) * 100) : null;
  const lastSuccessAt = successfulPayments[0]?.occurred_at ?? null;
  const lastFailureAt = failedPayments[0]?.occurred_at ?? null;

  let consecutiveFailures = 0;
  for (const item of allHistory) {
    if (item.status === "pending" || item.status === "processed") continue;
    if (item.status === "failed") {
      consecutiveFailures += 1;
      continue;
    }

    break;
  }

  const overdueReference =
    subscription.current_period_end && subscription.current_period_end < now
      ? subscription.current_period_end
      : subscription.status === "inadimplente"
        ? subscription.updatedAt
        : null;
  const daysOverdue =
    subscription.status === "inadimplente" && overdueReference
      ? Math.max(1, daysSince(overdueReference, now))
      : null;

  const status: AdminFinancePaymentHealth["status"] =
    subscription.status === "inadimplente" && ((daysOverdue ?? 0) >= 7 || consecutiveFailures >= 3)
      ? "critical"
      : consecutiveFailures >= 3
        ? "critical"
        : subscription.status === "inadimplente" ||
            consecutiveFailures >= 2 ||
            (finalAttempts >= 3 && successRatePercent !== null && successRatePercent < 70)
          ? "risk"
          : pendingPayments.length > 0 ||
              consecutiveFailures === 1 ||
              (finalAttempts >= 3 && successRatePercent !== null && successRatePercent < 90) ||
              (finalAttempts > 0 && finalAttempts < 3 && failedPayments.length > 0)
            ? "attention"
            : finalAttempts > 0
              ? "healthy"
              : "insufficient_history";

  const notes: string[] = [];
  if (finalAttempts > 0 && finalAttempts < 3) {
    notes.push("Amostra pequena: interprete a taxa junto com falhas consecutivas e status atual.");
  }
  if (pendingPayments.length > 0) {
    notes.push("Há cobrança pendente/processando no payment_event; ela não entra na taxa final.");
  }
  if (subscription.status === "inadimplente") {
    notes.push("O status local da assinatura está inadimplente.");
  }
  if (allHistory.length === 0) {
    notes.push(
      "Nenhum payment_event de cobrança foi reconciliado pelo id local da assinatura ou gateway_subscription_id.",
    );
  }
  if (allHistory.length > MAX_PAYMENT_HISTORY_ITEMS) {
    notes.push(`Mostrando as ${MAX_PAYMENT_HISTORY_ITEMS} cobranças mais recentes.`);
  }

  const summary = buildPaymentHealthSummary({
    consecutiveFailures,
    daysOverdue,
    failedPayments: failedPayments.length,
    finalAttempts,
    pendingPayments: pendingPayments.length,
    status,
    successRatePercent,
  });

  return {
    health: {
      consecutive_failures: consecutiveFailures,
      days_overdue: daysOverdue,
      failed_payments: failedPayments.length,
      final_attempts: finalAttempts,
      label:
        status === "healthy"
          ? "Saudável"
          : status === "attention"
            ? "Atenção"
            : status === "risk"
              ? "Risco"
              : status === "critical"
                ? "Crítica"
                : "Histórico insuficiente",
      last_failure_at: lastFailureAt,
      last_success_at: lastSuccessAt,
      notes,
      pending_payments: pendingPayments.length,
      source: "payment_event+professional_subscription",
      status,
      successful_payments: successfulPayments.length,
      success_rate_percent: successRatePercent,
      summary,
      total_events: allHistory.length,
    },
    history: {
      available: allHistory.length > 0,
      items: allHistory.slice(0, MAX_PAYMENT_HISTORY_ITEMS),
      reason:
        allHistory.length > 0
          ? null
          : "Nenhum pagamento real foi encontrado para esta assinatura nos payment_events reconciliados.",
      source: "payment_event.filtered_by_subscription_reference",
      total: allHistory.length,
    },
  };
};

const findLatestConfirmedPaymentForSubscription = (
  subscription: SubscriptionReferenceRecord,
  paymentEvents?: PaymentEventRecord[],
) => {
  if (!paymentEvents || paymentEvents.length === 0) return null;

  const references = subscriptionReferenceValues(subscription);
  if (references.length === 0) return null;

  let latest: PaymentEventRecord | null = null;

  for (const event of paymentEvents) {
    if (!isPaymentEvent(event.type, event.payload)) continue;
    if (!isConfirmedPaymentStatus(event.payload)) continue;
    if (!payloadContainsAnyReference(event.payload, references)) continue;
    if (!latest || event.createdAt > latest.createdAt) latest = event;
  }

  return latest;
};

const mapSubscription = (
  subscription: FinanceSubscriptionRecord,
  paymentEvents?: PaymentEventRecord[],
): AdminFinanceSubscriptionItem => {
  const latestPayment = findLatestConfirmedPaymentForSubscription(subscription, paymentEvents);
  const paymentInsights = buildPaymentInsights(subscription, paymentEvents);

  return {
    created_at: subscription.createdAt.toISOString(),
    current_period_end: subscription.current_period_end?.toISOString() ?? null,
    detail_url: `/psicologos/${subscription.psychologist.user.id}`,
    gateway: subscription.gateway,
    gateway_subscription_id: subscription.gateway_subscription_id,
    id: subscription.id,
    last_charge_at: latestPayment?.createdAt.toISOString() ?? null,
    next_charge_at: subscription.current_period_end?.toISOString() ?? null,
    payment_health: paymentInsights.health,
    payment_history: paymentInsights.history,
    payment_method: mapPaymentMethod(subscription),
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
      profile_id: subscription.psychologist.id,
      user_id: subscription.psychologist.user.id,
    },
    source: subscription.source,
    started_at: subscription.createdAt.toISOString(),
    status: subscription.status,
    status_label: formatStatusLabel(subscription.status),
    updated_at: subscription.updatedAt.toISOString(),
  };
};

const findSubscriptionForPayment = (
  event: PaymentEventRecord,
  subscriptions: PaymentReferenceSubscriptionRecord[],
) =>
  subscriptions.find((subscription) =>
    payloadContainsAnyReference(event.payload, subscriptionReferenceValues(subscription)),
  ) ?? null;

const mapCharge = (
  event: PaymentEventRecord,
  subscriptions: PaymentReferenceSubscriptionRecord[],
): AdminFinanceChargeItem | null => {
  if (!isPaymentEvent(event.type, event.payload)) return null;
  if (!isConfirmedPaymentStatus(event.payload)) return null;

  const amountCents = extractPaymentAmountCents(event.payload);
  const subscription = findSubscriptionForPayment(event, subscriptions);

  return {
    amount_available: amountCents !== null,
    amount_cents: amountCents,
    detail_url: subscription ? `/psicologos/${subscription.psychologist.user.id}` : null,
    event_id: event.id,
    event_type: event.type,
    external_id: event.external_id,
    gateway: "mercadopago",
    occurred_at: event.createdAt.toISOString(),
    reference:
      subscription?.gateway_subscription_id ??
      subscription?.id ??
      extractPaymentReference(event.payload),
    status: "confirmed",
    status_label: "Confirmada",
    subscription: subscription ? mapSubscription(subscription, [event]) : null,
    unavailable_reason:
      amountCents === null ? "payment_event_confirmado_sem_valor_monetario_extraivel" : null,
  };
};

const buildChargeItems = (
  events: PaymentEventRecord[],
  subscriptions: PaymentReferenceSubscriptionRecord[],
) =>
  events
    .map((event) => mapCharge(event, subscriptions))
    .filter((item): item is AdminFinanceChargeItem => Boolean(item))
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));

const normalizeFinancePagination = (query: AdminFinanceQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIST_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

const paginateItems = <T>(items: T[], page: number, limit: number) => {
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / limit));
  const safePage = Math.min(page, pages);
  const skip = (safePage - 1) * limit;

  return {
    count,
    data: items.slice(skip, skip + limit),
    page: safePage,
    pages,
    per_page: limit,
  };
};

const paginationForCount = (query: AdminFinanceQuery, count: number) => {
  const pagination = normalizeFinancePagination(query);
  const pages = Math.max(1, Math.ceil(count / pagination.limit));
  const page = Math.min(pagination.page, pages);

  return {
    ...pagination,
    page,
    pages,
    skip: (page - 1) * pagination.limit,
  };
};

const normalizeSubscriptionRelationFilters = (query: AdminFinanceQuery) => {
  const q = query.q?.trim();
  const status = query.status?.trim();

  return {
    ...(q ? { q } : {}),
    ...(status && status !== "all" && SUBSCRIPTION_STATUS_FILTERS.has(status) ? { status } : {}),
  };
};

const resolveFinanceListPeriod = async (
  query: AdminFinanceQuery,
  repository: AdminFinanceDashboardRepository,
) => {
  const allPeriodStartDate =
    query.period === "all" ? await repository.findFinanceStartDate() : null;

  return resolveAdminFinancePeriod(query, allPeriodStartDate);
};

export const listAdminFinanceCharges = async (query: AdminFinanceQuery): Promise<Resolve> => {
  const repository = new AdminFinanceDashboardRepository();
  const resolvedPeriod = await resolveFinanceListPeriod(query ?? {}, repository);

  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, period } = resolvedPeriod.period;
  const [paymentEvents, paymentReferenceSubscriptions] = await Promise.all([
    repository.listPaymentEvents(current),
    repository.listPaidSubscriptionsForPaymentReferenceAt(current.end),
  ]);
  const pagination = normalizeFinancePagination(query ?? {});
  const charges = buildChargeItems(paymentEvents, paymentReferenceSubscriptions);
  const page = paginateItems(charges, pagination.page, pagination.limit);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      ...page,
      period,
      source: "payment_event+professional_subscription",
    },
  };
};

export const listAdminFinanceSubscriptions = async (query: AdminFinanceQuery): Promise<Resolve> => {
  const repository = new AdminFinanceDashboardRepository();
  const resolvedPeriod = await resolveFinanceListPeriod(query ?? {}, repository);

  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, period } = resolvedPeriod.period;
  const filters = normalizeSubscriptionRelationFilters(query ?? {});
  const count = await repository.countPaidSubscriptionsForRelation(current, filters);
  const pagination = paginationForCount(query ?? {}, count);
  const [subscriptions, lifetimePaymentEvents] = await Promise.all([
    repository.listPaidSubscriptionsForRelation(
      current,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
      filters,
    ),
    repository.listPaymentEventsForLifetime(),
  ]);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      count,
      data: subscriptions.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      page: pagination.page,
      pages: pagination.pages,
      per_page: pagination.limit,
      period,
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
    },
  };
};

const buildSeries = async (
  buckets: Bucket[],
  paymentEvents: PaymentEventRecord[],
  newSubscriptionValues: NewSubscriptionValueRecord[],
  repository: AdminFinanceDashboardRepository,
): Promise<AdminFinanceSeriesPoint[]> =>
  Promise.all(
    buckets.map(async (bucket) => {
      const bucketNewSubscriptions = recordsInBucket(newSubscriptionValues, bucket);
      const [activeSubscriptions, cancellations] = await Promise.all([
        repository.countActivePaidSubscriptionsAt(bucket.end),
        repository.countCancelledPaidSubscriptions(bucket),
      ]);
      const revenue = summarizeRevenue(recordsInBucket(paymentEvents, bucket));

      return {
        active_subscriptions: activeSubscriptions,
        cancellations,
        confirmed_payments: revenue.confirmed_count,
        end_date: bucket.end_date,
        new_subscriptions: bucketNewSubscriptions.length,
        new_subscriptions_revenue_cents: sumSubscriptionPlanRevenueCents(bucketNewSubscriptions),
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
  options: { subscriptionTake?: number; tableTake?: number } = {},
): Promise<Resolve> => {
  const normalizedQuery = query ?? {};
  const repository = new AdminFinanceDashboardRepository();
  const allPeriodStartDate =
    normalizedQuery.period === "all" ? await repository.findFinanceStartDate() : null;
  const resolvedPeriod = resolveAdminFinancePeriod(normalizedQuery, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, groupBy, period, previous } = resolvedPeriod.period;
  const subscriptionTake = options.subscriptionTake ?? DEFAULT_SUBSCRIPTION_TAKE;
  const tableTake = options.tableTake ?? DASHBOARD_TABLE_PREVIEW_TAKE;

  const [
    currentPaymentEvents,
    previousPaymentEvents,
    currentNewSubscriptionValues,
    previousNewSubscriptionValues,
    currentActiveSubscriptionCount,
    previousActiveSubscriptionCount,
    currentCancellationCount,
    previousCancellationCount,
    currentChurnOpeningBaseCount,
    activeSubscriptions,
    lifetimeSubscriptions,
    cancelledLifetimeSubscriptions,
    lifetimePaymentEvents,
    newSubscriptions,
    paymentReferenceSubscriptions,
    subscriptionRelationTotal,
    subscriptionRelationItems,
  ] = await Promise.all([
    repository.listPaymentEvents(current),
    repository.listPaymentEvents(previous),
    repository.listNewPaidSubscriptionValues(current),
    repository.listNewPaidSubscriptionValues(previous),
    repository.countActivePaidSubscriptionsAt(current.end),
    repository.countActivePaidSubscriptionsAt(previous.end),
    repository.countCancelledPaidSubscriptions(current),
    repository.countCancelledPaidSubscriptions(previous),
    repository.countPaidSubscriptionsInOpeningBaseAt(current.start),
    repository.listActivePaidSubscriptionsAt(current.end),
    repository.listPaidSubscriptionsForLifetime(),
    repository.listCancelledPaidSubscriptionsForLifetime(),
    repository.listPaymentEventsForLifetime(),
    repository.listNewPaidSubscriptions(current, subscriptionTake),
    repository.listPaidSubscriptionsForPaymentReferenceAt(current.end),
    repository.countPaidSubscriptionsForRelation(current),
    repository.listPaidSubscriptionsForRelation(current, {
      take: tableTake,
    }),
  ]);

  const currentRevenue = summarizeRevenue(currentPaymentEvents);
  const previousRevenue = summarizeRevenue(previousPaymentEvents);
  const revenueAvailable =
    currentRevenue.missing_amount_count === 0 && previousRevenue.missing_amount_count === 0;
  const mrrCents = activeSubscriptions.reduce(
    (sum, subscription) => sum + monthlyPriceCents(subscription),
    0,
  );
  const currentNewSubscriptionCount = currentNewSubscriptionValues.length;
  const previousNewSubscriptionCount = previousNewSubscriptionValues.length;
  const currentNewSubscriptionRevenueCents = sumSubscriptionPlanRevenueCents(
    currentNewSubscriptionValues,
  );
  const previousNewSubscriptionRevenueCents = sumSubscriptionPlanRevenueCents(
    previousNewSubscriptionValues,
  );
  const currentChurnRatePercent = calculateChurnRatePercent(
    currentCancellationCount,
    currentChurnOpeningBaseCount,
  );
  const averageLtv = summarizeAverageLtv(lifetimeSubscriptions, lifetimePaymentEvents);
  const averageSubscriptionLifetime = summarizeAverageSubscriptionLifetime(
    cancelledLifetimeSubscriptions,
  );
  const nonMonthlyIntervals = activeSubscriptions.some(
    (subscription) => !subscription.plan.interval.toLowerCase().includes("month"),
  );
  const buckets = buildBuckets(current, groupBy);
  const series = await buildSeries(
    buckets,
    currentPaymentEvents,
    currentNewSubscriptionValues,
    repository,
  );
  const currentCharges = buildChargeItems(currentPaymentEvents, paymentReferenceSubscriptions);
  const unavailable = buildUnavailable(currentRevenue, previousRevenue);

  const dashboard: AdminFinanceDashboard = {
    average_ltv: {
      available: averageLtv.available,
      description:
        "Receita confirmada lifetime de todo o período vinculada às assinaturas pagas, dividida pelos psicólogos com assinatura Mercado Pago real.",
      linked_confirmed_payments: averageLtv.linkedConfirmedPayments,
      paid_psychologist_count: averageLtv.paidPsychologistCount,
      source: "payment_event_linked_to_paid_psychologists",
      unavailable_reason: averageLtv.unavailableReason,
      value_cents: averageLtv.valueCents,
    },
    average_subscription_lifetime: {
      available: averageSubscriptionLifetime.available,
      cancelled_subscription_count: averageSubscriptionLifetime.cancelledSubscriptionCount,
      description:
        "Tempo médio entre o início da assinatura paga Mercado Pago e o cancelamento real persistido, usando somente assinaturas canceladas em todo o período.",
      source: "cancelled_paid_subscriptions",
      unavailable_reason: averageSubscriptionLifetime.unavailableReason,
      value_days: averageSubscriptionLifetime.valueDays,
      value_months: averageSubscriptionLifetime.valueMonths,
    },
    cards: {
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
      new_subscriptions_revenue: metric({
        current: currentNewSubscriptionRevenueCents,
        description:
          "Soma do valor dos planos pagos iniciados no período, usando subscription_plan.price_cents e excluindo plano gratuito e cortesia.",
        id: "new_subscriptions_revenue",
        label: "Receita de novas assinaturas",
        previous: previousNewSubscriptionRevenueCents,
        source: "professional_subscription.createdAt + subscription_plan.price_cents",
        unit: "currency_cents",
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
      cancellations: metric({
        current: currentCancellationCount,
        description:
          "Churn de assinaturas profissionais pagas persistido no status local sincronizado pelo gateway, usando updatedAt no período.",
        id: "cancellations",
        label: "Churn",
        previous: previousCancellationCount,
        ratePercent: currentChurnRatePercent,
        source: "professional_subscription.status=cancelada",
        unit: "count",
      }),
    },
    coverage_notes: [
      "Fonte visual: _product/proto/admin/Financeiro.png. Builder/Quick Copy não está acessível neste ambiente; a implementação usa a imagem local como referência.",
      "Receita só considera payment_event real do Mercado Pago com status confirmado e valor monetário extraível; não há projeção por quantidade de assinaturas.",
      "LTV médio dos psicólogos usa sempre todo o período: somente payment_event confirmado vinculado ao id local da assinatura ou gateway_subscription_id, dividido por psicólogos com assinatura paga real.",
      "Lifetime médio dos psicólogos usa sempre todo o período: somente assinaturas pagas Mercado Pago já canceladas, medindo createdAt até updatedAt do cancelamento real persistido.",
      "Plano gratuito e cortesia administrativa source=admin_grant são excluídos de receita, MRR, LTV médio, lifetime médio e cards financeiros.",
      "Churn usa somente status=cancelada persistido no banco pelo fluxo real de assinatura; a taxa divide saídas pela base paga no início do período, sem inferência por ausência de renovação.",
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
    latest_charges: {
      items: currentCharges.slice(0, tableTake),
      source: "payment_event+professional_subscription",
      total: currentCharges.length,
    },
    new_subscriptions: {
      items: newSubscriptions.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: currentNewSubscriptionCount,
    },
    period,
    series: {
      points: series,
      source: "payment_event+professional_subscription",
    },
    subscription_relation: {
      items: subscriptionRelationItems.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: subscriptionRelationTotal,
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
        `unit=${card.unit};previous=${card.previous_value};change_percent=${card.change_percent ?? "n/a"};rate_percent=${card.rate_percent ?? "n/a"};reason=${card.unavailable_reason ?? ""}`,
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
      "average_ltv",
      "LTV medio dos psicologos",
      "",
      dashboard.average_ltv.available ? dashboard.average_ltv.value_cents : "indisponivel",
      dashboard.average_ltv.source,
      `paid_psychologist_count=${dashboard.average_ltv.paid_psychologist_count};linked_confirmed_payments=${dashboard.average_ltv.linked_confirmed_payments};reason=${dashboard.average_ltv.unavailable_reason ?? ""};${dashboard.average_ltv.description}`,
    ]),
  );
  rows.push(
    csvRow([
      "resumo_financeiro",
      "average_subscription_lifetime",
      "Lifetime medio dos psicologos",
      "",
      dashboard.average_subscription_lifetime.available
        ? dashboard.average_subscription_lifetime.value_months
        : "indisponivel",
      dashboard.average_subscription_lifetime.source,
      `value_days=${dashboard.average_subscription_lifetime.value_days};cancelled_subscription_count=${dashboard.average_subscription_lifetime.cancelled_subscription_count};reason=${dashboard.average_subscription_lifetime.unavailable_reason ?? ""};${dashboard.average_subscription_lifetime.description}`,
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
      "new_subscriptions_revenue_cents",
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
        point.new_subscriptions_revenue_cents,
        point.active_subscriptions,
        point.cancellations,
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "payment_event_id",
      "occurred_at",
      "external_id",
      "event_type",
      "amount_cents",
      "status",
      "subscription_id",
      "gateway_subscription_id",
      "psychologist",
      "email",
      "plan",
      "reference",
      "reason",
    ]),
  );
  for (const item of dashboard.latest_charges.items) {
    rows.push(
      csvRow([
        "ultimas_cobrancas_realizadas",
        item.event_id,
        item.occurred_at,
        item.external_id,
        item.event_type,
        item.amount_available ? item.amount_cents : "indisponivel",
        item.status_label,
        item.subscription?.id ?? "",
        item.subscription?.gateway_subscription_id ?? "",
        item.subscription?.psychologist.name ?? "",
        item.subscription?.psychologist.email ?? "",
        item.subscription?.plan.name ?? "",
        item.reference ?? "",
        item.unavailable_reason ?? "",
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "subscription_id",
      "created_at",
      "updated_at",
      "started_at",
      "current_period_end",
      "psychologist",
      "email",
      "crp",
      "plan",
      "plan_slug",
      "interval",
      "price_cents",
      "status",
      "source",
      "gateway",
      "gateway_subscription_id",
    ]),
  );
  for (const item of dashboard.subscription_relation.items) {
    rows.push(
      csvRow([
        "relacao_de_assinaturas",
        item.id,
        item.created_at,
        item.updated_at,
        item.started_at,
        item.current_period_end ?? "",
        item.psychologist.name,
        item.psychologist.email,
        item.psychologist.crp ?? "",
        item.plan.name,
        item.plan.slug,
        item.plan.interval,
        item.plan.price_cents,
        item.status_label,
        item.source,
        item.gateway ?? "",
        item.gateway_subscription_id ?? "",
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
  const resolve = await buildAdminFinanceDashboard(query, {
    subscriptionTake: 5000,
    tableTake: 5000,
  });
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
