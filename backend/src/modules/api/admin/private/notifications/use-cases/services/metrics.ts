import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { messages } from "@/main/notification/constants";
import type {
  AdminNotificationAudience,
  AdminNotificationChannel,
  IAdminNotificationsDTO,
  NotificationDeliveryStatus,
} from "../../DTOs/IAdminNotificationsDTO";
import {
  deliveryDateWhere,
  deliveryReachedWhere,
  parsePagination,
} from "../../repositories/AdminNotificationsRepository";

import {
  emailProviderStatusData,
  fail,
  OPEN_STATUSES,
  ok,
  REACHED_STATUSES,
  repository,
  resolveNotificationPeriod,
} from "./campaign-support";

type AutomaticLogRecord = Awaited<ReturnType<typeof repository.listAutomaticLogs>>["data"][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return null;

  const prop = value[key];
  return typeof prop === "string" && prop.trim().length > 0 ? prop.trim() : null;
};

const getRecordProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return null;

  const prop = value[key];
  return isRecord(prop) ? prop : null;
};

const resolveTitleFromMessage = (messageKey: null | string | undefined, messageProps: unknown) => {
  const explicitTitle = getStringProp(messageProps, "title");
  if (explicitTitle) return explicitTitle.slice(0, 120);

  if (!messageKey) return null;

  const build = messages[messageKey as keyof typeof messages] as
    | ((data: Record<string, unknown>) => { body: string; title: string })
    | undefined;
  if (!build) return null;

  const props = isRecord(messageProps) ? messageProps : {};
  const title = build(props).title.trim();

  return title.length > 0 ? title.slice(0, 120) : null;
};

const resolveAutomaticLogTitle = (item: AutomaticLogRecord) => {
  const metadataTitle =
    getStringProp(item.metadata, "notification_title") ?? getStringProp(item.metadata, "title");
  if (metadataTitle) return metadataTitle.slice(0, 120);

  const notificationTitle = resolveTitleFromMessage(
    item.notification?.message_key,
    item.notification?.message_props,
  );
  if (notificationTitle) return notificationTitle;

  const metadataMessageProps =
    getRecordProp(item.metadata, "message_props") ??
    getRecordProp(item.metadata, "notification_props");
  const metadataMessageKey =
    getStringProp(item.metadata, "message_key") ??
    item.trigger_key ??
    item.notification?.message_key;
  const resolvedMetadataTitle = resolveTitleFromMessage(metadataMessageKey, metadataMessageProps);

  return resolvedMetadataTitle ?? "Título não disponível";
};

export const emailStatus = async (): Promise<Resolve> => ok(emailProviderStatusData());

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
      notification_title: resolveAutomaticLogTitle(item),
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

export const rate = (numerator: number, denominator: number) =>
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
      "Email is available for manual campaigns only when SMTP is configured; reach counts accepted SMTP sends.",
      "O alcance por push considera somente envios concluídos; dispositivos sem permissão ou assinatura ativa são ignorados.",
      "Open/read and click rates use only persisted read_at/clicked_at events; email opens/clicks are not tracked yet.",
      "Audience active users are defined as user.active=true and deleted=false.",
    ],
    period: range.period,
    rates: {
      click_rate_percent: rate(clickedDeliveries, reachedDeliveries),
      open_rate_percent: rate(openedDeliveries, reachedDeliveries),
    },
  });
};
