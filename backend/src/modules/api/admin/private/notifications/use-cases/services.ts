import { isWebPushConfigured } from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { createNotificationDelivery } from "@/main/notification/deliveries";
import { isChannelAllowed } from "@/main/notification/preferences";
import { sendWebPushToSubscriptions } from "@/main/notification/push";
import { notification as emitNotification } from "@/main/socket/events/notification";
import {
  ADMIN_NOTIFICATION_AUDIENCES,
  ADMIN_NOTIFICATION_CHANNELS,
  type AdminNotificationAudience,
  type AdminNotificationCampaignStatus,
  type AdminNotificationChannel,
  type AdminNotificationsQuery,
  type CampaignPayload,
  type IAdminNotificationsDTO,
  NOTIFICATION_DELIVERY_STATUSES,
  type NotificationDeliveryStatus,
} from "../DTOs/IAdminNotificationsDTO";
import {
  AdminNotificationsRepository,
  type DateRange,
  deliveryDateWhere,
  deliveryReachedWhere,
  parsePagination,
} from "../repositories/AdminNotificationsRepository";

const MESSAGE_KEY = "admin_campaign";
const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const OPEN_STATUSES = ["read", "clicked"];
const REACHED_STATUSES = ["sent", "delivered", "read", "clicked"];

const repository = new AdminNotificationsRepository();

const fail = (code: string, status = 400): Resolve => ({
  status,
  ...error(code, {}),
});

const ok = (data: unknown, code = "index", status = 200): Resolve => ({
  status,
  ...msg(code, {}),
  data,
});

const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonth = (date: Date) => startOfDate(new Date(date.getFullYear(), date.getMonth(), 1));

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(next, diff);
};

const startOfYear = (date: Date) => startOfDate(new Date(date.getFullYear(), 0, 1));

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / 86_400_000) + 1;
};

const resolvePeriod = (query: AdminNotificationsQuery | undefined, allPeriodStartDate?: Date) => {
  const hasCustomFrom = Boolean(query?.from);
  const hasCustomTo = Boolean(query?.to);
  const preset = query?.period || (hasCustomFrom || hasCustomTo ? "custom" : "all");
  let start: Date;
  let end: Date;
  let label = "Todo o período";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) return null;

    const customStart = parseDateOnly(query?.from, "start");
    const customEnd = parseDateOnly(query?.to, "end");
    if (!customStart || !customEnd || customStart > customEnd) return null;

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o período";
  } else {
    return null;
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) return null;

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

const resolveNotificationPeriod = async (query: AdminNotificationsQuery | undefined) =>
  resolvePeriod(query, await repository.findEarliestNotificationActivityDate());

const isAdminNotificationAudience = (value: string): value is AdminNotificationAudience =>
  ADMIN_NOTIFICATION_AUDIENCES.includes(value as AdminNotificationAudience);

const isAdminNotificationChannel = (value: string): value is AdminNotificationChannel =>
  ADMIN_NOTIFICATION_CHANNELS.includes(value as AdminNotificationChannel);

const normalizeChannels = (
  channels: string[] | undefined,
): Resolve | AdminNotificationChannel[] => {
  if (!channels || channels.length === 0) return fail("admin_notification_channel_required");

  const normalized = [...new Set(channels.map((channel) => channel.trim().toLowerCase()))];
  if (normalized.includes("email")) return fail("admin_notification_email_channel_not_allowed");

  if (!normalized.every(isAdminNotificationChannel)) {
    return fail("admin_notification_invalid_channel");
  }

  return normalized;
};

const normalizeRedirect = (redirect: null | string | undefined) => {
  if (redirect === undefined) return undefined;
  if (redirect === null) return null;

  const value = redirect.trim();
  if (!value) return null;
  if (value.length > 512 || !value.startsWith("/") || value.startsWith("//")) {
    return fail("admin_notification_invalid_redirect");
  }

  return value;
};

const normalizeCampaignPayload = (payload: CampaignPayload, partial = false) => {
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

const parseStoredChannels = (value: Prisma.JsonValue): AdminNotificationChannel[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is AdminNotificationChannel =>
      typeof item === "string" && isAdminNotificationChannel(item),
  );
};

type DeliveryGroup = Awaited<
  ReturnType<AdminNotificationsRepository["groupDeliveriesByCampaign"]>
>[number];

