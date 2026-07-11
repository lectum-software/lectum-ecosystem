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

    return prisma.professional_subscription.findFirst({
      where: {
        deleted: false,
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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

    return prisma.professional_subscription.update({
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
}
