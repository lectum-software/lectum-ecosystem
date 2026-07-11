import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { payment_method, professional_subscription } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { SubscriptionRepository } from "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

const ADMIN_GRANT_SOURCE = "admin_grant";
const PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS = 5 * 60 * 1000;

const billingSelect = {
  cfp_verified_at: true,
  cpf: true,
  createdAt: true,
  crp: true,
  crp_registration_date: true,
  id: true,
  user_id: true,
  subscriptions: {
    orderBy: {
      createdAt: "desc",
    },
    where: {
      deleted: false,
      plan: {
        active: true,
        deleted: false,
      },
    },
    select: {
      createdAt: true,
      current_period_end: true,
      gateway: true,
      gateway_subscription_id: true,
      grant_notes: true,
      grant_reason: true,
      grant_started_at: true,
      granted_by: true,
      id: true,
      plan: {
        select: {
          interval: true,
          name: true,
          price_cents: true,
          slug: true,
        },
      },
      source: true,
      status: true,
      updatedAt: true,
    },
  },
  user: {
    select: {
      active: true,
      email: true,
      id: true,
      name: true,
      role: true,
      payment_methods: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          brand: true,
          exp_month: true,
          exp_year: true,
          gateway: true,
          last4: true,
        },
        take: 1,
        where: {
          deleted: false,
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileSelect;

export type AdminPsychologistBillingRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof billingSelect;
}>;

export type AdminPsychologistBillingSubscription =
  AdminPsychologistBillingRecord["subscriptions"][number];

export class AdminPsychologistBillingRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistBillingRecord | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: billingSelect,
    });
  }

  async findCurrentSubscription(
    psychologistId: string,
  ): Promise<AdminPsychologistBillingSubscription | null> {
    const activeProfessional = await prisma.professional_subscription.findFirst({
      where: {
        ...activeProfessionalEntitlementWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeProfessional) return activeProfessional;

    const actionableGatewayProfessional = await prisma.professional_subscription.findFirst({
      where: {
        ...actionableProfessionalGatewaySubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (actionableGatewayProfessional) return actionableGatewayProfessional;

    const activeFree = await prisma.professional_subscription.findFirst({
      where: {
        ...activeFreeSubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeFree) return activeFree;

    return null;
  }

  async findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<AdminPsychologistBillingSubscription | null> {
    return prisma.professional_subscription.findFirst({
      where: {
        deleted: false,
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        psychologist_id: psychologistId,
        source: "mercadopago",
        status: {
          in: ["inativa", "inadimplente"],
        },
        plan: {
          active: true,
          deleted: false,
          slug: "profissional",
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findPaymentMethod(
    userId: string,
    gatewayToken?: string | null,
  ): Promise<payment_method | null> {
    return prisma.payment_method.findFirst({
      where: {
        deleted: false,
        gateway: "mercadopago",
        ...(gatewayToken ? { gateway_token: gatewayToken } : {}),
        user_id: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        brand: true,
        exp_month: true,
        exp_year: true,
        gateway: true,
        last4: true,
      },
    });
  }

  async showPaymentHistory(
    subscription: professional_subscription | null,
  ): Promise<BillingPaymentHistoryItem[]> {
    const repository = new SubscriptionRepository();
    return repository.showPaymentHistory(subscription);
  }

  async revokeCourtesy(
    subscription: AdminPsychologistBillingSubscription,
    actor: string,
  ): Promise<professional_subscription> {
    const now = new Date();
    const previousNotes = subscription.grant_notes?.trim();
    const revokeNote = `Cortesia revogada em ${now.toISOString()} por ${actor}.`;

    return prisma.$transaction(async (tx) => {
      const grant = await tx.professional_subscription.findUnique({
        where: {
          id: subscription.id,
        },
        select: {
          createdAt: true,
          grant_notes: true,
          id: true,
          psychologist_id: true,
          source: true,
        },
      });

      if (!grant || grant.source !== ADMIN_GRANT_SOURCE) {
        return tx.professional_subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            current_period_end: now,
            grant_notes: previousNotes ? `${previousNotes}\n${revokeNote}` : revokeNote,
            status: "cancelada",
          },
        });
      }

      const restoreWindowStart = new Date(
        grant.createdAt.getTime() - PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS,
      );
      const restoreWindowEnd = new Date(
        grant.createdAt.getTime() + PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS,
      );
      const previousSubscriptionWhere = {
        deleted: false,
        gateway: null,
        gateway_subscription_id: null,
        id: {
          not: grant.id,
        },
        plan: {
          active: true,
          deleted: false,
        },
        psychologist_id: grant.psychologist_id,
        source: {
          not: ADMIN_GRANT_SOURCE,
        },
        status: "cancelada",
      } satisfies Prisma.professional_subscriptionWhereInput;
      const previousSubscriptionOrderBy = [
        {
          createdAt: "desc" as const,
        },
        {
          updatedAt: "desc" as const,
        },
      ];
      const previousSubscription =
        (await tx.professional_subscription.findFirst({
          where: {
            ...previousSubscriptionWhere,
            updatedAt: {
              gte: restoreWindowStart,
              lte: restoreWindowEnd,
            },
          },
          orderBy: previousSubscriptionOrderBy,
        })) ??
        (await tx.professional_subscription.findFirst({
          where: {
            ...previousSubscriptionWhere,
            createdAt: {
              lt: grant.createdAt,
            },
          },
          orderBy: previousSubscriptionOrderBy,
        }));

      const revokedGrant = await tx.professional_subscription.update({
        where: {
          id: grant.id,
        },
        data: {
          current_period_end: now,
          grant_notes: previousNotes ? `${previousNotes}\n${revokeNote}` : revokeNote,
          status: "cancelada",
        },
      });

      if (previousSubscription) {
        await tx.professional_subscription.update({
          where: {
            id: previousSubscription.id,
          },
          data: {
            status: "ativa",
          },
        });
      }

      return revokedGrant;
    });
  }
}
