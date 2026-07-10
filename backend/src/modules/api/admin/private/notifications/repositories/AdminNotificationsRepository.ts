import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  AdminNotificationAudience,
  AdminNotificationCampaignStatus,
  AdminNotificationChannel,
  AdminNotificationsQuery,
  NotificationDeliveryStatus,
} from "../DTOs/IAdminNotificationsDTO";

export type DateRange = {
  end: Date;
  start: Date;
};

const activeAudienceWhere = (audience: AdminNotificationAudience): Prisma.userWhereInput => {
  const base: Prisma.userWhereInput = {
    active: true,
    deleted: false,
  };

  if (audience === "patients" || audience === "active_patients") {
    return { ...base, role: "paciente" };
  }

  if (audience === "psychologists" || audience === "active_psychologists") {
    return { ...base, role: "psicologo" };
  }

  return base;
};

export class AdminNotificationsRepository {
  async countCampaigns(where: Prisma.admin_notification_campaignWhereInput) {
    return prisma.admin_notification_campaign.count({ where });
  }

  async countDeliveries(where: Prisma.notification_deliveryWhereInput) {
    return prisma.notification_delivery.count({ where });
  }

  async countReachedUsers(where: Prisma.notification_deliveryWhereInput) {
    const rows = await prisma.notification_delivery.groupBy({
      by: ["user_id"],
      where,
    });

    return rows.length;
  }

  async createCampaign(data: {
    adminId: string;
    audience: AdminNotificationAudience;
    body: string;
    channels: AdminNotificationChannel[];
    redirect?: null | string;
    title: string;
  }) {
    return prisma.admin_notification_campaign.create({
      data: {
        audience: data.audience,
        body: data.body,
        channels: data.channels as Prisma.InputJsonValue,
        created_by_admin_id: data.adminId,
        redirect: data.redirect ?? null,
        status: "draft",
        title: data.title,
      },
    });
  }

  async findCampaign(id: string) {
    return prisma.admin_notification_campaign.findFirst({
      include: {
        created_by_admin: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
      where: {
        deleted: false,
        id,
      },
    });
  }

  async groupDeliveriesByCampaign(campaignIds: string[]) {
    if (campaignIds.length === 0) return [];

    return prisma.notification_delivery.groupBy({
      by: ["campaign_id", "channel", "status"],
      where: {
        campaign_id: {
          in: campaignIds,
        },
        deleted: false,
      },
      _count: {
        _all: true,
      },
    });
  }

  async groupDeliveriesByChannelStatusSource(where: Prisma.notification_deliveryWhereInput) {
    return prisma.notification_delivery.groupBy({
      by: ["channel", "source", "status"],
      where,
      _count: {
        _all: true,
      },
    });
  }

  async listAudienceUsers(audience: AdminNotificationAudience) {
    return prisma.user.findMany({
      include: {
        notification_preference: true,
        notification_subscriptions: {
          where: {
            deleted: false,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      where: activeAudienceWhere(audience),
    });
  }

  async listAutomaticLogs(params: {
    channel?: AdminNotificationChannel;
    page: number;
    limit: number;
    range?: DateRange | null;
    status?: NotificationDeliveryStatus;
    triggerKey?: string;
  }) {
    const where: Prisma.notification_deliveryWhereInput = {
      channel: params.channel,
      createdAt: params.range ? { gte: params.range.start, lte: params.range.end } : undefined,
      deleted: false,
      source: "automatic",
      status: params.status,
      trigger_key: params.triggerKey,
    };

    const [data, count] = await Promise.all([
      prisma.notification_delivery.findMany({
        include: {
          notification: {
            select: {
              id: true,
              message_key: true,
              message_props: true,
              redirect: true,
            },
          },
          user: {
            select: {
              email: true,
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        where,
      }),
      prisma.notification_delivery.count({ where }),
    ]);

    return { count, data };
  }

  async listCampaigns(params: {
    audience?: AdminNotificationAudience;
    channel?: AdminNotificationChannel;
    q?: string;
    range?: DateRange | null;
    limit: number;
    page: number;
    status?: AdminNotificationCampaignStatus;
  }) {
    const search = params.q?.trim();
    const where: Prisma.admin_notification_campaignWhereInput = {
      audience: params.audience,
      channels: params.channel ? { array_contains: params.channel } : undefined,
      createdAt: params.range ? { gte: params.range.start, lte: params.range.end } : undefined,
      deleted: false,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
      status: params.status,
    };

    const [data, count] = await Promise.all([
      prisma.admin_notification_campaign.findMany({
        include: {
          created_by_admin: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        where,
      }),
      prisma.admin_notification_campaign.count({ where }),
    ]);

    return { count, data };
  }

  async countActivePushSubscriptions() {
    const rows = await prisma.notification_subscription.findMany({
      select: {
        subscription: true,
      },
      where: {
        deleted: false,
      },
    });

    return rows.filter((row) => Boolean(row.subscription)).length;
  }

  async updateCampaign(id: string, data: Prisma.admin_notification_campaignUpdateInput) {
    return prisma.admin_notification_campaign.update({
      data,
      where: { id },
    });
  }
}

export const deliveryDateWhere = (range: DateRange): Prisma.DateTimeFilter => ({
  gte: range.start,
  lte: range.end,
});

export const deliveryReachedWhere = (range: DateRange): Prisma.notification_deliveryWhereInput => ({
  createdAt: deliveryDateWhere(range),
  deleted: false,
  status: {
    in: ["sent", "delivered", "read", "clicked"],
  },
});

export const parsePagination = (query: AdminNotificationsQuery | undefined) => {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query?.limit || 20)));

  return { limit, page };
};
