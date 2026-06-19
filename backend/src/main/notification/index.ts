import webPush, { isWebPushConfigured } from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { messages } from "./constants";
import { isChannelAllowed } from "./preferences";

const BASE = process.env.BASE || "";
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
 * Cria a notificação in-app, emite em tempo real (Socket.IO) e envia push web,
 * respeitando `notification_preference`. No MVP web a preferência visual é
 * uma chave única por categoria, mas o dispatcher preserva compatibilidade
 * com registros legados `in_app`/`push`. Não é ligado a eventos de
 * domínio aqui — a produção de eventos é responsabilidade da TASK-29B.
 */
export const notify = async (userIds: string[], meta: NotifyMeta) => {
  try {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) return;

    const users = await prisma.user.findMany({
      where: { id: { in: ids }, deleted: false },
      include: { notification_subscriptions: true, notification_preference: true },
    });

    const props = (meta.message_props ?? {}) as Prisma.InputJsonValue;

    // 1. Persistir notificações in-app (canal in_app permitido).
    const inAppUsers = users.filter((user) =>
      isChannelAllowed(user.notification_preference?.prefs, meta.message_key, "in_app"),
    );

    if (inAppUsers.length > 0) {
      await prisma.notification.createMany({
        data: inAppUsers.map((user) => ({
          user_id: user.id,
          message_key: meta.message_key,
          message_props: props,
          redirect: meta.redirect,
        })),
      });

      // 2. Tempo real para quem estiver conectado.
      await emitNotification(inAppUsers.map((user) => user.id));
    }

    // 3. Push web (canal push permitido + subscription + VAPID configurado).
    const build = messages[meta.message_key as keyof typeof messages];
    let targeted = 0;
    let sent = 0;
    let failed = 0;

    if (!isWebPushConfigured()) {
      console.log(`[WEB NOTIFICATION] push "${meta.message_key}" ignorado: VAPID não configurado.`);
      return;
    }

    for (const user of users) {
      if (
        await shouldSuppressImmediatePush({
          messageKey: meta.message_key,
          messageProps: meta.message_props,
          role: user.role,
          userId: user.id,
        })
      ) {
        continue;
      }

      if (!isChannelAllowed(user.notification_preference?.prefs, meta.message_key, "push")) {
        continue;
      }

      for (const sub of user.notification_subscriptions ?? []) {
        if (!sub.subscription) continue;
        targeted++;

        try {
          const content = build
            ? build(meta.message_props ?? {})
            : { title: "Lectum", body: "Você tem uma nova notificação" };

          const payload = JSON.stringify({
            notification: { ...content, icon: BASE ? `${BASE}/logo.png` : "/logo.png" },
            data: { redirect: meta.redirect, message_props: meta.message_props },
          });

          await webPush.sendNotification(
            sub.subscription as unknown as Parameters<typeof webPush.sendNotification>[0],
            payload,
          );
          sent++;
        } catch (error) {
          failed++;
          console.error(
            "[WEB NOTIFICATION] erro ao enviar push:",
            (error as { statusCode?: number })?.statusCode,
            (error as Error)?.message,
          );
        }
      }
    }

    console.log(
      `[WEB NOTIFICATION] push "${meta.message_key}": ${targeted} alvo(s), ${sent} enviado(s), ${failed} falha(s).`,
    );
  } catch (error) {
    console.error("[WEB NOTIFICATION] erro no dispatcher:", (error as Error)?.message);
  }
};
