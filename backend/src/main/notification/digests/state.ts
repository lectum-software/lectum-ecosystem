import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

export const DIGEST_STATE_TYPE = "notification_digest_state";

export const DIGEST_TIME_ZONE = "America/Sao_Paulo";

export const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export const MAX_LOOKBACK_MS = 48 * 60 * 60 * 1000;

export const DEFAULT_DIGEST_INTERVAL_MS = 10 * 60 * 1000;

export const TOP_MENTOR_MAX_POSITION = 5;

export type DigestKind =
  | "favorites_lunch_digest"
  | "community_evening_digest"
  | "professional_daily_digest";

export type DigestWindowState = {
  last_checked_at?: string;
  last_sent_at?: string;
  last_sent_date?: string;
};

export type DigestState = Partial<Record<DigestKind, DigestWindowState>>;

export type DigestTargetUser = Awaited<ReturnType<typeof listDigestTargetUsers>>[number];

export type ZonedDateParts = {
  dateKey: string;
  hour: number;
  minute: number;
};

export type PsychologistActivityCandidate = {
  authorId: string;
  communityId: string;
  communitySlug: string;
  createdAt: Date;
  engagement: number;
  isFavorite: boolean;
  isFollowedCommunity: boolean;
  isTopMentor: boolean;
  postId: string;
};

export type CommunityDigestCandidate = {
  communityId: string;
  communitySlug: string;
  createdAt: Date;
  engagement: number;
  postId: string;
};

export const PROFESSIONAL_DAILY_KEYS = [
  "clique_whatsapp",
  "nova_avaliacao",
  "novo_favorito",
  "nova_resposta",
  "upvote",
  "salvamento",
] as const;

export type ProfessionalDailyKey = (typeof PROFESSIONAL_DAILY_KEYS)[number];

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const toStringSet = (values: string[]) => new Set(values.filter(Boolean));

export const parseDigestState = (value: unknown): DigestState => {
  if (!isRecord(value)) return {};

  const state: DigestState = {};
  for (const key of [
    "favorites_lunch_digest",
    "community_evening_digest",
    "professional_daily_digest",
  ] as const) {
    const entry = value[key];
    if (!isRecord(entry)) continue;

    state[key] = {
      last_checked_at:
        typeof entry.last_checked_at === "string" ? entry.last_checked_at : undefined,
      last_sent_at: typeof entry.last_sent_at === "string" ? entry.last_sent_at : undefined,
      last_sent_date: typeof entry.last_sent_date === "string" ? entry.last_sent_date : undefined,
    };
  }

  return state;
};

export const getZonedDateParts = (date: Date): ZonedDateParts => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: DIGEST_TIME_ZONE,
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour ?? "0"),
    minute: Number(parts.minute ?? "0"),
  };
};

export const isInsideWindow = (
  parts: Pick<ZonedDateParts, "hour" | "minute">,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
) => {
  const current = parts.hour * 60 + parts.minute;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return current >= start && current <= end;
};

export const getDigestSince = (now: Date, windowState: DigestWindowState | undefined) => {
  const lastSentAt = windowState?.last_sent_at ? new Date(windowState.last_sent_at) : null;

  if (
    lastSentAt &&
    Number.isFinite(lastSentAt.getTime()) &&
    now.getTime() - lastSentAt.getTime() <= MAX_LOOKBACK_MS
  ) {
    return lastSentAt;
  }

  return new Date(now.getTime() - DEFAULT_LOOKBACK_MS);
};

export const getDigestState = async (userId: string) => {
  const record = await prisma.user_background.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      deleted: false,
      type: DIGEST_STATE_TYPE,
      user_id: userId,
    },
  });

  return {
    recordId: record?.id,
    state: parseDigestState(record?.data),
  };
};

export const saveDigestState = async (
  userId: string,
  recordId: string | undefined,
  state: DigestState,
) => {
  const data = JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue;

  if (recordId) {
    await prisma.user_background.update({
      data: {
        data,
      },
      where: {
        id: recordId,
      },
    });
    return;
  }

  await prisma.user_background.create({
    data: {
      data,
      type: DIGEST_STATE_TYPE,
      user_id: userId,
    },
  });
};

export async function listDigestTargetUsers(role: "paciente" | "psicologo") {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      notification_preference: {
        select: {
          prefs: true,
        },
      },
      notification_subscriptions: {
        select: {
          id: true,
          subscription: true,
        },
        where: {
          deleted: false,
        },
      },
      role: true,
    },
    where: {
      active: true,
      deleted: false,
      role,
    },
  });

  return users.filter((user) =>
    user.notification_subscriptions.some((subscription) => Boolean(subscription.subscription)),
  );
}
