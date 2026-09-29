import prisma from "@/infra/database/prisma";
import type {
  CommunityDTO,
  CommunityTopMentorDTO,
} from "@/modules/api/private/community/DTOs/ICommunityDTO";
import { notify } from ".";

export const TOP_MENTOR_PODIUM_MESSAGE_KEY = "top_mentor_podium";
const TOP_MENTOR_PODIUM_WINDOW_DAYS = 14;

const podiumWindowStart = () => {
  const start = new Date();
  start.setDate(start.getDate() - TOP_MENTOR_PODIUM_WINDOW_DAYS);
  return start;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  const prop = value[key];
  return typeof prop === "string" ? prop : undefined;
};

const getNumberProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  const prop = value[key];
  return typeof prop === "number" && Number.isFinite(prop) ? prop : undefined;
};

export const shouldNotifyTopMentorPodium = (
  previousPositions: number[],
  currentPosition: number,
) => {
  if (currentPosition < 1 || currentPosition > 3) return false;
  if (previousPositions.length === 0) return true;

  const bestPreviousPosition = Math.min(...previousPositions);
  return currentPosition < bestPreviousPosition;
};

export const buildTopMentorPodiumRedirect = (params: {
  communitySlug: string;
  periodKey: string;
}) => {
  const query = new URLSearchParams({
    community: params.communitySlug,
    period: params.periodKey,
  });

  return `/comunidades/top-mentores?${query.toString()}#ranking`;
};

const previousPodiumPositions = async (params: { communityId: string; userId: string }) => {
  const recentNotifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    select: { message_props: true },
    take: 20,
    where: {
      createdAt: { gte: podiumWindowStart() },
      deleted: false,
      message_key: TOP_MENTOR_PODIUM_MESSAGE_KEY,
      user_id: params.userId,
    },
  });

  return recentNotifications
    .filter(
      (notification) =>
        getStringProp(notification.message_props, "community_id") === params.communityId,
    )
    .map((notification) => getNumberProp(notification.message_props, "position"))
    .filter((position): position is number => typeof position === "number");
};

export const notifyCommunityTopMentorPodium = async (params: {
  community: CommunityDTO | null;
  items: CommunityTopMentorDTO[];
  periodKey: string;
}) => {
  if (!params.community) return;

  for (const item of params.items.filter(
    (mentor) => mentor.position >= 1 && mentor.position <= 3,
  )) {
    const previousPositions = await previousPodiumPositions({
      communityId: params.community.id,
      userId: item.professional.id,
    });

    if (!shouldNotifyTopMentorPodium(previousPositions, item.position)) continue;

    await notify([item.professional.id], {
      message_key: TOP_MENTOR_PODIUM_MESSAGE_KEY,
      message_props: {
        community_id: params.community.id,
        community_name: params.community.name,
        community_slug: params.community.slug,
        period_key: params.periodKey,
        position: item.position,
        source_id: `${params.community.id}:${item.position}`,
        source_type: "community_top_mentor_podium",
      },
      redirect: buildTopMentorPodiumRedirect({
        communitySlug: params.community.slug,
        periodKey: params.periodKey,
      }),
    });
  }
};
