import type { admin } from "@/interfaces/objects";

export const ADMIN_NOTIFICATION_AUDIENCES = [
  "all_users",
  "patients",
  "psychologists",
  "active_patients",
  "active_psychologists",
] as const;

export const ADMIN_NOTIFICATION_CHANNELS = ["in_app", "push"] as const;

export const ADMIN_NOTIFICATION_CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "canceled",
  "failed",
] as const;

export const NOTIFICATION_DELIVERY_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "clicked",
  "failed",
  "skipped",
] as const;

export type AdminNotificationAudience = (typeof ADMIN_NOTIFICATION_AUDIENCES)[number];
export type AdminNotificationChannel = (typeof ADMIN_NOTIFICATION_CHANNELS)[number];
export type AdminNotificationCampaignStatus = (typeof ADMIN_NOTIFICATION_CAMPAIGN_STATUSES)[number];
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export type CampaignPayload = {
  audience?: string;
  body?: string;
  channels?: string[];
  redirect?: null | string;
  title?: string;
};

export type SchedulePayload = {
  scheduled_at?: Date;
};

export type AdminNotificationsQuery = {
  channel?: string;
  from?: string;
  limit?: number;
  page?: number;
  status?: string;
  to?: string;
  trigger_key?: string;
};

export type IAdminNotificationsDTO = {
  admin: admin;
  b?: CampaignPayload & SchedulePayload;
  p?: {
    id?: string;
  };
  q?: AdminNotificationsQuery;
};
