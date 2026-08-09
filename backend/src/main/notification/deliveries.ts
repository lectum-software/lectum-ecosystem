import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

export type NotificationDeliveryChannel = "email" | "in_app" | "push";
export type NotificationDeliverySource = "automatic" | "manual";
export type NotificationDeliveryStatus =
  | "clicked"
  | "delivered"
  | "failed"
  | "queued"
  | "read"
  | "sent"
  | "skipped";

export type CreateNotificationDeliveryParams = {
  campaignId?: string | null;
  channel: NotificationDeliveryChannel;
  clickedAt?: Date | null;
  deliveredAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  notificationId?: string | null;
  readAt?: Date | null;
  sentAt?: Date | null;
  source: NotificationDeliverySource;
  status: NotificationDeliveryStatus;
  triggerKey?: string | null;
  userId: string;
};

const toJson = (value: Record<string, unknown> | null | undefined) =>
  value === undefined || value === null ? undefined : (value as Prisma.InputJsonValue);

export const createNotificationDelivery = async (params: CreateNotificationDeliveryParams) => {
  return prisma.notification_delivery.create({
    data: {
      campaign_id: params.campaignId ?? null,
      channel: params.channel,
      clicked_at: params.clickedAt ?? null,
      delivered_at: params.deliveredAt ?? null,
      failure_reason: params.failureReason ?? null,
      metadata: toJson(params.metadata),
      notification_id: params.notificationId ?? null,
      read_at: params.readAt ?? null,
      sent_at: params.sentAt ?? null,
      source: params.source,
      status: params.status,
      trigger_key: params.triggerKey ?? null,
      user_id: params.userId,
    },
  });
};

export const markNotificationDeliveriesRead = async (params: {
  notificationId: string;
  userId: string;
}) => {
  const readAt = new Date();

  return prisma.notification_delivery.updateMany({
    data: {
      read_at: readAt,
      status: "read",
    },
    where: {
      channel: "in_app",
      clicked_at: null,
      deleted: false,
      notification_id: params.notificationId,
      read_at: null,
      user_id: params.userId,
    },
  });
};

export const markAllUserNotificationDeliveriesRead = async (userId: string) => {
  const readAt = new Date();

  return prisma.notification_delivery.updateMany({
    data: {
      read_at: readAt,
      status: "read",
    },
    where: {
      channel: "in_app",
      clicked_at: null,
      deleted: false,
      notification_id: {
        not: null,
      },
      read_at: null,
      user_id: userId,
    },
  });
};

export const markNotificationDeliveriesClicked = async (params: {
  notificationId: string;
  userId: string;
}) => {
  const clickedAt = new Date();

  await prisma.notification_delivery.updateMany({
    data: {
      read_at: clickedAt,
    },
    where: {
      deleted: false,
      notification_id: params.notificationId,
      read_at: null,
      user_id: params.userId,
    },
  });

  return prisma.notification_delivery.updateMany({
    data: {
      clicked_at: clickedAt,
      status: "clicked",
    },
    where: {
      clicked_at: null,
      deleted: false,
      notification_id: params.notificationId,
      user_id: params.userId,
    },
  });
};
