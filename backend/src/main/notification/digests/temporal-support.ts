export const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export const MAX_LOOKBACK_MS = 48 * 60 * 60 * 1000;

export const TEMPORAL_DIGEST_MIN_INTERVAL_MS = 3 * 60 * 60 * 1000;

export type TemporalDigestWindowState = {
  last_checked_at?: string;
  last_sent_at?: string;
  last_sent_date?: string;
};

export type DigestCountMap<T extends string> = Record<T, number>;

const parseValidRecentDate = (value: string | undefined, now: Date) => {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (date > now) return null;
  if (now.getTime() - date.getTime() > MAX_LOOKBACK_MS) return null;

  return date;
};

export const getTemporalDigestBoundary = (
  now: Date,
  windowState: TemporalDigestWindowState | undefined,
) => {
  const candidates = [
    parseValidRecentDate(windowState?.last_sent_at, now),
    parseValidRecentDate(windowState?.last_checked_at, now),
  ].filter((date): date is Date => Boolean(date));

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
};

export const hasTemporalDigestBaseline = (
  now: Date,
  windowState: TemporalDigestWindowState | undefined,
) => Boolean(getTemporalDigestBoundary(now, windowState));

export const canRunTemporalDigest = (
  now: Date,
  windowState: TemporalDigestWindowState | undefined,
  minIntervalMs = TEMPORAL_DIGEST_MIN_INTERVAL_MS,
) => {
  const boundary = getTemporalDigestBoundary(now, windowState);
  if (!boundary) return false;

  return now.getTime() - boundary.getTime() >= minIntervalMs;
};

export const getTemporalDigestSince = (
  now: Date,
  windowState: TemporalDigestWindowState | undefined,
) => getTemporalDigestBoundary(now, windowState) ?? new Date(now.getTime() - DEFAULT_LOOKBACK_MS);

export const createDigestCounts = <T extends readonly string[]>(
  keys: T,
): DigestCountMap<T[number]> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as DigestCountMap<T[number]>;

export const totalDigestCounts = <T extends string>(counts: DigestCountMap<T>) =>
  Object.values(counts).reduce<number>((sum, value) => sum + Number(value || 0), 0);

export const formatDigestCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

export const buildPatientEngagementDigestContent = (total: number) => {
  if (total <= 1) {
    return {
      body: "Abra a Lectum para acompanhar o que aconteceu.",
      title: "Seu conteúdo teve uma nova interação",
    };
  }

  return {
    body: `Você recebeu ${formatDigestCount(
      total,
      "nova interação",
      "novas interações",
    )} nos seus conteúdos.`,
    title: "Seu conteúdo teve novas interações",
  };
};

export const buildPsychologistNewPostsDigestContent = (total: number) => {
  if (total <= 1) {
    return {
      body: "Há um novo post em uma comunidade que você acompanha.",
      title: "Nova conversa na comunidade",
    };
  }

  return {
    body: `Há ${formatDigestCount(
      total,
      "novo post",
      "novos posts",
    )} em comunidades que você acompanha.`,
    title: "Novas conversas nas comunidades",
  };
};
