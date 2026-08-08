import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { resolveCalendarPeriod, toDateKey } from "@/utils/date-range";
import {
  ADMIN_NOTIFICATION_AUDIENCES,
  ADMIN_NOTIFICATION_CHANNELS,
  type AdminNotificationAudience,
  type AdminNotificationChannel,
  type AdminNotificationsQuery,
  type CampaignPayload,
  NOTIFICATION_DELIVERY_STATUSES,
  type NotificationDeliveryStatus,
} from "../../DTOs/IAdminNotificationsDTO";
import {
  AdminNotificationsRepository,
  type DateRange,
} from "../../repositories/AdminNotificationsRepository";

export const MESSAGE_KEY = "admin_campaign";

export const DEFAULT_PERIOD_DAYS = 30;

export const MAX_PERIOD_DAYS = 3660;

export const OPEN_STATUSES = ["read", "clicked"];

export const REACHED_STATUSES = ["sent", "delivered", "read", "clicked"];

export const EMAIL_STATUS_REASON_NOT_CONFIGURED = "email_smtp_not_configured";

export const REQUIRED_EMAIL_ENV_KEYS = [
  "EMAIL_API_EMAIL",
  "EMAIL_API_KEY",
  "EMAIL_API_HOST",
  "EMAIL_API_PORT",
  "EMAIL_API_SENDER",
  "EMAIL_API_NAME",
  "EMAIL_API_UNSUBSCRIBE",
] as const;

export const repository = new AdminNotificationsRepository();

export const isNotificationCampaignSchedulerEnabled = () =>
  process.env.NOTIFICATION_CAMPAIGNS_SCHEDULER_ENABLED?.trim().toLowerCase() === "true";

export const fail = (code: string, status = 400): Resolve => ({
  status,
  ...error(code, {}),
});

export const ok = (data: unknown, code = "index", status = 200): Resolve => ({
  status,
  ...msg(code, {}),
  data,
});

export const emailProviderStatusData = () => {
  const configured = REQUIRED_EMAIL_ENV_KEYS.every((key) => Boolean(process.env[key]?.trim()));

  return {
    available: configured,
    configured,
    reason: configured ? null : EMAIL_STATUS_REASON_NOT_CONFIGURED,
    sender_address: process.env.EMAIL_API_SENDER || null,
    sender_name: process.env.EMAIL_API_NAME || null,
  };
};

export const ensureEmailProviderAvailable = (channels: AdminNotificationChannel[] | undefined) => {
  if (!channels?.includes("email")) return null;
  if (emailProviderStatusData().available) return null;

  return fail("admin_notification_email_provider_unavailable", 503);
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getFirstName = (name: string | null | undefined) => {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || "usuário";
};

export const renderEmailParagraphs = (body: string) =>
  body
    .split(/\r?\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 14px;">${escapeHtml(paragraph).replace(/\r?\n/g, "<br />")}</p>`,
    )
    .join("");

export const firstPublicWebUrl = () =>
  process.env.WEB_URL?.split(",")[0]?.trim().replace(/\/$/, "") || "";

export const redirectUrlForEmail = (redirect: null | string) => {
  if (!redirect) return undefined;

  const baseUrl = firstPublicWebUrl();
  return baseUrl ? `${baseUrl}${redirect}` : undefined;
};

export const adminNotificationEmailHtml = (campaign: CampaignRecord) => {
  const redirectHint = campaign.redirect
    ? '<p style="margin: 18px 0 0; color: #64748b;">Use o botão abaixo para abrir a área relacionada na Lectum.</p>'
    : "";

  return `<div style="text-align: left; color: #0f2344;">
    <h2 style="font-family: 'Poppins', Helvetica, Arial, sans-serif; font-size: 22px; line-height: 30px; margin: 0 0 16px;">${escapeHtml(
      campaign.title,
    )}</h2>
    <div style="font-size: 16px; line-height: 26px;">${renderEmailParagraphs(campaign.body)}</div>
    ${redirectHint}
  </div>`;
};

export const resolvePeriod = (
  query: AdminNotificationsQuery | undefined,
  allPeriodStartDate?: Date,
) => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    defaultPreset: "all",
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return null;

  const { days, end, label, start } = resolved;
  return {
    end,
    period: {
      days,
      from: toDateKey(start),
      label,
      max_days: MAX_PERIOD_DAYS,
      timezone: "server-local",
      to: toDateKey(end),
    },
    start,
  } satisfies DateRange & { period: Record<string, unknown> };
};

export const resolveNotificationPeriod = async (query: AdminNotificationsQuery | undefined) =>
  resolvePeriod(query, await repository.findEarliestNotificationActivityDate());

export const isAdminNotificationAudience = (value: string): value is AdminNotificationAudience =>
  ADMIN_NOTIFICATION_AUDIENCES.includes(value as AdminNotificationAudience);

export const isAdminNotificationChannel = (value: string): value is AdminNotificationChannel =>
  ADMIN_NOTIFICATION_CHANNELS.includes(value as AdminNotificationChannel);

