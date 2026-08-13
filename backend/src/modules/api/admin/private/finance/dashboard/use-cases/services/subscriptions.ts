import type { GatewaySubscriptionPaymentSummary } from "@/modules/billing/payment-gateway";
import { startOfDate } from "@/utils/date-range";
import type {
  AdminFinancePaymentHealth,
  AdminFinancePaymentHistory,
  AdminFinancePaymentHistoryItem,
  AdminFinancePaymentHistoryStatus,
  AdminFinancePaymentMethod,
  AdminFinanceSubscriptionItem,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import type { AdminFinanceDashboardRepository } from "../../repositories/AdminFinanceDashboardRepository";

import {
  type Bucket,
  extractPaymentAmountCents,
  findPayloadValue,
  type GatewaySummaryBySubscriptionId,
  isConfirmedPaymentStatus,
  isPaymentEvent,
  MAX_PAYMENT_HISTORY_ITEMS,
  MILLISECONDS_PER_DAY,
  normalizeText,
  type PaymentEventRecord,
  payloadContainsAnyReference,
  roundPercent,
} from "./period-revenue";

export const recordsInBucket = <T extends { createdAt: Date }>(items: T[], bucket: Bucket) =>
  items.filter((item) => item.createdAt >= bucket.start && item.createdAt <= bucket.end);

export type SubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listNewPaidSubscriptions"]>
>[number];

export type SubscriptionRelationRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForRelation"]>
>[number];

export type PaymentReferenceSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForPaymentReferenceAt"]>
>[number];

export type NewSubscriptionValueRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listNewPaidSubscriptionValues"]>
>[number];

export type FinanceSubscriptionRecord =
  | PaymentReferenceSubscriptionRecord
  | SubscriptionRecord
  | SubscriptionRelationRecord;

export type SubscriptionReferenceRecord = {
  gateway_subscription_id: string | null;
  id: string;
};

export const monthlyPriceCents = (subscription: Pick<SubscriptionRecord, "plan">) => {
  const interval = subscription.plan.interval.toLowerCase();
  if (interval.includes("year") || interval.includes("ano") || interval.includes("annual")) {
    return Math.round(subscription.plan.price_cents / 12);
  }

  return subscription.plan.price_cents;
};

export const sumSubscriptionPlanRevenueCents = (subscriptions: NewSubscriptionValueRecord[]) =>
  subscriptions.reduce((sum, subscription) => sum + subscription.plan.price_cents, 0);

export const calculateChurnRatePercent = (cancellations: number, openingBase: number) => {
  if (openingBase === 0) return null;

  return roundPercent((cancellations / openingBase) * 100);
};

export const formatStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ativa: "Ativa",
    cancelada: "Cancelada",
    inadimplente: "Inadimplente",
    inativa: "Inativa",
  };

  return labels[status] ?? status;
};

export const mapPaymentMethod = (
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

export const subscriptionReferenceValues = (subscription: SubscriptionReferenceRecord) =>
  [subscription.id, subscription.gateway_subscription_id].filter((reference): reference is string =>
    Boolean(reference && reference.length > 3),
  );

export const toPayloadString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
};

export const extractPaymentReference = (payload: unknown) =>
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

export const extractPaymentStatusDetail = (payload: unknown) =>
  toPayloadString(findPayloadValue(payload, ["status_detail", "status", "payment_status"]));

export const plural = (count: number, singular: string, pluralized: string) =>
  count === 1 ? singular : pluralized;

export const daysSince = (date: Date, now = new Date()) =>
  Math.max(
    0,
    Math.floor((startOfDate(now).getTime() - startOfDate(date).getTime()) / MILLISECONDS_PER_DAY),
  );