const emptyDeliveryCounts = () => ({
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

const buildDeliveryCounts = (groups: DeliveryGroup[]) => {
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

type CampaignRecord = NonNullable<
  Awaited<ReturnType<AdminNotificationsRepository["findCampaign"]>>
>;

const serializeCampaign = (campaign: CampaignRecord, groups: DeliveryGroup[] = []) => ({
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

const ensureCampaign = async (id: string | undefined) => {
  if (!id) return null;
  return repository.findCampaign(id);
};

const ensureMutableCampaign = (campaign: CampaignRecord) => {
  if (campaign.status !== "draft") return fail("admin_notification_campaign_not_mutable");
  return null;
};

const ensureSchedulableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_schedulable");
  }
  return null;
};

const ensureSendableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_sendable");
  }
  return null;
};

const ensureCancelableCampaign = (campaign: CampaignRecord) => {
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return fail("admin_notification_campaign_not_cancelable");
  }
  return null;
};

const manualMessageProps = (campaign: CampaignRecord) => ({
  body: campaign.body,
  campaign_id: campaign.id,
  source_type: "admin_notification_campaign",
  title: campaign.title,
});

const materializeCampaignDeliveries = async (campaign: CampaignRecord) => {
  const channels = parseStoredChannels(campaign.channels);
  const audience = campaign.audience as AdminNotificationAudience;
  const users = await repository.listAudienceUsers(audience);
  const emittedUsers: string[] = [];
  const summary = {
    audience_users: users.length,
    failed: 0,
    in_app_delivered: 0,
    push_sent: 0,
    skipped: 0,
    total_deliveries: 0,
  };

  for (const user of users) {
    if (channels.includes("in_app")) {
      const now = new Date();
      if (!isChannelAllowed(user.notification_preference?.prefs, MESSAGE_KEY, "in_app")) {
        summary.skipped++;
        summary.total_deliveries++;
        await createNotificationDelivery({
          campaignId: campaign.id,
          channel: "in_app",
          failureReason: "preference_disabled",
          metadata: { campaign_id: campaign.id },
          source: "manual",
          status: "skipped",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
      } else {
        const notification = await prisma.notification.create({
          data: {
            message_key: MESSAGE_KEY,
            message_props: manualMessageProps(campaign) as Prisma.InputJsonValue,
            redirect: campaign.redirect,
            user_id: user.id,
          },
        });

        await createNotificationDelivery({
          campaignId: campaign.id,
          channel: "in_app",
          deliveredAt: now,
          metadata: { campaign_id: campaign.id },
          notificationId: notification.id,
          sentAt: now,
          source: "manual",
          status: "delivered",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
        summary.in_app_delivered++;
        summary.total_deliveries++;
        emittedUsers.push(user.id);
      }
    }

    if (channels.includes("push")) {
      if (!isChannelAllowed(user.notification_preference?.prefs, MESSAGE_KEY, "push")) {
        summary.skipped++;
        summary.total_deliveries++;
        await createNotificationDelivery({
          campaignId: campaign.id,
          channel: "push",
          failureReason: "preference_disabled",
          metadata: { campaign_id: campaign.id },
          source: "manual",
          status: "skipped",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
        continue;
      }

      const result = await sendWebPushToSubscriptions({
        body: campaign.body,
        campaignId: campaign.id,
        messageProps: manualMessageProps(campaign),
        redirect: campaign.redirect,
        subscriptions: user.notification_subscriptions,
        title: campaign.title,
      });
      const now = new Date();

      if (result.status === "sent") summary.push_sent++;
      if (result.status === "failed") summary.failed++;
      if (result.status === "skipped") summary.skipped++;
      summary.total_deliveries++;

      await createNotificationDelivery({
        campaignId: campaign.id,
        channel: "push",
        failureReason: result.failureReason ?? null,
        metadata: {
          campaign_id: campaign.id,
          failed_count: result.failedCount,
          sent_count: result.sentCount,
          targeted_count: result.targetedCount,
        },
        sentAt: result.status === "sent" ? now : null,
        source: "manual",
        status: result.status,
        triggerKey: MESSAGE_KEY,
        userId: user.id,
      });
    }
  }

  if (emittedUsers.length > 0) {
    await emitNotification(emittedUsers);
  }

  return summary;
};

export const createCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const adminId = data.admin?.id;
  if (!adminId) return fail("token_not_authorized", 401);

  const normalized = normalizeCampaignPayload(data.b ?? {});
  if ("success" in normalized) return normalized;

  const campaign = await repository.createCampaign({
    adminId,
    audience: normalized.audience!,
    body: normalized.body!,
    channels: normalized.channels!,
    redirect: normalized.redirect,
    title: normalized.title!,
  });

  return ok(
    serializeCampaign({ ...campaign, created_by_admin: data.admin } as CampaignRecord),
    "store",
    201,
  );
};

export const updateCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const mutable = ensureMutableCampaign(campaign);
  if (mutable) return mutable;

  const normalized = normalizeCampaignPayload(data.b ?? {}, true);
  if ("success" in normalized) return normalized;

  const updated = await repository.updateCampaign(campaign.id, {
    audience: normalized.audience,
    body: normalized.body,
    channels: normalized.channels as Prisma.InputJsonValue | undefined,
    redirect: normalized.redirect,
    title: normalized.title,
  });

  const full = await repository.findCampaign(updated.id);
  return ok(full ? serializeCampaign(full) : updated, "update");
};

export const scheduleCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const schedulable = ensureSchedulableCampaign(campaign);
  if (schedulable) return schedulable;

  const scheduledAt = data.b?.scheduled_at;
  if (!scheduledAt || scheduledAt <= new Date()) return fail("admin_notification_invalid_schedule");

  const updated = await repository.updateCampaign(campaign.id, {
    scheduled_at: scheduledAt,
    status: "scheduled",
  });
  const full = await repository.findCampaign(updated.id);

  return ok(full ? serializeCampaign(full) : updated, "update");
};

export const cancelCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const cancelable = ensureCancelableCampaign(campaign);
  if (cancelable) return cancelable;

  const updated = await repository.updateCampaign(campaign.id, {
    canceled_at: new Date(),
    status: "canceled",
  });
  const full = await repository.findCampaign(updated.id);

  return ok(full ? serializeCampaign(full) : updated, "update");
};

export const sendCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const sendable = ensureSendableCampaign(campaign);
  if (sendable) return sendable;

  await repository.updateCampaign(campaign.id, { status: "sending" });

  try {
    const summary = await materializeCampaignDeliveries(campaign);
    const updated = await repository.updateCampaign(campaign.id, {
      sent_at: new Date(),
      status: "sent",
    });
    const full = await repository.findCampaign(updated.id);
    const groups = await repository.groupDeliveriesByCampaign([campaign.id]);

    return ok({
      campaign: full ? serializeCampaign(full, groups) : updated,
      summary,
    });
  } catch (err) {
    await repository.updateCampaign(campaign.id, { status: "failed" });
    throw err;
  }
};

export const listCampaigns = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const { limit, page } = parsePagination(data.q);
  const status = data.q?.status as AdminNotificationCampaignStatus | undefined;
  const audience = data.q?.audience as AdminNotificationAudience | undefined;
  const channel = data.q?.channel as AdminNotificationChannel | undefined;
  const range = await resolveNotificationPeriod(data.q);
  if (!range) return fail("invalid_analytics_date_range");

  const list = await repository.listCampaigns({
    audience,
    channel,
    limit,
    page,
    q: data.q?.q,
    range,
    status,
  });
  const groups = await repository.groupDeliveriesByCampaign(
    list.data.map((campaign) => campaign.id),
  );
  const groupsByCampaign = new Map<string, DeliveryGroup[]>();

  for (const group of groups) {
    if (!group.campaign_id) continue;
    const current = groupsByCampaign.get(group.campaign_id) ?? [];
    current.push(group);
    groupsByCampaign.set(group.campaign_id, current);
  }

  return ok({
    count: list.count,
    data: list.data.map((campaign) =>
      serializeCampaign(campaign, groupsByCampaign.get(campaign.id)),
    ),
    page,
    pages: Math.ceil(list.count / limit),
  });
};

