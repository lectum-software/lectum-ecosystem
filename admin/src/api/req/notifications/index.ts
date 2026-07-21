import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { Admin, ApiResponse } from "@/api/types";

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

export const ADMIN_NOTIFICATION_PERIODS = [
  "all",
  "today",
  "week",
  "month",
  "year",
  "custom",
] as const;

export type AdminNotificationAudience = (typeof ADMIN_NOTIFICATION_AUDIENCES)[number];
export type AdminNotificationChannel = (typeof ADMIN_NOTIFICATION_CHANNELS)[number];
export type AdminNotificationCampaignStatus = (typeof ADMIN_NOTIFICATION_CAMPAIGN_STATUSES)[number];
export type AdminNotificationPeriod = (typeof ADMIN_NOTIFICATION_PERIODS)[number];
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export type AdminNotificationsRangeQuery = {
  from?: string;
  period?: AdminNotificationPeriod;
  to?: string;
};

export type AdminNotificationCampaignsQuery = AdminNotificationsRangeQuery & {
  audience?: AdminNotificationAudience;
  channel?: AdminNotificationChannel;
  limit?: number;
  page?: number;
  q?: string;
  status?: AdminNotificationCampaignStatus;
};

export type AdminNotificationLogsQuery = AdminNotificationsRangeQuery & {
  audience?: AdminNotificationAudience;
  channel?: AdminNotificationChannel;
  limit?: number;
  page?: number;
  q?: string;
  status?: NotificationDeliveryStatus;
  trigger_key?: string;
};

export type AdminNotificationDeliveryCounts = {
  by_channel: Record<
    AdminNotificationChannel,
    {
      by_status: Record<NotificationDeliveryStatus, number>;
      total: number;
    }
  >;
  by_status: Record<NotificationDeliveryStatus, number>;
  total: number;
};

export type AdminNotificationCampaign = {
  audience: AdminNotificationAudience;
  body: string;
  canceled_at: string | null;
  channels: AdminNotificationChannel[];
  created_at: string;
  created_by_admin?: Pick<Admin, "email" | "id" | "name"> | null;
  delivery_counts: AdminNotificationDeliveryCounts;
  id: string;
  redirect: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: AdminNotificationCampaignStatus;
  title: string;
  updated_at: string;
};

export type AdminNotificationCampaignsResponse = {
  count: number;
  data: AdminNotificationCampaign[];
  page: number;
  pages: number;
};

export type AdminNotificationCampaignPayload = {
  audience: AdminNotificationAudience;
  body: string;
  channels: AdminNotificationChannel[];
  redirect?: string | null;
  title: string;
};

export type AdminNotificationSendResponse = {
  campaign: AdminNotificationCampaign;
  summary: {
    audience_users: number;
    failed: number;
    in_app_delivered: number;
    push_sent: number;
    skipped: number;
    total_deliveries: number;
  };
};

export type AdminNotificationMetricPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  timezone: "server-local";
  to: string;
};

export type AdminNotificationMetrics = {
  campaigns: Record<"canceled" | "draft" | "failed" | "scheduled" | "sent" | "total", number>;
  deliveries: {
    by_channel_status_source: Array<{
      channel: AdminNotificationChannel;
      count: number;
      source: "automatic" | "manual";
      status: NotificationDeliveryStatus;
    }>;
    clicked: number;
    failed: number;
    opened: number;
    reached: number;
    reached_users: number;
    skipped: number;
    total: number;
  };
  notes: string[];
  period: AdminNotificationMetricPeriod;
  rates: {
    click_rate_percent: number;
    open_rate_percent: number;
  };
};

export type AdminNotificationAutomaticLog = {
  campaign_id: string | null;
  channel: AdminNotificationChannel;
  clicked_at: string | null;
  created_at: string;
  delivered_at: string | null;
  failure_reason: string | null;
  id: string;
  metadata: unknown;
  notification: {
    id: string;
    message_key: string;
    message_props: unknown;
    redirect: string | null;
  } | null;
  read_at: string | null;
  sent_at: string | null;
  source: "automatic" | "manual";
  status: NotificationDeliveryStatus;
  trigger_key: string | null;
  user: Pick<Admin, "email" | "id" | "name"> & { role?: string | null };
};

export type AdminNotificationAutomaticLogsResponse = {
  count: number;
  data: AdminNotificationAutomaticLog[];
  page: number;
  pages: number;
};

export type AdminNotificationPushStatus = {
  active_subscriptions: number;
  available: boolean;
  configured: boolean;
  reason: "push_subscription_missing" | "push_vapid_not_configured" | null;
};

const cleanParams = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) =>
        value !== undefined && value !== "" && (key === "period" || value !== "all"),
    ),
  );

export const getAdminNotificationMetrics = async (input: AdminNotificationsRangeQuery) => {
  const response = await adminApi.get<ApiResponse<AdminNotificationMetrics>>(
    "/api/admin/private/notifications/metrics",
    { params: cleanParams(input) },
  );

  return resolveApiData(response.data);
};

export const getAdminNotificationCampaigns = async (input: AdminNotificationCampaignsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminNotificationCampaignsResponse>>(
    "/api/admin/private/notifications/campaigns",
    { params: cleanParams(input) },
  );

  return resolveApiData(response.data);
};

export const createAdminNotificationCampaign = async (input: AdminNotificationCampaignPayload) => {
  const response = await adminApi.post<ApiResponse<AdminNotificationCampaign>>(
    "/api/admin/private/notifications/campaigns",
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminNotificationCampaign = async (
  id: string,
  input: AdminNotificationCampaignPayload,
) => {
  const response = await adminApi.put<ApiResponse<AdminNotificationCampaign>>(
    `/api/admin/private/notifications/campaigns/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminNotificationCampaign = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminNotificationSendResponse>>(
    `/api/admin/private/notifications/campaigns/${encodeURIComponent(id)}/send`,
  );

  return resolveApiData(response.data);
};

export const scheduleAdminNotificationCampaign = async (id: string, scheduledAt: string) => {
  const response = await adminApi.post<ApiResponse<AdminNotificationCampaign>>(
    `/api/admin/private/notifications/campaigns/${encodeURIComponent(id)}/schedule`,
    { scheduled_at: scheduledAt },
  );

  return resolveApiData(response.data);
};

export const cancelAdminNotificationCampaign = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminNotificationCampaign>>(
    `/api/admin/private/notifications/campaigns/${encodeURIComponent(id)}/cancel`,
  );

  return resolveApiData(response.data);
};

export const getAdminNotificationAutomaticLogs = async (input: AdminNotificationLogsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminNotificationAutomaticLogsResponse>>(
    "/api/admin/private/notifications/automatic-logs",
    { params: cleanParams(input) },
  );

  return resolveApiData(response.data);
};

export const getAdminNotificationPushStatus = async () => {
  const response = await adminApi.get<ApiResponse<AdminNotificationPushStatus>>(
    "/api/admin/private/notifications/push-status",
  );

  return resolveApiData(response.data);
};
