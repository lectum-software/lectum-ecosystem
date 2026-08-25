import type { Prisma } from "@/external/generated/prisma/client";
import { resolve as translate } from "@/helpers/translate/resolve";
import prisma from "@/infra/database/prisma";
import { createNotificationDelivery } from "@/main/notification/deliveries";
import { isChannelAllowed } from "@/main/notification/preferences";
import { sendWebPushToSubscriptions } from "@/main/notification/push";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { send as sendEmail } from "@/modules/api/config/nodemailer/send";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import type { AdminNotificationAudience } from "../../DTOs/IAdminNotificationsDTO";
import type { AdminNotificationsRepository } from "../../repositories/AdminNotificationsRepository";

import {
  adminNotificationEmailHtml,
  type CampaignRecord,
  ensureEmailProviderAvailable,
  getFirstName,
  isNotificationCampaignSchedulerEnabled,
  MESSAGE_KEY,
  manualMessageProps,
  parseStoredChannels,
  redirectUrlForEmail,
  repository,
} from "./campaign-support";

export type AudienceUser = Awaited<
  ReturnType<AdminNotificationsRepository["listAudienceUsers"]>
>[number];

const deliveryMetadata = (campaign: CampaignRecord, extra?: Record<string, unknown>) => ({
  campaign_id: campaign.id,
  notification_title: campaign.title,
  ...extra,
});

export const sendCampaignEmail = async (campaign: CampaignRecord, user: AudienceUser) => {
  const redirectUrl = redirectUrlForEmail(campaign.redirect);
  const name = getFirstName(user.name);

  return sendEmail({
    messageProps: {
      btn_accept_invite: redirectUrl ? translate("email.btn_open_notification") : undefined,
      email: user.email,
      hello: translate("email.hello", { name }),
      html: adminNotificationEmailHtml(campaign),
      name,
      send_for: translate("email.send_for"),
      url: redirectUrl,
    },
    subject: campaign.title,
    template: "transactional",
    to: user.email,
    type: "marketing",
  });
};

export const materializeCampaignDeliveries = async (campaign: CampaignRecord) => {
  const channels = parseStoredChannels(campaign.channels);
  const audience = campaign.audience as AdminNotificationAudience;
  const users = await repository.listAudienceUsers(audience);
  const emittedUsers: string[] = [];
  const summary = {
    audience_users: users.length,
    email_sent: 0,
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
          metadata: deliveryMetadata(campaign),
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
          metadata: deliveryMetadata(campaign),
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
          metadata: deliveryMetadata(campaign),
          source: "manual",
          status: "skipped",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
      } else {
        const result = await sendWebPushToSubscriptions({
          body: campaign.body,
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
          metadata: deliveryMetadata(campaign, {
            failed_count: result.failedCount,
            sent_count: result.sentCount,
            targeted_count: result.targetedCount,
          }),
          sentAt: result.status === "sent" ? now : null,
          source: "manual",
          status: result.status,
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
      }
    }

    if (channels.includes("email")) {
      const email = user.email?.trim();
      const now = new Date();

      if (!isChannelAllowed(user.notification_preference?.prefs, MESSAGE_KEY, "email")) {
        summary.skipped++;
        summary.total_deliveries++;
        await createNotificationDelivery({
          campaignId: campaign.id,
          channel: "email",
          failureReason: "preference_disabled",
          metadata: deliveryMetadata(campaign),
          source: "manual",
          status: "skipped",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
      } else if (!email) {
        summary.skipped++;
        summary.total_deliveries++;
        await createNotificationDelivery({
          campaignId: campaign.id,
          channel: "email",
          failureReason: "email_missing",
          metadata: deliveryMetadata(campaign),
          source: "manual",
          status: "skipped",
          triggerKey: MESSAGE_KEY,
          userId: user.id,
        });
      } else {
        try {
          const delivered = await sendCampaignEmail(campaign, user);
          summary.total_deliveries++;
          if (delivered) {
            summary.email_sent++;
            await createNotificationDelivery({
              campaignId: campaign.id,
              channel: "email",
              metadata: deliveryMetadata(campaign),
              sentAt: now,
              source: "manual",
              status: "sent",
              triggerKey: MESSAGE_KEY,
              userId: user.id,
            });
          } else {
            summary.failed++;
            await createNotificationDelivery({
              campaignId: campaign.id,
              channel: "email",
              failureReason: "email_send_failed",
              metadata: deliveryMetadata(campaign),
              source: "manual",
              status: "failed",
              triggerKey: MESSAGE_KEY,
              userId: user.id,
            });
          }
        } catch (error) {
          console.error(
            "[NOTIFICATION CAMPAIGNS] Falha no envio de e-mail.",
            toSafeErrorLog(error, "CampaignEmailDeliveryError"),
          );
          summary.failed++;
          summary.total_deliveries++;
          await createNotificationDelivery({
            campaignId: campaign.id,
            channel: "email",
            failureReason: "email_send_failed",
            metadata: deliveryMetadata(campaign),
            source: "manual",
            status: "failed",
            triggerKey: MESSAGE_KEY,
            userId: user.id,
          });
        }
      }
    }
  }

  if (emittedUsers.length > 0) {
    await emitNotification(emittedUsers);
  }

  return summary;
};

export const dispatchClaimedCampaign = async (campaign: CampaignRecord) => {
  try {
    const summary = await materializeCampaignDeliveries(campaign);
    await repository.updateCampaign(campaign.id, {
      sent_at: new Date(),
      status: "sent",
    });
    const updated = await repository.findCampaign(campaign.id);

    if (!updated) throw new Error("NOTIFICATION_CAMPAIGN_DISAPPEARED_AFTER_SEND");

    return { campaign: updated, summary };
  } catch (error) {
    await repository.updateCampaign(campaign.id, { status: "failed" });
    throw error;
  }
};

export const dispatchScheduledCampaign = async (id: string, now: Date) => {
  const campaign = await repository.findCampaign(id);

  if (campaign?.status !== "scheduled" || !campaign.scheduled_at || campaign.scheduled_at > now) {
    return false;
  }

  if (ensureEmailProviderAvailable(parseStoredChannels(campaign.channels))) {
    await repository.transitionCampaign(campaign.id, ["scheduled"], { status: "failed" });
    console.error("[NOTIFICATION CAMPAIGNS] Campanha agendada sem provedor de e-mail.");
    return false;
  }

  const claimed = await repository.claimCampaign(campaign.id, ["scheduled"]);
  if (!claimed) return false;

  try {
    await dispatchClaimedCampaign(claimed);
    return true;
  } catch (error) {
    console.error(
      "[NOTIFICATION CAMPAIGNS] Campanha agendada falhou.",
      toSafeErrorLog(error, "CampaignDispatchError"),
    );
    return false;
  }
};

export const dispatchDueNotificationCampaigns = async (now: Date, limit: number) => {
  if (!isNotificationCampaignSchedulerEnabled()) return { attempted: 0, sent: 0 };

  const dueCampaigns = await repository.listDueScheduledCampaignIds(now, limit);
  let sent = 0;

  for (const campaign of dueCampaigns) {
    if (await dispatchScheduledCampaign(campaign.id, now)) sent += 1;
  }

  return { attempted: dueCampaigns.length, sent };
};
