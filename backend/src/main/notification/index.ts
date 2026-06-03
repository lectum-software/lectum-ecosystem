import webPush from "@/config/webPush";

import prisma from "@/infra/database/prisma";
import type { user } from "@/interfaces/objects";
import { messages } from "./constants";

const BASE = process.env.BASE;

export const notify = async (
  items: { id: string }[] | { email: string }[],
  meta: {
    message_key: keyof typeof messages;
    message_props?: unknown;
    redirect?: string;
    searchParams?: Record<string, string | undefined | null>;
  },
  icon?: string,
) => {
  try {
    if (items.length === 0) return;

    let notificationTargets: {
      subscription: any;
      icon: string;
      profile_id?: string | null;
    }[] = [];

    const users: user[] = await prisma.user.findMany({
      where: {
        email: {
          in: items.map((item) => (item as { email: string }).email),
        },
      },
      include: {
        notification_subscriptions: true,
      },
    });
    notificationTargets = users
      .flatMap((user) =>
        (user?.notification_subscriptions || []).map((sub) => ({
          subscription: sub.subscription,
          icon: icon || `${BASE}/logo.png`,
        })),
      )
      .filter((target) => !!target.subscription);

    const notificationPayloadBase = {
      notification: {
        ...messages[meta.message_key](meta?.message_props || ({} as any)),
      },
      data: {
        redirect: meta.redirect,
        searchParams: meta.searchParams,
      },
    };

    notificationTargets.forEach(async ({ subscription, icon, profile_id }) => {
      const searchParams = meta.searchParams || {};
      if (profile_id) searchParams.profile_id = profile_id;

      try {
        const notificationPayload = {
          ...notificationPayloadBase,
          data: {
            ...notificationPayloadBase.data,
            searchParams,
          },
          notification: {
            ...notificationPayloadBase.notification,
            icon,
          },
        };
        await webPush.sendNotification(subscription, JSON.stringify(notificationPayload));
      } catch (error: any) {
        console.error("[WEB NOTIFICATION] Error sending notification", error?.message);
      }
    });
  } catch (error: any) {
    console.error("[WEB NOTIFICATION] Error sending notification", error?.message);
  }
};
