import webPush, { isWebPushConfigured } from "@/config/webPush";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { getNewPostAuthorScope, isChannelAllowed, isNotificationEnabled } from "./preferences";

const BASE = process.env.BASE || "";
const DIGEST_STATE_TYPE = "notification_digest_state";
const DIGEST_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const DEFAULT_DIGEST_INTERVAL_MS = 10 * 60 * 1000;
const TOP_MENTOR_MAX_POSITION = 5;

type DigestKind =
  | "favorites_lunch_digest"
  | "community_evening_digest"
  | "professional_daily_digest";

type DigestWindowState = {
  last_checked_at?: string;
  last_sent_at?: string;
  last_sent_date?: string;
};

type DigestState = Partial<Record<DigestKind, DigestWindowState>>;

type DigestTargetUser = Awaited<ReturnType<typeof listDigestTargetUsers>>[number];

type ZonedDateParts = {
  dateKey: string;
  hour: number;
  minute: number;
};

type PsychologistActivityCandidate = {
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

type CommunityDigestCandidate = {
  communityId: string;
  communitySlug: string;
  createdAt: Date;
  engagement: number;
  postId: string;
};

const PROFESSIONAL_DAILY_KEYS = [
  "clique_whatsapp",
  "nova_avaliacao",
  "novo_favorito",
  "nova_resposta",
  "upvote",
  "salvamento",
] as const;

type ProfessionalDailyKey = (typeof PROFESSIONAL_DAILY_KEYS)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toStringSet = (values: string[]) => new Set(values.filter(Boolean));

const parseDigestState = (value: unknown): DigestState => {
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

const getZonedDateParts = (date: Date): ZonedDateParts => {
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

const isInsideWindow = (
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

const getDigestSince = (now: Date, windowState: DigestWindowState | undefined) => {
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

const getDigestState = async (userId: string) => {
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

const saveDigestState = async (
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

async function listDigestTargetUsers(role: "paciente" | "psicologo") {
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

const sendDigestPush = async (
  user: DigestTargetUser,
  params: {
    body: string;
    redirect: string;
    title: string;
    type: DigestKind;
  },
) => {
  let sent = 0;
  let failed = 0;

  for (const subscription of user.notification_subscriptions) {
    if (!subscription.subscription) continue;

    try {
      await webPush.sendNotification(
        subscription.subscription as unknown as Parameters<typeof webPush.sendNotification>[0],
        JSON.stringify({
          data: {
            redirect: params.redirect,
            type: params.type,
          },
          notification: {
            body: params.body,
            icon: BASE ? `${BASE}/logo.png` : "/logo.png",
            title: params.title,
          },
        }),
      );
      sent++;
    } catch (error) {
      failed++;
      console.error(
        "[WEB NOTIFICATION] erro ao enviar digest push:",
        (error as { statusCode?: number })?.statusCode,
        (error as Error)?.message,
      );
    }
  }

  console.log(
    `[WEB NOTIFICATION] digest "${params.type}" para ${user.id}: ${sent} enviado(s), ${failed} falha(s).`,
  );

  return sent > 0;
};

const getPatientFavoritePsychologistIds = async (userId: string) => {
  const favorites = await prisma.psychologist_favorite.findMany({
    select: {
      psychologist_id: true,
    },
    where: {
      deleted: false,
      user_id: userId,
    },
  });

  return favorites.map((favorite) => favorite.psychologist_id);
};

const getPatientFollowedCommunities = async (userId: string) => {
  return prisma.community_member.findMany({
    select: {
      community: {
        select: {
          category: true,
          id: true,
          slug: true,
        },
      },
      community_id: true,
    },
    where: {
      deleted: false,
      user_id: userId,
    },
  });
};

const getPsychologistActivityCandidates = async (params: {
  favoriteIds: Set<string>;
  followedCommunityIds: Set<string>;
  now: Date;
  since: Date;
}) => {
  const [posts, replies] = await Promise.all([
    prisma.community_post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        author_id: true,
        community: {
          select: {
            slug: true,
          },
        },
        community_id: true,
        createdAt: true,
        id: true,
        replies_count: true,
        saves_count: true,
        upvotes_count: true,
      },
      take: 150,
      where: {
        author: {
          deleted: false,
          role: "psicologo",
        },
        createdAt: {
          gte: params.since,
          lte: params.now,
        },
        deleted: false,
        status: "publicado",
      },
    }),
    prisma.post_reply.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        author_id: true,
        createdAt: true,
        post: {
          select: {
            community: {
              select: {
                slug: true,
              },
            },
            community_id: true,
            id: true,
          },
        },
        upvotes_count: true,
      },
      take: 150,
      where: {
        author: {
          deleted: false,
          role: "psicologo",
        },
        createdAt: {
          gte: params.since,
          lte: params.now,
        },
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
        },
      },
    }),
  ]);

  const candidates: PsychologistActivityCandidate[] = [
    ...posts.map((post) => ({
      authorId: post.author_id,
      communityId: post.community_id,
      communitySlug: post.community.slug,
      createdAt: post.createdAt,
      engagement: post.upvotes_count * 3 + post.replies_count * 2 + post.saves_count * 2,
      isFavorite: params.favoriteIds.has(post.author_id),
      isFollowedCommunity: params.followedCommunityIds.has(post.community_id),
      isTopMentor: false,
      postId: post.id,
    })),
    ...replies.map((reply) => ({
      authorId: reply.author_id,
      communityId: reply.post.community_id,
      communitySlug: reply.post.community.slug,
      createdAt: reply.createdAt,
      engagement: reply.upvotes_count * 3,
      isFavorite: params.favoriteIds.has(reply.author_id),
      isFollowedCommunity: params.followedCommunityIds.has(reply.post.community_id),
      isTopMentor: false,
      postId: reply.post.id,
    })),
  ];

  if (candidates.length === 0) return candidates;

  const communityIds = [...new Set(candidates.map((candidate) => candidate.communityId))];
  for (const communityId of communityIds) {
    const authorIds = [
      ...new Set(
        candidates
          .filter((candidate) => candidate.communityId === communityId)
          .map((candidate) => candidate.authorId),
      ),
    ];
    const rankingSignals = await getCommunityMentorRankingSignals(communityId, authorIds);

    for (const candidate of candidates) {
      if (candidate.communityId !== communityId) continue;

      const signal = rankingSignals.get(candidate.authorId);
      candidate.isTopMentor = Boolean(signal && signal.position <= TOP_MENTOR_MAX_POSITION);
    }
  }

  return candidates;
};

const scorePsychologistActivity = (candidate: PsychologistActivityCandidate, now: Date) => {
  const recency = Math.max(
    0,
    100 - Math.floor((now.getTime() - candidate.createdAt.getTime()) / 3600000),
  );

  return (
    (candidate.isFavorite ? 10_000 : 0) +
    (candidate.isFollowedCommunity ? 5_000 : 0) +
    (candidate.isTopMentor ? 2_500 : 0) +
    candidate.engagement +
    recency
  );
};

const getBestPsychologistActivityCandidate = async (
  user: DigestTargetUser,
  since: Date,
  now: Date,
) => {
  if (!isNotificationEnabled(user.notification_preference?.prefs, "novo_post")) return null;

  const scope = getNewPostAuthorScope(user.notification_preference?.prefs, "paciente");
  if (scope === "patients_only") return null;

  const [favoritePsychologistIds, followedCommunities] = await Promise.all([
    getPatientFavoritePsychologistIds(user.id),
    getPatientFollowedCommunities(user.id),
  ]);
  const favoriteIds = toStringSet(favoritePsychologistIds);
  const followedCommunityIds = toStringSet(
    followedCommunities.map((membership) => membership.community_id),
  );

  let candidates = await getPsychologistActivityCandidates({
    favoriteIds,
    followedCommunityIds,
    now,
    since,
  });

  if (scope === "favorites") {
    candidates = candidates.filter((candidate) => candidate.isFavorite);
  }

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const scoreDiff = scorePsychologistActivity(b, now) - scorePsychologistActivity(a, now);
    if (scoreDiff !== 0) return scoreDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
};

const buildPsychologistDigestContent = (candidate: PsychologistActivityCandidate) => {
  if (candidate.isFavorite) {
    return {
      body: "Psicólogos que você acompanha publicaram novos conteúdos hoje.",
      title: "Novidades dos seus psicólogos favoritos",
    };
  }

  if (candidate.isTopMentor) {
    return {
      body: "Veja respostas e conteúdos de psicólogos em destaque na Lectum.",
      title: "Top Mentores publicaram novidades",
    };
  }

  return {
    body: "Psicólogos relevantes publicaram conteúdos que podem te interessar hoje.",
    title: "Novidades de psicólogos na Lectum",
  };
};

const buildPostRedirect = (communitySlug: string, postId: string) =>
  `/community/${communitySlug}/post/${postId}`;

const markDigestChecked = (
  state: DigestState,
  kind: DigestKind,
  now: Date,
  dateKey: string,
  sent: boolean,
) => {
  const next: DigestWindowState = {
    ...state[kind],
    last_checked_at: now.toISOString(),
  };

  if (sent) {
    next.last_sent_at = now.toISOString();
    next.last_sent_date = dateKey;
  }

  state[kind] = next;
};

const processLunchDigest = async (user: DigestTargetUser, now: Date, dateKey: string) => {
  const { recordId, state } = await getDigestState(user.id);
  const current = state.favorites_lunch_digest;
  if (current?.last_sent_date === dateKey) return;

  const candidate = await getBestPsychologistActivityCandidate(
    user,
    getDigestSince(now, current),
    now,
  );
  if (!candidate) {
    markDigestChecked(state, "favorites_lunch_digest", now, dateKey, false);
    await saveDigestState(user.id, recordId, state);
    return;
  }

  const content = buildPsychologistDigestContent(candidate);
  const sent = await sendDigestPush(user, {
    ...content,
    redirect: buildPostRedirect(candidate.communitySlug, candidate.postId),
    type: "favorites_lunch_digest",
  });

  markDigestChecked(state, "favorites_lunch_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};

const getCommunityDigestCandidates = async (params: {
  communityIds?: string[];
  excludedCommunityIds?: string[];
  excludedAuthorId?: string;
  limit?: number;
  now: Date;
  since: Date;
  categories?: string[];
}) => {
  const posts = await prisma.community_post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      community: {
        select: {
          id: true,
          slug: true,
        },
      },
      community_id: true,
      createdAt: true,
      id: true,
      replies_count: true,
      saves_count: true,
      upvotes_count: true,
    },
    take: params.limit ?? 100,
    where: {
      community: {
        ...(params.categories && params.categories.length > 0
          ? {
              category: {
                in: params.categories,
              },
            }
          : {}),
        ...(params.excludedCommunityIds && params.excludedCommunityIds.length > 0
          ? {
              id: {
                notIn: params.excludedCommunityIds,
              },
            }
          : {}),
        deleted: false,
      },
      ...(params.communityIds && params.communityIds.length > 0
        ? {
            community_id: {
              in: params.communityIds,
            },
          }
        : {}),
      ...(params.excludedAuthorId
        ? {
            author_id: {
              not: params.excludedAuthorId,
            },
          }
        : {}),
      createdAt: {
        gte: params.since,
        lte: params.now,
      },
      deleted: false,
      status: "publicado",
    },
  });

  return posts.map<CommunityDigestCandidate>((post) => ({
    communityId: post.community_id,
    communitySlug: post.community.slug,
    createdAt: post.createdAt,
    engagement: post.upvotes_count * 3 + post.replies_count * 2 + post.saves_count * 2,
    postId: post.id,
  }));
};

