import webPush, { isWebPushConfigured } from "@/config/webPush";
import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isWebPushSubscriptionPayload } from "@/utils/push-subscription";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const normalizePushRedirect = (value: string | null | undefined) => {
  const redirect = value?.trim();
  if (!redirect || redirect.length > 2_048 || !redirect.startsWith("/")) return "/";
  const hasControlCharacter = Array.from(redirect).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (redirect.startsWith("//") || redirect.includes("\\") || hasControlCharacter) {
    return "/";
  }

  try {
    const url = new URL(redirect, "https://lectum.local");
    return url.origin === "https://lectum.local" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
};

export type PushSubscriptionRecord = {
  id: string;
  subscription: Prisma.JsonValue | null;
};

export type WebPushSendResult = {
  failedCount: number;
  failureReason?: string | null;
  sentCount: number;
  status: "failed" | "sent" | "skipped";
  targetedCount: number;
};

const deactivateSubscriptions = async (ids: string[]) => {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  try {
    await prisma.notification_subscription.updateMany({
      data: {
        deleted: true,
        deletedAt: new Date(),
        subscription: Prisma.DbNull,
      },
      where: {
        deleted: false,
        id: {
          in: uniqueIds,
        },
      },
    });
  } catch (error) {
    console.error(
      "[WEB NOTIFICATION] Falha ao desativar inscrições inválidas.",
      toSafeErrorLog(error, "PushSubscriptionCleanupError"),
    );
  }
};

const getPushStatusCode = (error: unknown) => {
  const statusCode = (error as { statusCode?: unknown })?.statusCode;
  return typeof statusCode === "number" &&
    Number.isInteger(statusCode) &&
    statusCode >= 100 &&
    statusCode <= 599
    ? statusCode
    : undefined;
};

export const sendWebPushToSubscriptions = async (params: {
  body: string;
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

  const storedSubscriptions = params.subscriptions.filter((sub) => Boolean(sub.subscription));
  if (storedSubscriptions.length === 0) {
    return {
      failedCount: 0,
      failureReason: "push_subscription_missing",
      sentCount: 0,
      status: "skipped",
      targetedCount: 0,
    };
  }

  const invalidSubscriptions = storedSubscriptions.filter(
    (sub) => !isWebPushSubscriptionPayload(sub.subscription),
  );
  const activeSubscriptions = storedSubscriptions.filter((sub) =>
    isWebPushSubscriptionPayload(sub.subscription),
  );

  await deactivateSubscriptions(invalidSubscriptions.map((sub) => sub.id));

  if (activeSubscriptions.length === 0) {
    return {
      failedCount: invalidSubscriptions.length,
      failureReason: "push_subscription_invalid",
      sentCount: 0,
      status: "failed",
      targetedCount: storedSubscriptions.length,
    };
  }

  let sentCount = 0;
  let failedCount = invalidSubscriptions.length;
  const expiredSubscriptionIds: string[] = [];
  const payload = JSON.stringify({
    data: {
      redirect: normalizePushRedirect(params.redirect),
    },
    notification: {
      body: params.body,
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
      const statusCode = getPushStatusCode(error);
      if (statusCode === 404 || statusCode === 410) expiredSubscriptionIds.push(sub.id);

      console.error("[WEB NOTIFICATION] erro ao enviar push:", {
        name: "WebPushSendError",
        status_code: statusCode,
      });
    }
  }

  await deactivateSubscriptions(expiredSubscriptionIds);

  if (sentCount > 0) {
    return {
      failedCount,
      failureReason: failedCount > 0 ? "push_partial_failure" : null,
      sentCount,
      status: "sent",
      targetedCount: storedSubscriptions.length,
    };
  }

  return {
    failedCount,
    failureReason: "push_send_failed",
    sentCount,
    status: "failed",
    targetedCount: storedSubscriptions.length,
  };
};
