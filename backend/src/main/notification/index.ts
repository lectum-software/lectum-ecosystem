import webPush from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { messages } from "./constants";

const BASE = process.env.BASE;

type NotifyMeta = {
  message_key: string;
  message_props?: Record<string, unknown>;
  redirect?: string;
};

type ChannelPrefs = { in_app?: boolean; push?: boolean };

// Default: permitir quando não há preferência registrada para a categoria.
const isAllowed = (prefs: unknown, key: string, channel: keyof ChannelPrefs) => {
  if (!prefs || typeof prefs !== "object") return true;
  const entry = (prefs as Record<string, ChannelPrefs>)[key];
  if (!entry) return true;
  return entry[channel] !== false;
};

/**
 * Cria a notificação in-app, emite em tempo real (Socket.IO) e envia push web,
 * respeitando `notification_preference` por canal. Não é ligado a eventos de
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
      isAllowed(user.notification_preference?.prefs, meta.message_key, "in_app"),
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

    for (const user of users) {
      if (!isAllowed(user.notification_preference?.prefs, meta.message_key, "push")) continue;

      for (const sub of user.notification_subscriptions ?? []) {
        if (!sub.subscription) continue;
        targeted++;

        try {
          const content = build
            ? build(meta.message_props ?? {})
            : { title: "Lectum", body: "Você tem uma nova notificação" };

          const payload = JSON.stringify({
            notification: { ...content, icon: `${BASE}/logo.png` },
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