const sortCommunityCandidates = (candidates: CommunityDigestCandidate[]) =>
  candidates.sort((a, b) => {
    const engagementDiff = b.engagement - a.engagement;
    if (engagementDiff !== 0) return engagementDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

const getBestCommunityDigestCandidate = async (user: DigestTargetUser, since: Date, now: Date) => {
  if (!isNotificationEnabled(user.notification_preference?.prefs, "novo_post")) return null;

  const followedCommunities = await getPatientFollowedCommunities(user.id);
  const followedCommunityIds = followedCommunities.map((membership) => membership.community_id);
  const followedCategories = [
    ...new Set(
      followedCommunities
        .map((membership) => membership.community.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ];

  const followedCandidates =
    followedCommunityIds.length > 0
      ? await getCommunityDigestCandidates({
          communityIds: followedCommunityIds,
          excludedAuthorId: user.id,
          now,
          since,
        })
      : [];

  if (followedCandidates.length > 0) {
    return {
      candidate: sortCommunityCandidates(followedCandidates)[0],
      source: "followed" as const,
    };
  }

  const relatedCandidates =
    followedCategories.length > 0
      ? await getCommunityDigestCandidates({
          categories: followedCategories,
          excludedCommunityIds: followedCommunityIds,
          excludedAuthorId: user.id,
          now,
          since,
        })
      : [];

  if (relatedCandidates.length > 0) {
    return {
      candidate: sortCommunityCandidates(relatedCandidates)[0],
      source: "related" as const,
    };
  }

  const generalCandidates = await getCommunityDigestCandidates({
    excludedAuthorId: user.id,
    now,
    since,
  });

  if (generalCandidates.length === 0) return null;

  return {
    candidate: sortCommunityCandidates(generalCandidates)[0],
    source: "general" as const,
  };
};

const buildCommunityDigestContent = (source: "followed" | "general" | "related") => {
  if (source === "followed") {
    return {
      body: "Veja conversas recentes nas comunidades que você acompanha.",
      title: "Novidades nas comunidades que você segue",
    };
  }

  return {
    body: "Veja conversas recentes que podem te interessar hoje.",
    title: "Novidades nas comunidades da Lectum",
  };
};

const processEveningDigest = async (user: DigestTargetUser, now: Date, dateKey: string) => {
  const { recordId, state } = await getDigestState(user.id);
  const current = state.community_evening_digest;
  if (current?.last_sent_date === dateKey) return;

  const result = await getBestCommunityDigestCandidate(user, getDigestSince(now, current), now);
  if (!result) {
    markDigestChecked(state, "community_evening_digest", now, dateKey, false);
    await saveDigestState(user.id, recordId, state);
    return;
  }

  const content = buildCommunityDigestContent(result.source);
  const sent = await sendDigestPush(user, {
    ...content,
    redirect: buildPostRedirect(result.candidate.communitySlug, result.candidate.postId),
    type: "community_evening_digest",
  });

  markDigestChecked(state, "community_evening_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};

const createProfessionalDailyCounts = (): Record<ProfessionalDailyKey, number> => ({
  clique_whatsapp: 0,
  nova_avaliacao: 0,
  nova_resposta: 0,
  novo_favorito: 0,
  salvamento: 0,
  upvote: 0,
});

const getProfessionalDailyCounts = async (user: DigestTargetUser, since: Date, now: Date) => {
  const allowedKeys = PROFESSIONAL_DAILY_KEYS.filter((key) =>
    isChannelAllowed(user.notification_preference?.prefs, key, "push"),
  );
  const counts = createProfessionalDailyCounts();

  if (allowedKeys.length === 0) return counts;

  const notifications = await prisma.notification.findMany({
    select: {
      message_key: true,
    },
    where: {
      createdAt: {
        gte: since,
        lte: now,
      },
      deleted: false,
      message_key: {
        in: allowedKeys,
      },
      user_id: user.id,
    },
  });

  for (const notification of notifications) {
    if (!PROFESSIONAL_DAILY_KEYS.includes(notification.message_key as ProfessionalDailyKey)) {
      continue;
    }

    counts[notification.message_key as ProfessionalDailyKey]++;
  }

  return counts;
};

const hasProfessionalDailyActivity = (counts: Record<ProfessionalDailyKey, number>) =>
  Object.values(counts).some((count) => count > 0);

const formatCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

const buildProfessionalDailyDigestContent = (counts: Record<ProfessionalDailyKey, number>) => {
  if (counts.clique_whatsapp > 0) {
    const whatsapp = formatCount(
      counts.clique_whatsapp,
      "clique no WhatsApp",
      "cliques no WhatsApp",
    );
    const complements = counts.nova_avaliacao + counts.novo_favorito + counts.nova_resposta;

    return {
      body:
        complements > 0
          ? `Você recebeu ${whatsapp} e novas interações no seu perfil hoje.`
          : `Você recebeu ${whatsapp} no seu perfil hoje.`,
      title: "Seu desempenho hoje na Lectum",
    };
  }

  if (counts.nova_avaliacao + counts.novo_favorito > 0) {
    return {
      body: "Seu perfil recebeu novos sinais de confiança hoje.",
      title: "Seu desempenho hoje na Lectum",
    };
  }

  return {
    body: "Suas respostas e publicações tiveram novas interações hoje.",
    title: "Seu desempenho hoje na Lectum",
  };
};

const processProfessionalDailyDigest = async (
  user: DigestTargetUser,
  now: Date,
  dateKey: string,
) => {
  const { recordId, state } = await getDigestState(user.id);
  const current = state.professional_daily_digest;
  if (current?.last_sent_date === dateKey) return;

  const counts = await getProfessionalDailyCounts(user, getDigestSince(now, current), now);
  if (!hasProfessionalDailyActivity(counts)) {
    markDigestChecked(state, "professional_daily_digest", now, dateKey, false);
    await saveDigestState(user.id, recordId, state);
    return;
  }

  const content = buildProfessionalDailyDigestContent(counts);
  const sent = await sendDigestPush(user, {
    ...content,
    redirect: "/app/professional/analytics",
    type: "professional_daily_digest",
  });

  markDigestChecked(state, "professional_daily_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};

export const runNotificationDigestScheduler = async (now = new Date()) => {
  if (!isWebPushConfigured()) return;

  const parts = getZonedDateParts(now);
  const shouldRunLunchDigest = isInsideWindow(parts, 12, 15, 13, 15);
  const shouldRunEveningDigest = isInsideWindow(parts, 19, 30, 21, 0);
  const shouldRunProfessionalDailyDigest = isInsideWindow(parts, 18, 30, 19, 30);

  if (!shouldRunLunchDigest && !shouldRunEveningDigest && !shouldRunProfessionalDailyDigest) {
    return;
  }

  if (shouldRunLunchDigest || shouldRunEveningDigest) {
    const users = await listDigestTargetUsers("paciente");

    for (const user of users) {
      if (shouldRunLunchDigest) {
        await processLunchDigest(user, now, parts.dateKey);
      }

      if (shouldRunEveningDigest) {
        await processEveningDigest(user, now, parts.dateKey);
      }
    }
  }

  if (shouldRunProfessionalDailyDigest) {
    const users = await listDigestTargetUsers("psicologo");

    for (const user of users) {
      await processProfessionalDailyDigest(user, now, parts.dateKey);
    }
  }
};

let digestTimer: ReturnType<typeof setInterval> | null = null;

export const startNotificationDigestScheduler = () => {
  if (process.env.NOTIFICATION_DIGESTS_ENABLED === "false") return;
  if (digestTimer) return;

  const interval = Number(process.env.NOTIFICATION_DIGESTS_INTERVAL_MS);
  const intervalMs =
    Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_DIGEST_INTERVAL_MS;
  const run = () => {
    void runNotificationDigestScheduler().catch((error) => {
      console.error("[WEB NOTIFICATION] erro no scheduler de digests:", (error as Error).message);
    });
  };

  setTimeout(run, 30_000);
  digestTimer = setInterval(run, intervalMs);
};
