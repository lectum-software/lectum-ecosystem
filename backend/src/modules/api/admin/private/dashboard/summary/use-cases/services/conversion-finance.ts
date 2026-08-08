import { endOfDate, parseDateOnly, startOfDate } from "@/utils/date-range";
import type {
  AdminDashboardDateRange,
  AdminDashboardDeviceItem,
  AdminDashboardFinancialPoint,
  AdminDashboardIntentConversionCategoryId,
  AdminDashboardIntentConversionFlow,
  AdminDashboardIntentConversionFlowItem,
  AdminDashboardIntentConversionIntentId,
  AdminDashboardLocationItem,
} from "../../DTOs/IAdminDashboardSummaryDTO";

import {
  buildPsychologistConversionMap,
  COUNTRY_LABELS,
  classifyIntentConversionPair,
  DEVICE_LABELS,
  emptyIntentConversionPairCounts,
  INTENT_CONVERSION_CATEGORY_CONFIG,
  INTENT_CONVERSION_CATEGORY_ORDER,
  INTENT_CONVERSION_INTENT_CONFIG,
  INTENT_CONVERSION_INTENT_ORDER,
  INTENT_CONVERSION_SOURCE,
  type IntentConversionPairCounts,
  type IntentConversionSignals,
  type PsychologistConversionEvents,
  type PsychologistConversionProfile,
  type SubscriptionRecord,
  safePercentage,
} from "./intent-support";

