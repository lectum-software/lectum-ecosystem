import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { messages } from "./constants";
import { createNotificationDelivery } from "./deliveries";
import { isChannelAllowed } from "./preferences";
import { sendWebPushToSubscriptions } from "./push";

const ONE_HOUR_MS = 60 * 60 * 1000;

type NotifyMeta = {
  message_key: string;
  message_props?: Record<string, unknown>;
  redirect?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;

  const prop = value[key];
  return typeof prop === "string" ? prop : undefined;
};

const hasRecentNotificationWithProp = async (params: {
  excludeSourceId?: string;
  key: string;
  prop?: {
    key: string;
    value?: string;
  };
  userId: string;
  windowMs: number;
}) => {
  const recentNotifications = await prisma.notification.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      message_props: true,
    },
    take: 20,
    where: {
      createdAt: {
        gte: new Date(Date.now() - params.windowMs),
      },
      deleted: false,
      message_key: params.key,
      user_id: params.userId,
    },
  });

  return recentNotifications.some((notification) => {
    const sourceId = getStringProp(notification.message_props, "source_id");
    if (sourceId && sourceId === params.excludeSourceId) return false;

    if (!params.prop) return true;
    if (!params.prop.value) return false;

    return getStringProp(notification.message_props, params.prop.key) === params.prop.value;
  });
};

const shouldSuppressImmediatePush = async (params: {
  messageKey: string;
  messageProps?: Record<string, unknown>;
  role?: string | null;
  userId: string;
}) => {
  if (params.role === "paciente" && params.messageKey === "novo_post") {
    return true;
  }

  if (params.role !== "psicologo") return false;

  if (["upvote", "downvote", "salvamento"].includes(params.messageKey)) {
    return true;
  }

  if (params.messageKey === "novo_favorito") {
    return hasRecentNotificationWithProp({
      excludeSourceId: getStringProp(params.messageProps, "source_id"),
      key: params.messageKey,
      userId: params.userId,
      windowMs: ONE_HOUR_MS,
    });
  }

  if (params.messageKey === "clique_whatsapp") {
    const actorId = getStringProp(params.messageProps, "actor_id");

    return hasRecentNotificationWithProp({
      excludeSourceId: getStringProp(params.messageProps, "source_id"),
      key: params.messageKey,
      prop: {
        key: "actor_id",
        value: actorId,
      },
      userId: params.userId,
      windowMs: ONE_HOUR_MS,
    });
  }

  return false;
};

/**
 * Cria a notificacao in-app, emite em tempo real (Socket.IO) e envia push web,
 * respeitando `notification_preference`. As entregas reais ficam auditaveis em
 * `notification_delivery` para uso do Admin; canais pulados ficam com status
 * `skipped` e motivo explicito, sem inventar alcance.
 */
export const notify = async (userIds: string[], meta: NotifyMeta) => {
  try {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) return;

    const users = await prisma.user.findMany({
      where: { id: { in: ids }, deleted: false },
      include: {
        notification_preference: true,
        notification_subscriptions: {
          where: {
            deleted: false,
          },
        },
      },
    });

    const propsRecord = meta.message_props ?? {};
    const props = propsRecord as Prisma.InputJsonValue;
    const emittedUserIds: string[] = [];

    for (const user of users) {
      const now = new Date();
      const inAppAllowed = isChannelAllowed(
        user.notification_preference?.prefs,
        meta.message_key,
        "in_app",
      );

      if (!inAppAllowed) {
        await createNotificationDelivery({
          channel: "in_app",
          failureReason: "preference_disabled",
          metadata: { message_key: meta.message_key },
          source: "automatic",
          status: "skipped",
          triggerKey: meta.message_key,
          userId: user.id,
        });
        continue;
      }

      const notification = await prisma.notification.create({
        data: {
          message_key: meta.message_key,
          message_props: props,
          redirect: meta.redirect,
          user_id: user.id,
        },
      });

      await createNotificationDelivery({
        channel: "in_app",
        deliveredAt: now,
        metadata: { message_key: meta.message_key },
        notificationId: notification.id,
        sentAt: now,
        source: "automatic",
        status: "delivered",
        triggerKey: meta.message_key,
        userId: user.id,
      });
      emittedUserIds.push(user.id);
    }

    if (emittedUserIds.length > 0) {
      await emitNotification(emittedUserIds);
    }

    const build = messages[meta.message_key as keyof typeof messages];
    let targeted = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const user of users) {
      if (
        await shouldSuppressImmediatePush({
          messageKey: meta.message_key,
          messageProps: meta.message_props,
          role: user.role,
          userId: user.id,
        })
      ) {
        skipped++;
        await createNotificationDelivery({
          channel: "push",
          failureReason: "push_suppressed_by_policy",
          metadata: { message_key: meta.message_key },
          source: "automatic",
          status: "skipped",
          triggerKey: meta.message_key,
          userId: user.id,
        });
        continue;
      }

      if (!isChannelAllowed(user.notification_preference?.prefs, meta.message_key, "push")) {
        skipped++;
        await createNotificationDelivery({
          channel: "push",
          failureReason: "preference_disabled",
          metadata: { message_key: meta.message_key },
          source: "automatic",
          status: "skipped",
          triggerKey: meta.message_key,
          userId: user.id,
        });
        continue;
      }

      const content = build
        ? build(meta.message_props ?? {})
        : { body: "Voce tem uma nova notificacao", title: "Lectum" };
      const result = await sendWebPushToSubscriptions({
        body: content.body,
        messageProps: meta.message_props,
        redirect: meta.redirect,
        subscriptions: user.notification_subscriptions,
        title: content.title,
      });
      const now = new Date();

      targeted += result.targetedCount;
      sent += result.sentCount;
      failed += result.failedCount;
      if (result.status === "skipped") skipped++;

      await createNotificationDelivery({
        channel: "push",
        failureReason: result.failureReason ?? null,
        metadata: {
          failed_count: result.failedCount,
          message_key: meta.message_key,
          sent_count: result.sentCount,
          targeted_count: result.targetedCount,
        },
        sentAt: result.status === "sent" ? now : null,
        source: "automatic",
        status: result.status,
        triggerKey: meta.message_key,
        userId: user.id,
      });
    }

    console.log(
      `[WEB NOTIFICATION] push "${meta.message_key}": ${targeted} alvo(s), ${sent} enviado(s), ${failed} falha(s), ${skipped} ignorado(s).`,
    );
  } catch (error) {
    console.error("[WEB NOTIFICATION] erro no dispatcher:", (error as Error)?.message);
  }
};
