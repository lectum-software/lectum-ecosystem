import webPush, { isWebPushConfigured } from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const BASE = process.env.BASE || "";

export type PushSubscriptionRecord = {
  subscription: Prisma.JsonValue | null;
};

export type WebPushSendResult = {
  failedCount: number;
  failureReason?: string | null;
  sentCount: number;
  status: "failed" | "sent" | "skipped";
  targetedCount: number;
};

export const sendWebPushToSubscriptions = async (params: {
  body: string;
  campaignId?: string | null;
  messageProps?: Record<string, unknown>;
  redirect?: string | null;
  subscriptions: PushSubscriptionRecord[];
  title: string;
}): Promise<WebPushSendResult> => {
  if (!isWebPushConfigured()) {
    return {
      failedCount: 0,
      failureReason: "push_vapid_not_configured",
      sentCount: 0,
      status: "skipped",
      targetedCount: 0,
    };
  }

  const activeSubscriptions = params.subscriptions.filter((sub) => Boolean(sub.subscription));
  if (activeSubscriptions.length === 0) {
    return {
      failedCount: 0,
      failureReason: "push_subscription_missing",
      sentCount: 0,
      status: "skipped",
      targetedCount: 0,
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const payload = JSON.stringify({
    data: {
      campaign_id: params.campaignId ?? undefined,
      message_props: params.messageProps,
      redirect: params.redirect ?? undefined,
    },
    notification: {
      body: params.body,
      icon: BASE ? `${BASE}/logo.png` : "/logo.png",
      title: params.title,
    },
  });

  for (const sub of activeSubscriptions) {
    try {
      await webPush.sendNotification(
        sub.subscription as unknown as Parameters<typeof webPush.sendNotification>[0],
        payload,
      );
      sentCount++;
    } catch (error) {
      failedCount++;
      console.error("[WEB NOTIFICATION] erro ao enviar push:", {
        ...toSafeErrorLog(error, "WebPushSendError"),
        status_code: (error as { statusCode?: number })?.statusCode,
      });
    }
  }

  if (sentCount > 0) {
    return {
      failedCount,
      failureReason: failedCount > 0 ? "push_partial_failure" : null,
      sentCount,
      status: "sent",
      targetedCount: activeSubscriptions.length,
    };
  }

  return {
    failedCount,
    failureReason: "push_send_failed",
    sentCount,
    status: "failed",
    targetedCount: activeSubscriptions.length,
  };
};
