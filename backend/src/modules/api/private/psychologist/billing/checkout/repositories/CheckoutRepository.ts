import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  billing_address,
  payment_method,
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { ICheckoutRepository } from "./interfaces/ICheckoutRepository";

type CheckoutProfile = Pick<
  psychologist_profile,
  | "id"
  | "deleted"
  | "professional_address_city"
  | "professional_address_district"
  | "professional_address_number"
  | "professional_address_state"
  | "professional_address_street"
  | "professional_address_zip"
>;

type SubscriptionStatus = "inativa" | "ativa" | "inadimplente" | "cancelada";

type PaymentMethodDisplay = {
  gatewaySubscriptionId: string;
  brand?: string | null;
  last4?: string | null;
};

const hasText = (value?: string | null) => Boolean(value?.trim());

const normalizeDisplayText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized || null;
};

const normalizeLast4 = (last4?: string | null) => {
  const digits = last4?.replace(/\D/g, "").slice(-4) || null;

  return digits && digits.length === 4 ? digits : null;
};

const hasCompleteBillingAddress = (address?: billing_address | null) =>
  Boolean(
    address &&
      hasText(address.city) &&
      hasText(address.district) &&
      hasText(address.number) &&
      hasText(address.state) &&
      hasText(address.street) &&
      hasText(address.zip),
  );

const hasCompleteProfileAddress = (profile: CheckoutProfile) =>
  hasText(profile.professional_address_city) &&
  hasText(profile.professional_address_district) &&
  hasText(profile.professional_address_number) &&
  hasText(profile.professional_address_state) &&
  hasText(profile.professional_address_street) &&
  hasText(profile.professional_address_zip);

export class CheckoutRepository implements ICheckoutRepository {
  readonly addressRepository: ORM["billing_address"];
  readonly paymentMethodRepository: ORM["payment_method"];
  readonly profileRepository: ORM["psychologist_profile"];
  readonly planRepository: ORM["subscription_plan"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.addressRepository = prisma.billing_address;
    this.paymentMethodRepository = prisma.payment_method;
    this.profileRepository = prisma.psychologist_profile;
    this.planRepository = prisma.subscription_plan;
    this.subscriptionRepository = prisma.professional_subscription;
  }

  async findProfileByUserId(userId: string): Promise<CheckoutProfile | null> {
    return this.profileRepository.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        deleted: true,
        professional_address_city: true,
        professional_address_district: true,
        professional_address_number: true,
        professional_address_state: true,
        professional_address_street: true,
        professional_address_zip: true,
      },
    });
  }

  async findPlanBySlug(slug: "profissional"): Promise<subscription_plan | null> {
    return this.planRepository.findFirst({
      where: {
        slug,
        active: true,
        deleted: false,
      },
    });
  }

  async findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
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
  }

  async setGatewayPlanId(planId: string, gatewayPlanId: string | null): Promise<subscription_plan> {
    return this.planRepository.update({
      where: {
        id: planId,
      },
      data: {
        gateway_plan_id: gatewayPlanId,
      },
    });
  }

  async createPendingSubscription(
    psychologistId: string,
    planId: string,
  ): Promise<professional_subscription> {
    return prisma.$transaction(async (tx) => {
      await tx.professional_subscription.updateMany({
        where: {
          psychologist_id: psychologistId,
          deleted: false,
          status: {
            notIn: ["ativa", "cancelada"],
          },
        },
        data: {
          status: "cancelada",
        },
      });

      return tx.professional_subscription.create({
        data: {
          psychologist_id: psychologistId,
          plan_id: planId,
          status: "inativa",
          source: "mercadopago",
          gateway: "mercadopago",
          gateway_subscription_id: null,
          current_period_end: null,
          grant_reason: null,
          grant_notes: null,
          granted_by: null,
          grant_started_at: null,
        },
        include: {
          plan: true,
        },
      });
    });
  }

  async setGatewaySubscriptionId(
    subscriptionId: string,
    gatewaySubscriptionId: string,
    options: {
      currentPeriodEnd?: Date | null;
      status?: SubscriptionStatus;
    } = {},
  ): Promise<professional_subscription> {
    const subscription = await this.subscriptionRepository.update({
      where: {
        id: subscriptionId,
      },
      data: {
        gateway_subscription_id: gatewaySubscriptionId,
        ...(options.status ? { status: options.status } : {}),
        ...(Object.hasOwn(options, "currentPeriodEnd")
          ? { current_period_end: options.currentPeriodEnd ?? null }
          : {}),
      },
      include: {
        plan: true,
      },
    });

    if (options.status === "ativa" && subscription.plan?.slug !== "gratuito") {
      await prisma.psychologist_profile.updateMany({
        where: {
          deleted: false,
          id: subscription.psychologist_id,
          show_experience_tag: false,
          updatedAt: {
            lte: subscription.grant_started_at ?? subscription.createdAt,
          },
        },
        data: {
          show_experience_tag: true,
        },
      });
    }

    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.subscriptionRepository.update({
      where: {
        id: subscriptionId,
      },
      data: {
        status: "cancelada",
      },
    });
  }

  async findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
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

  async savePaymentMethodReference(
    userId: string,
    data: PaymentMethodDisplay,
  ): Promise<payment_method> {
    const current = await this.paymentMethodRepository.findFirst({
      where: {
        user_id: userId,
        gateway: "mercadopago",
        deleted: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const payload = {
      gateway_token: data.gatewaySubscriptionId,
      brand: normalizeDisplayText(data.brand),
      last4: normalizeLast4(data.last4),
      exp_month: null,
      exp_year: null,
    };

    if (current?.id) {
      return this.paymentMethodRepository.update({
        where: {
          id: current.id,
        },
        data: payload,
      });
    }

    return this.paymentMethodRepository.create({
      data: {
        user_id: userId,
        gateway: "mercadopago",
        ...payload,
      },
    });
  }

  async hasBillingAddress({
    profile,
    userId,
  }: {
    profile: CheckoutProfile;
    userId: string;
  }): Promise<boolean> {
    const billingAddress = await this.addressRepository.findFirst({
      where: {
        user_id: userId,
        deleted: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return hasCompleteBillingAddress(billingAddress) || hasCompleteProfileAddress(profile);
  }
}
