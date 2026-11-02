import prisma from "@/infra/database/prisma";
import type { professional_subscription } from "@/interfaces/objects";
import type { PaymentGateway } from "./payment-gateway";

// Capture the paid period before cancellation can remove the provider's next billing date.
export const prepareCancellation = async (
  subscription: professional_subscription,
  gateway: PaymentGateway,
) => {
  if (subscription.status !== "ativa" || subscription.current_period_end) return;
  if (!subscription.id || !subscription.gateway_subscription_id)
    throw new Error("billing_cancellation_period_unavailable");
  const remote = await gateway.getSubscription(subscription.gateway_subscription_id);
  const end = remote.next_payment_date ? new Date(remote.next_payment_date) : null;
  if (remote.status !== "ativa" || !end || !Number.isFinite(end.getTime()) || end <= new Date())
    throw new Error("billing_cancellation_period_unavailable");
  await prisma.professional_subscription.updateMany({
    where: {
      id: subscription.id,
      deleted: false,
      status: "ativa",
      current_period_end: null,
      gateway_subscription_id: subscription.gateway_subscription_id,
    },
    data: { current_period_end: end },
  });
  const current = await prisma.professional_subscription.findUnique({
    where: { id: subscription.id },
  });
  if (!current || current.deleted || !current.current_period_end)
    throw new Error("billing_cancellation_period_unavailable");
};