export const buildIntentConversionFlow = (params: {
  psychologistConversionEvents: PsychologistConversionEvents;
  psychologistProfiles: PsychologistConversionProfile[];
  range: AdminDashboardDateRange;
  signals: IntentConversionSignals;
}): AdminDashboardIntentConversionFlow => {
  const conversionByPsychologist = buildPsychologistConversionMap(
    params.psychologistProfiles,
    params.psychologistConversionEvents,
    params.range,
  );
  const pairCounts = new Map<string, IntentConversionPairCounts & { psychologistId: string }>();
  const profileViewCountsByPair = new Map<string, number>();

  const getPair = (patientId: string, psychologistId: string) => {
    const key = `${patientId}:${psychologistId}`;
    const current = pairCounts.get(key);
    if (current) return current;

    const next = {
      ...emptyIntentConversionPairCounts(),
      psychologistId,
    };
    pairCounts.set(key, next);
    return next;
  };

  for (const view of params.signals.profileViews) {
    if (!view.viewer_id) continue;

    const pair = getPair(view.viewer_id, view.psychologist_id);
    pair.profile_views += 1;
    const key = `${view.viewer_id}:${view.psychologist_id}`;
    profileViewCountsByPair.set(key, (profileViewCountsByPair.get(key) ?? 0) + 1);
  }

  for (const [key, views] of profileViewCountsByPair.entries()) {
    const pair = pairCounts.get(key);
    if (!pair) continue;

    pair.repeated_profile_views = Math.max(0, views - 1);
  }

  for (const favorite of params.signals.favorites) {
    getPair(favorite.user_id, favorite.psychologist_id).favorites += 1;
  }

  for (const click of params.signals.whatsappClicks) {
    if (!click.user_id) continue;

    getPair(click.user_id, click.psychologist_id).whatsapp_clicks += 1;
  }

  const intentTotals = new Map<AdminDashboardIntentConversionIntentId, number>(
    INTENT_CONVERSION_INTENT_ORDER.map((id) => [id, 0]),
  );
  const conversionTotals = new Map<AdminDashboardIntentConversionCategoryId, number>(
    INTENT_CONVERSION_CATEGORY_ORDER.map((id) => [id, 0]),
  );
  const flowCounts = new Map<string, number>();

  for (const pair of pairCounts.values()) {
    const intentId = classifyIntentConversionPair(pair);
    if (!intentId) continue;

    const conversionId = conversionByPsychologist.get(pair.psychologistId) ?? "low_conversion";
    const flowKey = `${intentId}_${conversionId}`;

    intentTotals.set(intentId, (intentTotals.get(intentId) ?? 0) + 1);
    conversionTotals.set(conversionId, (conversionTotals.get(conversionId) ?? 0) + 1);
    flowCounts.set(flowKey, (flowCounts.get(flowKey) ?? 0) + 1);
  }

  const totalPairs = [...flowCounts.values()].reduce((sum, count) => sum + count, 0);
  const flowItems: AdminDashboardIntentConversionFlowItem[] =
    INTENT_CONVERSION_INTENT_ORDER.flatMap((intentId) =>
      INTENT_CONVERSION_CATEGORY_ORDER.map((conversionId) => {
        const count = flowCounts.get(`${intentId}_${conversionId}`) ?? 0;

        return {
          conversion_id: conversionId,
          conversion_label: INTENT_CONVERSION_CATEGORY_CONFIG[conversionId].label,
          conversion_percentage: safePercentage(count, conversionTotals.get(conversionId) ?? 0),
          count,
          id: `${intentId}_${conversionId}` as const,
          intent_id: intentId,
          intent_label: INTENT_CONVERSION_INTENT_CONFIG[intentId].label,
          intent_percentage: safePercentage(count, intentTotals.get(intentId) ?? 0),
          percentage: safePercentage(count, totalPairs),
        };
      }),
    ).filter((item) => item.count > 0);

  const healthyAbsorption = flowCounts.get("very_qualified_strong_conversion") ?? 0;
  const retainedIntention = [...flowCounts.entries()].reduce((sum, [key, count]) => {
    const isWarmIntent = key.startsWith("objective_") || key.startsWith("very_qualified_");
    const isStrongConversion = key.endsWith("_strong_conversion");

    return isWarmIntent && !isStrongConversion ? sum + count : sum;
  }, 0);
  const exploratoryLoss =
    (flowCounts.get("curious_low_conversion") ?? 0) +
    (flowCounts.get("curious_no_conversion") ?? 0);

  return {
    coverage_note:
      "Fluxo observacional por pares paciente-psicólogo com sinais no período; pacientes sem perfil associado não entram no cálculo.",
    flows: flowItems.sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return right.percentage - left.percentage;
    }),
    insights: [
      {
        count: healthyAbsorption,
        description: "Qualificados que chegaram a psicólogos classificados em Alta Conversão.",
        id: "healthy_absorption",
        label: "Absorção saudável",
        percentage: safePercentage(healthyAbsorption, totalPairs),
      },
      {
        count: retainedIntention,
        description:
          "Interessados ou Qualificados que chegaram a psicólogos sem Alta Conversão no período.",
        id: "retained_intention",
        label: "Intenção represada",
        percentage: safePercentage(retainedIntention, totalPairs),
      },
      {
        count: exploratoryLoss,
        description: "Curiosos chegando a psicólogos em Baixa Conversão ou Sem Conversão.",
        id: "exploratory_loss",
        label: "Tráfego exploratório",
        percentage: safePercentage(exploratoryLoss, totalPairs),
      },
    ],
    intents: INTENT_CONVERSION_INTENT_ORDER.map((id) => {
      const count = intentTotals.get(id) ?? 0;

      return {
        count,
        description: INTENT_CONVERSION_INTENT_CONFIG[id].description,
        id,
        label: INTENT_CONVERSION_INTENT_CONFIG[id].label,
        percentage: safePercentage(count, totalPairs),
      };
    }),
    privacy_note:
      "Indicador interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
    psychologist_conversions: INTENT_CONVERSION_CATEGORY_ORDER.map((id) => {
      const count = conversionTotals.get(id) ?? 0;

      return {
        count,
        description: INTENT_CONVERSION_CATEGORY_CONFIG[id].description,
        id,
        label: INTENT_CONVERSION_CATEGORY_CONFIG[id].label,
        percentage: safePercentage(count, totalPairs),
      };
    }),
    source: INTENT_CONVERSION_SOURCE,
    total_pairs: totalPairs,
    unavailable_reason:
      totalPairs > 0 ? null : "Nenhum par paciente-psicólogo com sinal foi encontrado no período.",
  };
};

export const normalizeDeviceType = (value: string): AdminDashboardDeviceItem["device_type"] => {
  const normalized = value.toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const buildDevices = (sessions: Array<{ device_type: string }>) => {
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

export const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

export const buildLocations = (locations: Array<{ country: string | null }>) => {
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

export const isBillableSubscription = (subscription: SubscriptionRecord) =>
  subscription.status === "ativa" &&
  subscription.source !== "admin_grant" &&
  subscription.plan.price_cents > 0 &&
  subscription.plan.slug !== "gratuito";

export const isActiveAt = (subscription: SubscriptionRecord, day: Date) => {
  const dayEnd = endOfDate(day);

  return (
    subscription.createdAt <= dayEnd &&
    (!subscription.current_period_end || subscription.current_period_end >= startOfDate(day))
  );
};

export const estimateMrrAt = (subscriptions: SubscriptionRecord[], day: Date) => {
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

export const buildFinancial = (
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
