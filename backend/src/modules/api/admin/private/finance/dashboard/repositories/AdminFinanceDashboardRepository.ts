import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { AdminFinanceDateRange } from "../DTOs/IAdminFinanceDashboardDTO";

const dateRangeWhere = (range: AdminFinanceDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const paidPlanWhere = {
  active: true,
  deleted: false,
  price_cents: {
    gt: 0,
  },
  slug: {
    not: "gratuito",
  },
};

const paidGatewaySubscriptionWhere = {
  deleted: false,
  gateway: "mercadopago",
  gateway_subscription_id: {
    not: null,
  },
  plan: paidPlanWhere,
  source: "mercadopago",
};

const relationStatuses = ["ativa", "cancelada", "inadimplente"];

export type AdminFinanceSubscriptionRelationFilters = {
  q?: string;
  status?: string;
};

const paidSubscriptionRelationWhere = (
  range: AdminFinanceDateRange,
  filters: AdminFinanceSubscriptionRelationFilters = {},
): Prisma.professional_subscriptionWhereInput => {
  const query = filters.q?.trim();

  return {
    ...paidGatewaySubscriptionWhere,
    createdAt: dateRangeWhere(range),
    status: filters.status ?? {
      in: relationStatuses,
    },
    ...(query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { gateway_subscription_id: { contains: query, mode: "insensitive" } },
            {
              psychologist: {
                crp: { contains: query, mode: "insensitive" },
              },
            },
            {
              psychologist: {
                user: {
                  email: { contains: query, mode: "insensitive" },
                },
              },
            },
            {
              psychologist: {
                user: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
};

const subscriptionSelect = {
  createdAt: true,
  current_period_end: true,
  gateway: true,
  gateway_subscription_id: true,
  id: true,
  source: true,
  status: true,
  updatedAt: true,
  plan: {
    select: {
      id: true,
      interval: true,
      name: true,
      price_cents: true,
      slug: true,
    },
  },
  psychologist: {
    select: {
      crp: true,
      id: true,
      user: {
        select: {
          email: true,
          id: true,
          name: true,
          payment_methods: {
            orderBy: {
              updatedAt: "desc",
            },
            select: {
              brand: true,
              exp_month: true,
              exp_year: true,
              gateway: true,
              gateway_token: true,
              last4: true,
              updatedAt: true,
            },
            take: 5,
            where: {
              deleted: false,
              gateway: "mercadopago",
            },
          },
        },
      },
    },
  },
} satisfies Prisma.professional_subscriptionSelect;

export class AdminFinanceDashboardRepository {
  async findFinanceStartDate(): Promise<Date | null> {
    const [firstPaymentEvent, firstSubscription] = await Promise.all([
      prisma.payment_event.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        where: {
          deleted: false,
          gateway: "mercadopago",
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.professional_subscription.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        where: paidGatewaySubscriptionWhere,
        select: {
          createdAt: true,
        },
      }),
    ]);

    const dates = [firstPaymentEvent?.createdAt, firstSubscription?.createdAt].filter(
      (date): date is Date => Boolean(date),
    );
    if (dates.length === 0) return null;

    return dates.reduce((earliest, date) => (date < earliest ? date : earliest), dates[0]);
  }

  async countActivePaidSubscriptionsAt(at: Date): Promise<number> {
    return prisma.professional_subscription.count({
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: {
          lte: at,
        },
        status: "ativa",
        OR: [
          { current_period_end: null },
          {
            current_period_end: {
              gte: at,
            },
          },
        ],
      },
    });
  }

  async countCancelledPaidSubscriptions(range: AdminFinanceDateRange): Promise<number> {
    return prisma.professional_subscription.count({
      where: {
        ...paidGatewaySubscriptionWhere,
        status: "cancelada",
        updatedAt: dateRangeWhere(range),
      },
    });
  }

  async countNewPaidSubscriptions(range: AdminFinanceDateRange): Promise<number> {
    return prisma.professional_subscription.count({
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: dateRangeWhere(range),
        status: {
          in: ["ativa", "cancelada", "inadimplente"],
        },
      },
    });
  }

  async countPaidSubscriptionsInOpeningBaseAt(at: Date): Promise<number> {
    return prisma.professional_subscription.count({
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: {
          lte: at,
        },
        OR: [
          { current_period_end: null },
          {
            current_period_end: {
              gte: at,
            },
          },
        ],
        status: {
          in: ["ativa", "cancelada"],
        },
        NOT: {
          status: "cancelada",
          updatedAt: {
            lt: at,
          },
        },
      },
    });
  }

  async listActivePaidSubscriptionsAt(at: Date) {
    return prisma.professional_subscription.findMany({
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: {
          lte: at,
        },
        status: "ativa",
        OR: [
          { current_period_end: null },
          {
            current_period_end: {
              gte: at,
            },
          },
        ],
      },
      select: subscriptionSelect,
    });
  }

  async listNewPaidSubscriptionValues(range: AdminFinanceDateRange) {
    return prisma.professional_subscription.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: dateRangeWhere(range),
        status: {
          in: ["ativa", "cancelada", "inadimplente"],
        },
      },
      select: {
        createdAt: true,
        id: true,
        plan: {
          select: {
            price_cents: true,
          },
        },
      },
    });
  }

  async listNewPaidSubscriptions(range: AdminFinanceDateRange, take = 50) {
    return prisma.professional_subscription.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take,
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: dateRangeWhere(range),
        status: {
          in: ["ativa", "cancelada", "inadimplente"],
        },
      },
      select: subscriptionSelect,
    });
  }

  async countPaidSubscriptionsForRelation(
    range: AdminFinanceDateRange,
    filters: AdminFinanceSubscriptionRelationFilters = {},
  ) {
    return prisma.professional_subscription.count({
      where: paidSubscriptionRelationWhere(range, filters),
    });
  }

  async listPaidSubscriptionsForRelation(
    range: AdminFinanceDateRange,
    { skip = 0, take = 50 }: { skip?: number; take?: number } = {},
    filters: AdminFinanceSubscriptionRelationFilters = {},
  ) {
    return prisma.professional_subscription.findMany({
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take,
      where: paidSubscriptionRelationWhere(range, filters),
      select: subscriptionSelect,
    });
  }

  async listPaidSubscriptionsForPaymentReferenceAt(at: Date) {
    return prisma.professional_subscription.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        ...paidGatewaySubscriptionWhere,
        createdAt: {
          lte: at,
        },
        status: {
          in: ["ativa", "cancelada", "inadimplente"],
        },
      },
      select: subscriptionSelect,
    });
  }

  async listPaidSubscriptionsForLifetime() {
    return prisma.professional_subscription.findMany({
      where: {
        ...paidGatewaySubscriptionWhere,
        status: {
          in: ["ativa", "cancelada", "inadimplente"],
        },
      },
      select: {
        gateway_subscription_id: true,
        id: true,
        psychologist_id: true,
      },
    });
  }

  async listCancelledPaidSubscriptionsForLifetime() {
    return prisma.professional_subscription.findMany({
      where: {
        ...paidGatewaySubscriptionWhere,
        status: "cancelada",
      },
      select: {
        createdAt: true,
        id: true,
        updatedAt: true,
      },
    });
  }

  async listPaymentEvents(range: AdminFinanceDateRange) {
    return prisma.payment_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        createdAt: dateRangeWhere(range),
        deleted: false,
        gateway: "mercadopago",
      },
      select: {
        createdAt: true,
        external_id: true,
        id: true,
        payload: true,
        type: true,
      },
    });
  }

  async listPaymentEventsForLifetime() {
    return prisma.payment_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        deleted: false,
        gateway: "mercadopago",
      },
      select: {
        createdAt: true,
        external_id: true,
        id: true,
        payload: true,
        type: true,
      },
    });
  }
}
