type SubscriptionState = {
  status?: string | null;
  current_period_end?: Date | null;
};

// Cancellation stops renewal, not the already granted paid period. Never extend it
// from a canceled response or resurrect it from a delayed active webhook.
export const resolveCancellationState = (
  current: SubscriptionState,
  incoming: { status: string; currentPeriodEnd?: Date | null },
) => {
  const canceled = current.status === "cancelada" || incoming.status === "cancelada";
  return {
    status: canceled ? "cancelada" : incoming.status,
    current_period_end: canceled
      ? current.status === "ativa" || current.status === "cancelada"
        ? (current.current_period_end ?? null)
        : null
      : (incoming.currentPeriodEnd ?? null),
  };
};