export const showCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const groups = await repository.groupDeliveriesByCampaign([campaign.id]);
  return ok(serializeCampaign(campaign, groups));
};
export const pushStatus = async (): Promise<Resolve> => {
  const configured = isWebPushConfigured();
  const activeSubscriptions = await repository.countActivePushSubscriptions();

  return ok({
    active_subscriptions: activeSubscriptions,
    available: configured && activeSubscriptions > 0,
    configured,
    reason: !configured
      ? "push_vapid_not_configured"
      : activeSubscriptions === 0
        ? "push_subscription_missing"
        : null,
  });
};

export const automaticLogs = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const { limit, page } = parsePagination(data.q);
  const range = await resolveNotificationPeriod(data.q);
  if (!range) return fail("invalid_analytics_date_range");

  const list = await repository.listAutomaticLogs({
    audience: data.q?.audience as AdminNotificationAudience | undefined,
    channel: data.q?.channel as AdminNotificationChannel | undefined,
    limit,
    page,
    q: data.q?.q,
    range,
    status: data.q?.status as NotificationDeliveryStatus | undefined,
    triggerKey: data.q?.trigger_key,
  });

  return ok({
    count: list.count,
    data: list.data.map((item) => ({
      campaign_id: item.campaign_id,
      channel: item.channel,
      clicked_at: item.clicked_at?.toISOString() ?? null,
      created_at: item.createdAt.toISOString(),
      delivered_at: item.delivered_at?.toISOString() ?? null,
      failure_reason: item.failure_reason,
      id: item.id,
      metadata: item.metadata,
      notification: item.notification,
      read_at: item.read_at?.toISOString() ?? null,
      sent_at: item.sent_at?.toISOString() ?? null,
      source: item.source,
      status: item.status,
      trigger_key: item.trigger_key,
      user: item.user,
    })),
    page,
    pages: Math.ceil(list.count / limit),
  });
};

