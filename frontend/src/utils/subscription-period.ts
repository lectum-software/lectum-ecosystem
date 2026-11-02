type SubscriptionPeriod = {
  status?: string | null;
  source?: string | null;
  current_period_end?: string | null;
  billing_grace_ends_at?: string | null;
  billing_downgraded_at?: string | null;
};

export const hasSubscriptionBenefits = (
  subscription?: SubscriptionPeriod | null,
  now = Date.now(),
) => {
  if (!subscription) return false;
  const end = subscription.current_period_end;
  if (subscription.status === "ativa") return !end || Date.parse(end) > now;
  if (subscription.status === "cancelada") {
    return subscription.source === "mercadopago" && Boolean(end && Date.parse(end) > now);
  }
  return (
    subscription.status === "inadimplente" &&
    !subscription.billing_downgraded_at &&
    Boolean(
      subscription.billing_grace_ends_at && Date.parse(subscription.billing_grace_ends_at) > now,
    )
  );
};
