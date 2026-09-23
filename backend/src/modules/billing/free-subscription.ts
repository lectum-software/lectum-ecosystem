import type { Prisma, PrismaClient } from "@/external/generated/prisma/client";
import type { professional_subscription } from "@/interfaces/objects";
import {
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

export type BillingFreeSubscriptionClient = Pick<
  PrismaClient,
  | "professional_subscription"
  | "psychologist_approach"
  | "psychologist_service"
  | "psychologist_specialty"
  | "subscription_plan"
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

const FREE_PLAN_CATALOG_LIMITS = {
  approaches: 1,
  services: 1,
  specialties: 3,
} as const;

type CatalogRelation = {
  id: string;
};

const relationOrderBy = <T extends string>(relation: T) => [
  { [relation]: { position: "asc" } },
  { [relation]: { name: "asc" } },
  { createdAt: "asc" },
  { id: "asc" },
];

const softDeleteExcessRelations = async ({
  ids,
  tx,
  type,
}: {
  ids: string[];
  tx: BillingFreeSubscriptionClient;
  type: "approach" | "service" | "specialty";
}) => {
  if (ids.length === 0) return;

  const data = {
    deleted: true,
    deletedAt: new Date(),
  };
  const where = {
    deleted: false,
    id: {
      in: ids,
    },
  };

  if (type === "approach") {
    await tx.psychologist_approach.updateMany({ data, where });
    return;
  }

  if (type === "service") {
    await tx.psychologist_service.updateMany({ data, where });
    return;
  }

  await tx.psychologist_specialty.updateMany({ data, where });
};

export const normalizeFreePlanProfileCatalogLimits = async ({
  psychologistId,
  tx,
}: {
  psychologistId: string;
  tx: BillingFreeSubscriptionClient;
}) => {
  const [specialties, services, approaches] = await Promise.all([
    tx.psychologist_specialty.findMany({
      where: {
        deleted: false,
        psychologist_id: psychologistId,
        specialty: {
          deleted: false,
        },
      },
      orderBy: relationOrderBy(
        "specialty",
      ) as Prisma.psychologist_specialtyOrderByWithRelationInput[],
      select: {
        id: true,
      },
    }),
    tx.psychologist_service.findMany({
      where: {
        deleted: false,
        psychologist_id: psychologistId,
        service: {
          deleted: false,
        },
      },
      orderBy: relationOrderBy("service") as Prisma.psychologist_serviceOrderByWithRelationInput[],
      select: {
        id: true,
      },
    }),
    tx.psychologist_approach.findMany({
      where: {
        approach: {
          deleted: false,
        },
        deleted: false,
        psychologist_id: psychologistId,
      },
      orderBy: relationOrderBy(
        "approach",
      ) as Prisma.psychologist_approachOrderByWithRelationInput[],
      select: {
        id: true,
      },
    }),
  ]);

  await Promise.all([
    softDeleteExcessRelations({
      ids: (specialties as CatalogRelation[])
        .slice(FREE_PLAN_CATALOG_LIMITS.specialties)
        .map((item) => item.id),
      tx,
      type: "specialty",
    }),
    softDeleteExcessRelations({
      ids: (services as CatalogRelation[])
        .slice(FREE_PLAN_CATALOG_LIMITS.services)
        .map((item) => item.id),
      tx,
      type: "service",
    }),
    softDeleteExcessRelations({
      ids: (approaches as CatalogRelation[])
        .slice(FREE_PLAN_CATALOG_LIMITS.approaches)
        .map((item) => item.id),
      tx,
      type: "approach",
    }),
  ]);
};

const normalizeIfFreeSubscription = async <T extends professional_subscription | null>(
  subscription: T,
  tx: BillingFreeSubscriptionClient,
): Promise<T> => {
  if (subscription?.plan?.slug === FREE_PLAN_SLUG && subscription.psychologist_id) {
    await normalizeFreePlanProfileCatalogLimits({
      psychologistId: subscription.psychologist_id,
      tx,
    });
  }

  return subscription;
};

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

  if (activeFree) return normalizeIfFreeSubscription(activeFree, tx);

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
    return normalizeIfFreeSubscription(
      await tx.professional_subscription.update({
        where: {
          id: previousFree.id,
        },
        data: freeSubscriptionRestoreData,
        include: includePlan,
      }),
      tx,
    );
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

  return normalizeIfFreeSubscription(
    await tx.professional_subscription.create({
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
    }),
    tx,
  );
};
