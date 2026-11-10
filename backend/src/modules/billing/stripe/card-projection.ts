import prisma from "@/infra/database/prisma";
import { getStripeGateway } from "../payment-gateway";
import type { StripeCardDisplay, StripeIdentity } from "../payment-gateway/stripe-types";

export const cardProjectionWhere = (
  userId: string,
  subscriptionId: string,
  identity: StripeIdentity,
) => ({
  user_id: userId,
  gateway: "stripe",
  gateway_mode: identity.mode,
  gateway_account_id: identity.accountId,
  gateway_token: subscriptionId,
});

export const persistStripeCardProjection = async (input: {
  userId: string;
  psychologistId: string;
  localSubscriptionId: string;
  subscriptionId: string;
  identity: StripeIdentity;
  display: StripeCardDisplay;
  previous: { id: string; updatedAt: Date } | null;
}) =>
  prisma.$transaction(async (tx) => {
    // Serialize first creation with a simultaneous card-change projection, without holding a lock over provider calls.
    await tx.$queryRaw`SELECT id FROM psychologist_profiles WHERE id = ${input.psychologistId} FOR UPDATE`;
    const subscription = await tx.professional_subscription.findFirst({
      where: {
        id: input.localSubscriptionId,
        psychologist_id: input.psychologistId,
        gateway: "stripe",
        gateway_subscription_id: input.subscriptionId,
        gateway_mode: input.identity.mode,
        gateway_account_id: input.identity.accountId,
        deleted: false,
        psychologist: { user_id: input.userId, deleted: false },
      },
    });
    if (!subscription) return false;
    const where = cardProjectionWhere(input.userId, input.subscriptionId, input.identity);
    const current = await tx.payment_method.findFirst({ where, orderBy: { createdAt: "desc" } });
    const data = {
      ...where,
      brand: input.display.brand,
      last4: input.display.last4,
      exp_month: input.display.expMonth,
      exp_year: input.display.expYear,
      deleted: false,
    };
    if (current) {
      if (!input.previous || current.id !== input.previous.id) return false;
      return Boolean(
        (
          await tx.payment_method.updateMany({
            where: { id: current.id, updatedAt: input.previous.updatedAt },
            data,
          })
        ).count,
      );
    }
    if (input.previous) return false;
    await tx.payment_method.create({ data });
    return true;
  });

export const refreshStripeCardProjection = async (input: {
  userId: string;
  psychologistId: string;
  localSubscriptionId: string;
  subscriptionId: string;
  customerId: string;
}) => {
  const gateway = getStripeGateway();
  const previous = await prisma.payment_method.findFirst({
    where: cardProjectionWhere(input.userId, input.subscriptionId, gateway.identity),
    orderBy: { createdAt: "desc" },
  });
  const display = await gateway.readSubscriptionCard(input);
  if (!display) return false;
  return persistStripeCardProjection({ ...input, identity: gateway.identity, display, previous });
};