const rate = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 10_000) / 100;

export const metrics = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const range = await resolveNotificationPeriod(data.q);
  if (!range) return fail("invalid_analytics_date_range");

  const deliveryWhere: Prisma.notification_deliveryWhereInput = {
    createdAt: deliveryDateWhere(range),
    deleted: false,
  };
  const campaignWhere: Prisma.admin_notification_campaignWhereInput = {
    createdAt: deliveryDateWhere(range),
    deleted: false,
  };

  const [
    totalCampaigns,
    draftCampaigns,
    scheduledCampaigns,
    sentCampaigns,
    canceledCampaigns,
    failedCampaigns,
    totalDeliveries,
    reachedDeliveries,
    reachedUsers,
    openedDeliveries,
    clickedDeliveries,
    failedDeliveries,
    skippedDeliveries,
    groups,
  ] = await Promise.all([
    repository.countCampaigns(campaignWhere),
    repository.countCampaigns({ ...campaignWhere, status: "draft" }),
    repository.countCampaigns({ ...campaignWhere, status: "scheduled" }),
    repository.countCampaigns({ ...campaignWhere, status: "sent" }),
    repository.countCampaigns({ ...campaignWhere, status: "canceled" }),
    repository.countCampaigns({ ...campaignWhere, status: "failed" }),
    repository.countDeliveries(deliveryWhere),
    repository.countDeliveries({ ...deliveryWhere, status: { in: REACHED_STATUSES } }),
    repository.countReachedUsers(deliveryReachedWhere(range)),
    repository.countDeliveries({
      ...deliveryWhere,
      OR: [
        { read_at: { not: null } },
        { clicked_at: { not: null } },
        { status: { in: OPEN_STATUSES } },
      ],
    }),
    repository.countDeliveries({ ...deliveryWhere, clicked_at: { not: null } }),
    repository.countDeliveries({ ...deliveryWhere, status: "failed" }),
    repository.countDeliveries({ ...deliveryWhere, status: "skipped" }),
    repository.groupDeliveriesByChannelStatusSource(deliveryWhere),
  ]);

  return ok({
    campaigns: {
      canceled: canceledCampaigns,
      draft: draftCampaigns,
      failed: failedCampaigns,
      scheduled: scheduledCampaigns,
      sent: sentCampaigns,
      total: totalCampaigns,
    },
    deliveries: {
      by_channel_status_source: groups.map((group) => ({
        channel: group.channel,
        count: group._count._all,
        source: group.source,
        status: group.status,
      })),
      clicked: clickedDeliveries,
      failed: failedDeliveries,
      opened: openedDeliveries,
      reached: reachedDeliveries,
      reached_users: reachedUsers,
      skipped: skippedDeliveries,
      total: totalDeliveries,
    },
    notes: [
      "Email is not available in V1. Only in_app and push are tracked.",
      "Push reach is counted only when a real web push send succeeds; missing VAPID or subscriptions are skipped.",
      "Open/read and click rates use only persisted read_at/clicked_at events.",
      "Audience active users are defined as user.active=true and deleted=false.",
    ],
    period: range.period,
    rates: {
      click_rate_percent: rate(clickedDeliveries, reachedDeliveries),
      open_rate_percent: rate(openedDeliveries, reachedDeliveries),
    },
  });
};

export default listCampaigns;
