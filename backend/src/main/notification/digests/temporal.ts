import prisma from "@/infra/database/prisma";
import { isChannelAllowed } from "../preferences";
import { PATIENT_TEMPORAL_DIGEST_KEYS, PROFESSIONAL_NEW_POST_DIGEST_KEYS } from "../push-policy";
import { markDigestChecked, sendDigestPush } from "./psychologist";
import { type DigestKind, type DigestTargetUser, getDigestState, saveDigestState } from "./state";
import {
  buildPatientEngagementDigestContent,
  buildPsychologistNewPostsDigestContent,
  canRunTemporalDigest,
  createDigestCounts,
  getTemporalDigestSince,
  hasTemporalDigestBaseline,
  totalDigestCounts,
} from "./temporal-support";

const NOTIFICATIONS_REDIRECT = "/app/notificacoes";

const countUserNotifications = async <T extends readonly string[]>(params: {
  keys: T;
  now: Date;
  since: Date;
  user: DigestTargetUser;
}) => {
  const allowedKeys = params.keys.filter((key) =>
    isChannelAllowed(params.user.notification_preference?.prefs, key, "push"),
  );
  const counts = createDigestCounts(params.keys);

  if (allowedKeys.length === 0) return counts;

  const notifications = await prisma.notification.findMany({
    select: {
      message_key: true,
    },
    where: {
      createdAt: {
        gte: params.since,
        lte: params.now,
      },
      deleted: false,
      message_key: {
        in: allowedKeys,
      },
      user_id: params.user.id,
    },
  });

  for (const notification of notifications) {
    if (!params.keys.includes(notification.message_key)) continue;

    counts[notification.message_key as T[number]]++;
  }

  return counts;
};

const processTemporalNotificationDigest = async <T extends readonly string[]>(params: {
  buildContent: (total: number) => { body: string; title: string };
  dateKey: string;
  kind: DigestKind;
  keys: T;
  now: Date;
  redirect: string;
  user: DigestTargetUser;
}) => {
  const { recordId, state } = await getDigestState(params.user.id);
  const current = state[params.kind];

  if (!hasTemporalDigestBaseline(params.now, current)) {
    markDigestChecked(state, params.kind, params.now, params.dateKey, false);
    await saveDigestState(params.user.id, recordId, state);
    return;
  }

  if (!canRunTemporalDigest(params.now, current)) return;

  const since = getTemporalDigestSince(params.now, current);
  const counts = await countUserNotifications({
    keys: params.keys,
    now: params.now,
    since,
    user: params.user,
  });
  const total = totalDigestCounts(counts);

  if (total === 0) {
    markDigestChecked(state, params.kind, params.now, params.dateKey, false);
    await saveDigestState(params.user.id, recordId, state);
    return;
  }

  const content = params.buildContent(total);
  const sent = await sendDigestPush(params.user, {
    ...content,
    redirect: params.redirect,
    type: params.kind,
  });

  markDigestChecked(state, params.kind, params.now, params.dateKey, sent);
  await saveDigestState(params.user.id, recordId, state);
};

export const processPatientEngagementDigest = async (
  user: DigestTargetUser,
  now: Date,
  dateKey: string,
) => {
  await processTemporalNotificationDigest({
    buildContent: buildPatientEngagementDigestContent,
    dateKey,
    kind: "patient_engagement_digest",
    keys: PATIENT_TEMPORAL_DIGEST_KEYS,
    now,
    redirect: NOTIFICATIONS_REDIRECT,
    user,
  });
};

export const processPsychologistNewPostsDigest = async (
  user: DigestTargetUser,
  now: Date,
  dateKey: string,
) => {
  await processTemporalNotificationDigest({
    buildContent: buildPsychologistNewPostsDigestContent,
    dateKey,
    kind: "psychologist_new_posts_digest",
    keys: PROFESSIONAL_NEW_POST_DIGEST_KEYS,
    now,
    redirect: NOTIFICATIONS_REDIRECT,
    user,
  });
};
