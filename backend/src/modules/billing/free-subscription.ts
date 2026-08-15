import type { Prisma, PrismaClient } from "@/external/generated/prisma/client";
import type { professional_subscription } from "@/interfaces/objects";
import {
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

export type BillingFreeSubscriptionClient = Pick<
  PrismaClient,
  "professional_subscription" | "subscription_plan"
>;

export const FREE_PLAN_SLUG = "gratuito";
export const FREE_SUBSCRIPTION_SOURCE = "free_signup";

export const cancelledProfessionalGatewaySubscriptionWhere =
  (): Prisma.professional_subscriptionWhereInput => ({
    deleted: false,
    gateway: "mercadopago",
    gateway_subscription_id: {
      not: null,
    },
    plan: {
      active: true,
      deleted: false,
      slug: {
        not: FREE_PLAN_SLUG,
      },
    },
    source: "mercadopago",
    status: "cancelada",
  });

const includePlan = {
  plan: true,
} as const;

const freeSubscriptionRestoreData = {
  billing_downgraded_at: null,
  billing_grace_ends_at: null,
  billing_issue_started_at: null,
  billing_last_notice_key: null,
  current_period_end: null,
  gateway: null,
  gateway_subscription_id: null,
  grant_notes: null,
  grant_reason: null,
  grant_started_at: null,
  granted_by: null,
  status: "ativa",
} satisfies Prisma.professional_subscriptionUpdateInput;

export const restoreFreePlanAfterProfessionalCancellation = async ({
  cancelledSubscriptionId,
  psychologistId,
  tx,
}: {
  cancelledSubscriptionId?: string | null;
  psychologistId: string;
  tx: BillingFreeSubscriptionClient;
}): Promise<professional_subscription | null> => {
  const activeProfessional = await tx.professional_subscription.findFirst({
    where: {
      ...activeProfessionalEntitlementWhere(),
      ...(cancelledSubscriptionId ? { id: { not: cancelledSubscriptionId } } : {}),
      psychologist_id: psychologistId,
    },
    include: includePlan,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (activeProfessional) return activeProfessional;

  const activeFree = await tx.professional_subscription.findFirst({
    where: {
      ...activeFreeSubscriptionWhere(),
      psychologist_id: psychologistId,
    },
    include: includePlan,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (activeFree) return activeFree;

  const previousFree = await tx.professional_subscription.findFirst({
    where: {
      deleted: false,
      plan: {
        active: true,
        deleted: false,
        slug: FREE_PLAN_SLUG,
      },
      psychologist_id: psychologistId,
    },
    include: includePlan,
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  if (previousFree?.id) {
    return tx.professional_subscription.update({
      where: {
        id: previousFree.id,
      },
      data: freeSubscriptionRestoreData,
      include: includePlan,
    });
  }

  const freePlan = await tx.subscription_plan.findFirst({
    where: {
      active: true,
      deleted: false,
      slug: FREE_PLAN_SLUG,
    },
  });

  if (!freePlan?.id) {
    console.error(
      "[BILLING] Plano gratuito ativo nao encontrado para restaurar assinatura gratuita.",
    );

    return null;
  }

  return tx.professional_subscription.create({
    data: {
      billing_downgraded_at: null,
      billing_grace_ends_at: null,
      billing_issue_started_at: null,
      billing_last_notice_key: null,
      current_period_end: null,
      gateway: null,
      gateway_subscription_id: null,
      grant_notes: null,
      grant_reason: null,
      grant_started_at: null,
      granted_by: null,
      plan_id: freePlan.id,
      psychologist_id: psychologistId,
      source: FREE_SUBSCRIPTION_SOURCE,
      status: "ativa",
    },
    include: includePlan,
  });
};
