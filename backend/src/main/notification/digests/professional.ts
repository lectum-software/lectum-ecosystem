import prisma from "@/infra/database/prisma";
import { isChannelAllowed } from "../preferences";
import { markDigestChecked, sendDigestPush } from "./psychologist";
import {
  type DigestTargetUser,
  getDigestSince,
  getDigestState,
  PROFESSIONAL_DAILY_KEYS,
  type ProfessionalDailyKey,
  saveDigestState,
} from "./state";

export const createProfessionalDailyCounts = (): Record<ProfessionalDailyKey, number> => ({
  clique_whatsapp: 0,
  nova_avaliacao: 0,
  nova_resposta: 0,
  novo_favorito: 0,
  salvamento: 0,
  upvote: 0,
});

export const getProfessionalDailyCounts = async (
  user: DigestTargetUser,
  since: Date,
  now: Date,
) => {
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

export const hasProfessionalDailyActivity = (counts: Record<ProfessionalDailyKey, number>) =>
  Object.values(counts).some((count) => count > 0);

export const formatCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

export const buildProfessionalDailyDigestContent = (
  counts: Record<ProfessionalDailyKey, number>,
) => {
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