export const resolvePaymentHistoryStatus = (
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

export const mapPaymentHistoryItem = (
  event: PaymentEventRecord,
  options: { title?: string } = {},
): AdminFinancePaymentHistoryItem => {
  const amountCents = extractPaymentAmountCents(event.payload);
  const status = resolvePaymentHistoryStatus(event);

  return {
    amount_available: amountCents !== null,
    amount_cents: amountCents,
    event_id: event.id,
    event_type: event.type,
    external_id: event.external_id,
    gateway: "mercadopago",
    internal_id: event.internal_id,
    internal_id_available: event.internal_id > 0,
    occurred_at: event.createdAt.toISOString(),
    reference: extractPaymentReference(event.payload),
    source: "payment_event",
    status: status.status,
    status_detail: extractPaymentStatusDetail(event.payload),
    status_label: status.label,
    title: options.title || "Cobrança da assinatura",
    unavailable_reason:
      amountCents === null && status.status === "successful"
        ? "payment_event_confirmado_sem_valor_monetario_extraivel"
        : null,
  };
};

export const toDateOrNull = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const mapGatewaySummaryPaymentHistoryItem = (
  subscription: FinanceSubscriptionRecord,
  summary?: GatewaySubscriptionPaymentSummary | null,
): AdminFinancePaymentHistoryItem | null => {
  if (!summary || summary.charged_quantity <= 0) return null;

  const occurredAt = toDateOrNull(summary.last_charged_at);
  if (!occurredAt) return null;

  const amountCents =
    summary.last_charged_amount_cents ??
    (summary.charged_quantity === 1 ? summary.charged_amount_cents : null);

  return {
    amount_available: amountCents !== null,
    amount_cents: amountCents,
    event_id: `gateway-summary:${subscription.id}:latest-paid-installment`,
    event_type: "subscription.summary",
    external_id: summary.gateway_subscription_id,
    gateway: "mercadopago",
    internal_id: 0,
    internal_id_available: false,
    occurred_at: occurredAt.toISOString(),
    reference: summary.gateway_subscription_id || subscription.gateway_subscription_id,
    source: "gateway_subscription_summary",
    status: "successful",
    status_detail: null,
    status_label: "Sucesso",
    title: subscription.plan.name || "Plano Profissional",
    unavailable_reason:
      amountCents === null ? "gateway_summary_confirmado_sem_valor_monetario_extraivel" : null,
  };
};

const paymentHistoryDateKey = (item: AdminFinancePaymentHistoryItem) =>
  item.occurred_at.slice(0, 10);

export const mergeGatewaySummaryPaymentHistory = (
  localItems: AdminFinancePaymentHistoryItem[],
  gatewayItem: AdminFinancePaymentHistoryItem | null,
) => {
  if (!gatewayItem) return localItems;

  const gatewayDate = paymentHistoryDateKey(gatewayItem);
  const localWithoutGatewayDay = localItems.filter(
    (item) => paymentHistoryDateKey(item) !== gatewayDate,
  );

  return [gatewayItem, ...localWithoutGatewayDay];
};

export const paymentHistoryForSubscription = (
  subscription: FinanceSubscriptionRecord,
  paymentEvents?: PaymentEventRecord[],
  gatewaySummary?: GatewaySubscriptionPaymentSummary | null,
) => {
  const gatewayItem = mapGatewaySummaryPaymentHistoryItem(subscription, gatewaySummary);

  if (!paymentEvents || paymentEvents.length === 0) {
    return gatewayItem ? [gatewayItem] : [];
  }

  const references = subscriptionReferenceValues(subscription);
  if (references.length === 0) return gatewayItem ? [gatewayItem] : [];

  const localItems = paymentEvents
    .filter((event) => isPaymentEvent(event.type, event.payload))
    .filter((event) => payloadContainsAnyReference(event.payload, references))
    .map((event) =>
      mapPaymentHistoryItem(event, {
        title: subscription.plan.name || "Plano Profissional",
      }),
    )
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));

  return mergeGatewaySummaryPaymentHistory(localItems, gatewayItem).sort(
    (left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at),
  );
};

export const buildPaymentHealthSummary = (params: {
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
      : `${params.successRatePercent}% de sucesso · confiável`;
  }

  return "Histórico insuficiente";
};

export const buildPaymentInsights = (
  subscription: FinanceSubscriptionRecord,
  paymentEvents?: PaymentEventRecord[],
  gatewaySummary?: GatewaySubscriptionPaymentSummary | null,
): {
  health: AdminFinancePaymentHealth;
  history: AdminFinancePaymentHistory;
} => {
  const now = new Date();
  const allHistory = paymentHistoryForSubscription(subscription, paymentEvents, gatewaySummary);
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
    notes.push("Há cobrança pendente ou em processamento; ela não entra na taxa final.");
  }
  if (subscription.status === "inadimplente") {
    notes.push("O status local da assinatura está inadimplente.");
  }
  if (allHistory.length === 0) {
    notes.push("Nenhuma cobrança foi vinculada a esta assinatura.");
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
          ? "Confiável"
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
      source: "payment_event+gateway_subscription_summary+professional_subscription",
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
        allHistory.length > 0 ? null : "Nenhum pagamento foi encontrado para esta assinatura.",
      source: allHistory.some((item) => item.source === "gateway_subscription_summary")
        ? "payment_event+gateway_subscription_summary"
        : "payment_event.filtered_by_subscription_reference",
      total: allHistory.length,
    },
  };
};

export const findLatestConfirmedPaymentForSubscription = (
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

export const mapSubscription = (
  subscription: FinanceSubscriptionRecord,
  paymentEvents?: PaymentEventRecord[],
  gatewaySummaries?: GatewaySummaryBySubscriptionId,
): AdminFinanceSubscriptionItem => {
  const latestPayment = findLatestConfirmedPaymentForSubscription(subscription, paymentEvents);
  const gatewaySummary = gatewaySummaries?.get(subscription.id) ?? null;
  const latestGatewayPayment = mapGatewaySummaryPaymentHistoryItem(subscription, gatewaySummary);
  const latestLocalPaymentAt = latestPayment?.createdAt ?? null;
  const latestGatewayPaymentAt = toDateOrNull(latestGatewayPayment?.occurred_at);
  const latestPaymentAt =
    latestLocalPaymentAt && latestGatewayPaymentAt
      ? new Date(Math.max(latestLocalPaymentAt.getTime(), latestGatewayPaymentAt.getTime()))
      : (latestLocalPaymentAt ?? latestGatewayPaymentAt);
  const paymentInsights = buildPaymentInsights(subscription, paymentEvents, gatewaySummary);

  return {
    cancelled_at: subscription.status === "cancelada" ? subscription.updatedAt.toISOString() : null,
    created_at: subscription.createdAt.toISOString(),
    current_period_end: subscription.current_period_end?.toISOString() ?? null,
    detail_url: `/psicologos/${subscription.psychologist.user.id}`,
    gateway: subscription.gateway,
    gateway_subscription_id: subscription.gateway_subscription_id,
    id: subscription.id,
    internal_id: subscription.internal_id,
    last_charge_at: latestPaymentAt?.toISOString() ?? null,
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
