import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminFinanceChargeItem,
  AdminFinanceDashboard,
  AdminFinanceQuery,
  AdminFinanceSeriesPoint,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import { AdminFinanceDashboardRepository } from "../../repositories/AdminFinanceDashboardRepository";
import { buildChargeItems, fetchGatewayPaymentSummaries } from "./charges-lists";
import {
  type Bucket,
  buildBuckets,
  DASHBOARD_TABLE_PREVIEW_TAKE,
  DEFAULT_SUBSCRIPTION_TAKE,
  metric,
  type PaymentRevenue,
  resolveAdminFinancePeriod,
  summarizeAverageLtv,
  summarizeAverageSubscriptionLifetime,
  summarizeChargeItemsRevenue,
} from "./period-revenue";
import {
  calculateChurnRatePercent,
  mapSubscription,
  monthlyPriceCents,
  type NewSubscriptionValueRecord,
  recordsInBucket,
  sumSubscriptionPlanRevenueCents,
} from "./subscriptions";

export const buildSeries = async (
  buckets: Bucket[],
  chargeItems: AdminFinanceChargeItem[],
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
      const revenue = summarizeChargeItemsRevenue(
        chargeItems.filter((item) => {
          const occurredAt = new Date(item.occurred_at);

          return (
            !Number.isNaN(occurredAt.getTime()) &&
            occurredAt >= bucket.start &&
            occurredAt <= bucket.end
          );
        }),
      );

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

export const buildUnavailable = (
  currentRevenue: PaymentRevenue,
  previousRevenue: PaymentRevenue,
) => {
  const unavailable = [];

  if (currentRevenue.missing_amount_count > 0 || previousRevenue.missing_amount_count > 0) {
    unavailable.push({
      description:
        "Existem pagamentos confirmados sem valor informado pelo Mercado Pago; a receita total fica indisponível para evitar uma soma parcial.",
      id: "revenue_total",
      label: "Receita total",
      source: "payment_event.payload+gateway_subscription_summary",
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
    previousPaymentReferenceSubscriptions,
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
    repository.listPaidSubscriptionsForPaymentReferenceAt(previous.end),
    repository.countPaidSubscriptionsForRelation(current),
    repository.listPaidSubscriptionsForRelation(current, {
      take: tableTake,
    }),
  ]);

  const [
    currentGatewaySummaries,
    previousGatewaySummaries,
    lifetimeGatewaySummaries,
    newSubscriptionGatewaySummaries,
    subscriptionRelationGatewaySummaries,
  ] = await Promise.all([
    fetchGatewayPaymentSummaries(paymentReferenceSubscriptions),
    fetchGatewayPaymentSummaries(previousPaymentReferenceSubscriptions),
    fetchGatewayPaymentSummaries(lifetimeSubscriptions),
    fetchGatewayPaymentSummaries(newSubscriptions),
    fetchGatewayPaymentSummaries(subscriptionRelationItems),
  ]);
  const currentCharges = buildChargeItems(currentPaymentEvents, paymentReferenceSubscriptions, {
    gatewaySummaries: currentGatewaySummaries,
    range: current,
  });
  const previousCharges = buildChargeItems(
    previousPaymentEvents,
    previousPaymentReferenceSubscriptions,
    {
      gatewaySummaries: previousGatewaySummaries,
      range: previous,
    },
  );
  const currentRevenue = summarizeChargeItemsRevenue(currentCharges);
  const previousRevenue = summarizeChargeItemsRevenue(previousCharges);
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
  const averageLtv = summarizeAverageLtv(
    lifetimeSubscriptions,
    lifetimePaymentEvents,
    lifetimeGatewaySummaries,
  );
  const averageSubscriptionLifetime = summarizeAverageSubscriptionLifetime(
    cancelledLifetimeSubscriptions,
  );
  const nonMonthlyIntervals = activeSubscriptions.some(
    (subscription) => !subscription.plan.interval.toLowerCase().includes("month"),
  );
  const buckets = buildBuckets(current, groupBy);
  const series = await buildSeries(
    buckets,
    currentCharges,
    currentNewSubscriptionValues,
    repository,
  );
  const unavailable = buildUnavailable(currentRevenue, previousRevenue);

  const dashboard: AdminFinanceDashboard = {
    average_ltv: {
      available: averageLtv.available,
      description:
        "Receita confirmada durante todo o histórico, dividida pelos psicólogos com assinatura paga pelo Mercado Pago.",
      linked_confirmed_payments: averageLtv.linkedConfirmedPayments,
      paid_psychologist_count: averageLtv.paidPsychologistCount,
      source: "payment_event+gateway_subscription_summary_linked_to_paid_psychologists",
      unavailable_reason: averageLtv.unavailableReason,
      value_cents: averageLtv.valueCents,
    },
    average_subscription_lifetime: {
      available: averageSubscriptionLifetime.available,
      cancelled_subscription_count: averageSubscriptionLifetime.cancelledSubscriptionCount,
      description:
        "Tempo médio entre o início e o cancelamento das assinaturas pagas pelo Mercado Pago.",
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
          ? "Somatório dos pagamentos confirmados com valor informado pelo Mercado Pago."
          : "Indisponível porque há pagamento confirmado sem valor informado pelo Mercado Pago.",
        id: "revenue_total",
        label: "Receita total",
        previous: previousRevenue.revenue_cents,
        source: "payment_event+gateway_subscription_summary.gateway=mercadopago",
        unavailableReason: revenueAvailable
          ? null
          : "pagamento_confirmado_sem_valor_monetario_extraivel",
        unit: "currency_cents",
      }),
      active_subscriptions: metric({
        current: currentActiveSubscriptionCount,
        description:
          "Assinaturas profissionais pagas ativas ao final do período. Planos gratuitos e cortesias não entram no cálculo.",
        id: "active_subscriptions",
        label: "Assinaturas ativas",
        previous: previousActiveSubscriptionCount,
        source: "professional_subscription.status=ativa + source=mercadopago",
        unit: "count",
      }),
      new_subscriptions_revenue: metric({
        current: currentNewSubscriptionRevenueCents,
        description:
          "Soma do valor cadastrado para os planos pagos iniciados no período, sem plano gratuito ou cortesia.",
        id: "new_subscriptions_revenue",
        label: "Receita de novas assinaturas",
        previous: previousNewSubscriptionRevenueCents,
        source: "professional_subscription.createdAt + subscription_plan.price_cents",
        unit: "currency_cents",
      }),
      new_subscriptions: metric({
        current: currentNewSubscriptionCount,
        description:
          "Assinaturas profissionais pagas iniciadas no período, sem plano gratuito ou cortesia.",
        id: "new_subscriptions",
        label: "Novas assinaturas",
        previous: previousNewSubscriptionCount,
        source: "professional_subscription.createdAt + source=mercadopago",
        unit: "count",
      }),
      cancellations: metric({
        current: currentCancellationCount,
        description: "Cancelamentos confirmados de assinaturas profissionais pagas no período.",
        id: "cancellations",
        label: "Churn",
        previous: previousCancellationCount,
        ratePercent: currentChurnRatePercent,
        source: "professional_subscription.status=cancelada",
        unit: "count",
      }),
    },
    coverage_notes: [
      "A receita considera pagamentos confirmados com valor informado pelo Mercado Pago, conciliando webhooks locais e resumo da assinatura no gateway sem projetar por quantidade de assinaturas.",
      "O LTV médio considera todo o histórico de pagamentos confirmados vinculados às assinaturas pagas, conciliando resumo do gateway quando o webhook local não foi gravado.",
      "O tempo médio de permanência considera todo o histórico das assinaturas pagas já canceladas.",
      "Plano gratuito e cortesia administrativa não entram na receita, no MRR, no LTV médio, no tempo médio de permanência ou nos indicadores financeiros.",
      "O churn considera cancelamentos confirmados e divide as saídas pela base paga no início do período, sem inferir cancelamento por ausência de renovação.",
      nonMonthlyIntervals
        ? "Há planos ativos com intervalo não mensal; o MRR converte o valor anual para a média mensal."
        : "Todos os planos ativos usam o valor cadastrado na configuração do plano.",
    ],
    export: {
      available: true,
      format: "csv",
    },
    mrr: {
      description:
        "Soma mensal dos planos pagos ativos ao final do período, sem plano gratuito ou cortesia.",
      source: "active_paid_subscriptions",
      value_cents: mrrCents,
    },
    latest_charges: {
      items: currentCharges.slice(0, tableTake),
      source: "payment_event+gateway_subscription_summary+professional_subscription",
      total: currentCharges.length,
    },
    new_subscriptions: {
      items: newSubscriptions.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents, newSubscriptionGatewaySummaries),
      ),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: currentNewSubscriptionCount,
    },
    period,
    series: {
      points: series,
      source: "payment_event+gateway_subscription_summary+professional_subscription",
    },
    subscription_relation: {
      items: subscriptionRelationItems.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents, subscriptionRelationGatewaySummaries),
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

export const isAdminFinanceDashboard = (data: unknown): data is AdminFinanceDashboard =>
  Boolean(data && typeof data === "object" && "period" in data && "cards" in data);