export const normalizeChannels = (
  channels: string[] | undefined,
): Resolve | AdminNotificationChannel[] => {
  if (!channels || channels.length === 0) return fail("admin_notification_channel_required");

  const normalized = [...new Set(channels.map((channel) => channel.trim().toLowerCase()))];

  if (!normalized.every(isAdminNotificationChannel)) {
    return fail("admin_notification_invalid_channel");
  }

  return normalized;
};

export const normalizeRedirect = (redirect: null | string | undefined) => {
  if (redirect === undefined) return undefined;
  if (redirect === null) return null;

  const value = redirect.trim();
  if (!value) return null;
  if (value.length > 512 || !value.startsWith("/") || value.startsWith("//")) {
    return fail("admin_notification_invalid_redirect");
  }

  return value;
};

export const normalizeCampaignPayload = (payload: CampaignPayload, partial = false) => {
  const data: {
    audience?: AdminNotificationAudience;
    body?: string;
    channels?: AdminNotificationChannel[];
    redirect?: null | string;
    title?: string;
  } = {};

  if (payload.title !== undefined) data.title = payload.title.trim();
  if (payload.body !== undefined) data.body = payload.body.trim();

  if (!partial || payload.audience !== undefined) {
    const audience = String(payload.audience ?? "");
    if (!isAdminNotificationAudience(audience)) return fail("admin_notification_invalid_audience");
    data.audience = audience;
  }

  if (!partial || payload.channels !== undefined) {
    const channels = normalizeChannels(payload.channels);
    if (!Array.isArray(channels)) return channels;
    data.channels = channels;
  }

  const redirect = normalizeRedirect(payload.redirect);
  if (redirect && typeof redirect === "object" && "success" in redirect) return redirect;
  if (redirect !== undefined) data.redirect = redirect;

  return data;
};

export const parseStoredChannels = (value: Prisma.JsonValue): AdminNotificationChannel[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is AdminNotificationChannel =>
      typeof item === "string" && isAdminNotificationChannel(item),
  );
};

export type DeliveryGroup = Awaited<
  ReturnType<AdminNotificationsRepository["groupDeliveriesByCampaign"]>
>[number];

export const emptyDeliveryCounts = () => ({
  by_channel: Object.fromEntries(
    ADMIN_NOTIFICATION_CHANNELS.map((channel) => [
      channel,
      {
        by_status: Object.fromEntries(NOTIFICATION_DELIVERY_STATUSES.map((status) => [status, 0])),
        total: 0,
      },
    ]),
  ),
  by_status: Object.fromEntries(NOTIFICATION_DELIVERY_STATUSES.map((status) => [status, 0])),
  total: 0,
});

export const buildDeliveryCounts = (groups: DeliveryGroup[]) => {
  const counts = emptyDeliveryCounts();

  for (const group of groups) {
    if (!group.channel || !group.status) continue;
    const total = group._count._all;
    counts.total += total;
    counts.by_status[group.status as NotificationDeliveryStatus] =
      (counts.by_status[group.status as NotificationDeliveryStatus] ?? 0) + total;

    const channel = group.channel as AdminNotificationChannel;
    if (counts.by_channel[channel]) {
      counts.by_channel[channel].total += total;
      counts.by_channel[channel].by_status[group.status as NotificationDeliveryStatus] =
        (counts.by_channel[channel].by_status[group.status as NotificationDeliveryStatus] ?? 0) +
        total;
    }
  }

  return counts;
};

export type CampaignRecord = NonNullable<
  Awaited<ReturnType<AdminNotificationsRepository["findCampaign"]>>
>;

export const serializeCampaign = (campaign: CampaignRecord, groups: DeliveryGroup[] = []) => ({
  audience: campaign.audience,
  body: campaign.body,
  canceled_at: campaign.canceled_at?.toISOString() ?? null,
  channels: parseStoredChannels(campaign.channels),
  created_at: campaign.createdAt.toISOString(),
  created_by_admin: campaign.created_by_admin,
  delivery_counts: buildDeliveryCounts(groups),
  id: campaign.id,
  redirect: campaign.redirect,
  scheduled_at: campaign.scheduled_at?.toISOString() ?? null,
  sent_at: campaign.sent_at?.toISOString() ?? null,
  status: campaign.status,
  title: campaign.title,
  updated_at: campaign.updatedAt.toISOString(),
});

export const ensureCampaign = async (id: string | undefined) => {
  if (!id) return null;
  return repository.findCampaign(id);
};

export const ensureMutableCampaign = (campaign: CampaignRecord) => {
  if (campaign.status !== "draft") return fail("admin_notification_campaign_not_mutable");
  return null;
};

export const ensureSchedulableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_schedulable");
  }
  return null;
};

export const ensureSendableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_sendable");
  }
  return null;
};

export const ensureCancelableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_cancelable");
  }
  return null;
};

export const manualMessageProps = (campaign: CampaignRecord) => ({
  body: campaign.body,
  campaign_id: campaign.id,
  source_type: "admin_notification_campaign",
  title: campaign.title,
});
