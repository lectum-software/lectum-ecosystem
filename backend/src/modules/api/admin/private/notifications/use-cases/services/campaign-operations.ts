import { isWebPushConfigured } from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import type {
  AdminNotificationAudience,
  AdminNotificationCampaignStatus,
  AdminNotificationChannel,
  IAdminNotificationsDTO,
} from "../../DTOs/IAdminNotificationsDTO";
import { parsePagination } from "../../repositories/AdminNotificationsRepository";

import {
  type CampaignRecord,
  type DeliveryGroup,
  ensureCampaign,
  ensureCancelableCampaign,
  ensureEmailProviderAvailable,
  ensureMutableCampaign,
  ensureSchedulableCampaign,
  ensureSendableCampaign,
  fail,
  isNotificationCampaignSchedulerEnabled,
  normalizeCampaignPayload,
  ok,
  parseStoredChannels,
  repository,
  resolveNotificationPeriod,
  serializeCampaign,
} from "./campaign-support";

import { dispatchClaimedCampaign } from "./delivery";

export const createCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const adminId = data.admin?.id;
  if (!adminId) return fail("token_not_authorized", 401);

  const normalized = normalizeCampaignPayload(data.b ?? {});
  if ("success" in normalized) return normalized;
  const emailProvider = ensureEmailProviderAvailable(normalized.channels);
  if (emailProvider) return emailProvider;

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
  const emailProvider = ensureEmailProviderAvailable(normalized.channels);
  if (emailProvider) return emailProvider;

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
  if (!isNotificationCampaignSchedulerEnabled()) {
    return fail("admin_notification_scheduler_unavailable", 503);
  }

  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const schedulable = ensureSchedulableCampaign(campaign);
  if (schedulable) return schedulable;

  const scheduledAt = data.b?.scheduled_at;
  if (!scheduledAt || scheduledAt <= new Date()) return fail("admin_notification_invalid_schedule");

  const updated = await repository.transitionCampaign(campaign.id, ["draft", "scheduled"], {
    scheduled_at: scheduledAt,
    status: "scheduled",
  });
  if (!updated) return fail("admin_notification_campaign_not_schedulable", 409);

  return ok(serializeCampaign(updated), "update");
};

export const cancelCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const cancelable = ensureCancelableCampaign(campaign);
  if (cancelable) return cancelable;

  const updated = await repository.transitionCampaign(campaign.id, ["draft", "scheduled"], {
    canceled_at: new Date(),
    status: "canceled",
  });
  if (!updated) return fail("admin_notification_campaign_not_cancelable", 409);

  return ok(serializeCampaign(updated), "update");
};

export const sendCampaign = async (data: IAdminNotificationsDTO): Promise<Resolve> => {
  const campaign = await ensureCampaign(data.p?.id);
  if (!campaign) return fail("not_found", 404);

  const sendable = ensureSendableCampaign(campaign);
  if (sendable) return sendable;
  const emailProvider = ensureEmailProviderAvailable(parseStoredChannels(campaign.channels));
  if (emailProvider) return emailProvider;

  const claimed = await repository.claimCampaign(campaign.id, ["draft", "scheduled"]);
  if (!claimed) return fail("admin_notification_campaign_not_sendable", 409);

  const dispatched = await dispatchClaimedCampaign(claimed);
  const groups = await repository.groupDeliveriesByCampaign([campaign.id]);

  return ok({
    campaign: serializeCampaign(dispatched.campaign, groups),
    summary: dispatched.summary,
  });
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
