import prisma from "@/infra/database/prisma";
import { isChannelAllowed } from "../preferences";
import { PROFESSIONAL_DAILY_DIGEST_KEYS, type ProfessionalDailyDigestKey } from "../push-policy";
import { markDigestChecked, sendDigestPush } from "./psychologist";
import { type DigestTargetUser, getDigestSince, getDigestState, saveDigestState } from "./state";

export const createProfessionalDailyCounts = (): Record<ProfessionalDailyDigestKey, number> => ({
  compartilhamento: 0,
  salvamento: 0,
  upvote: 0,
  visualizacao_perfil: 0,
});

export const getProfessionalDailyCounts = async (
  user: DigestTargetUser,
  since: Date,
  now: Date,
) => {
  const allowedKeys = PROFESSIONAL_DAILY_DIGEST_KEYS.filter((key) =>
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
    if (
      !PROFESSIONAL_DAILY_DIGEST_KEYS.includes(
        notification.message_key as ProfessionalDailyDigestKey,
      )
    ) {
      continue;
    }

    counts[notification.message_key as ProfessionalDailyDigestKey]++;
  }

  return counts;
};

export const hasProfessionalDailyActivity = (counts: Record<ProfessionalDailyDigestKey, number>) =>
  Object.values(counts).some((count) => count > 0);

export const formatCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

export const buildProfessionalDailyDigestContent = (
  counts: Record<ProfessionalDailyDigestKey, number>,
) => {
  const interactions = counts.upvote + counts.salvamento + counts.compartilhamento;

  if (counts.visualizacao_perfil > 0 && interactions > 0) {
    return {
      body: `Seu perfil recebeu ${formatCount(
        counts.visualizacao_perfil,
        "visualização",
        "visualizações",
      )} e seus conteúdos tiveram ${formatCount(
        interactions,
        "nova interação",
        "novas interações",
      )} hoje.`,
      title: "Seu desempenho hoje na Lectum",
    };
  }

  if (counts.visualizacao_perfil > 0) {
    return {
      body: `Seu perfil recebeu ${formatCount(
        counts.visualizacao_perfil,
        "visualização",
        "visualizações",
      )} hoje.`,
      title: "Seu desempenho hoje na Lectum",
    };
  }

  if (counts.compartilhamento > 0) {
    return {
      body: `Seus conteúdos foram compartilhados ${formatCount(
        counts.compartilhamento,
        "vez",
        "vezes",
      )} hoje.`,
      title: "Seu desempenho hoje na Lectum",
    };
  }

  if (counts.salvamento > 0) {
    return {
      body: `Seus conteúdos foram salvos ${formatCount(counts.salvamento, "vez", "vezes")} hoje.`,
      title: "Seu desempenho hoje na Lectum",
    };
  }

  return {
    body: `Seus conteúdos receberam ${formatCount(
      counts.upvote,
      "novo upvote",
      "novos upvotes",
    )} hoje.`,
    title: "Seu desempenho hoje na Lectum",
  };
};

export const processProfessionalDailyDigest = async (
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
    redirect: "/app/profissional/estatisticas",
    type: "professional_daily_digest",
  });

  markDigestChecked(state, "professional_daily_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};
