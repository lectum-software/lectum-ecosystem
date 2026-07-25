import type { admin } from "@/interfaces/objects";

export const ADMIN_NOTIFICATION_AUDIENCES = [
  "all_users",
  "patients",
  "psychologists",
  "active_patients",
  "active_psychologists",
] as const;

export const ADMIN_NOTIFICATION_CHANNELS = ["in_app", "push", "email"] as const;

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

export const ADMIN_NOTIFICATION_PERIODS = [
  "all",
  "today",
  "week",
  "month",
  "year",
  "7d",
  "30d",
  "90d",
  "custom",
] as const;

export type AdminNotificationAudience = (typeof ADMIN_NOTIFICATION_AUDIENCES)[number];
export type AdminNotificationChannel = (typeof ADMIN_NOTIFICATION_CHANNELS)[number];
export type AdminNotificationCampaignStatus = (typeof ADMIN_NOTIFICATION_CAMPAIGN_STATUSES)[number];
export type AdminNotificationPeriod = (typeof ADMIN_NOTIFICATION_PERIODS)[number];
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
  audience?: string;
  channel?: string;
  from?: string;
  limit?: number;
  page?: number;
  period?: AdminNotificationPeriod;
  q?: string;
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
