const TWO_DAYS_MS = 1000 * 60 * 60 * 24 * 2;
const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
const PSYCHOLOGIST_SHORT_COOLDOWN_DISMISSALS = 2;

export type PromptUserRole = "paciente" | "psicologo" | string | null | undefined;

export const resolvePromptCooldownMs = (role: PromptUserRole, nextDismissCount: number) => {
  if (role !== "psicologo") {
    return SEVEN_DAYS_MS;
  }

  return nextDismissCount <= PSYCHOLOGIST_SHORT_COOLDOWN_DISMISSALS ? TWO_DAYS_MS : SEVEN_DAYS_MS;
};

export const markPromptDismissedWithBackoff = ({
  dismissedUntilKey,
  dismissCountKey,
  role,
  storage,
}: {
  dismissedUntilKey: string;
  dismissCountKey: string;
  role: PromptUserRole;
  storage: Storage;
}) => {
  const currentCount = Number(storage.getItem(dismissCountKey) ?? 0);
  const nextDismissCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
  const cooldownMs = resolvePromptCooldownMs(role, nextDismissCount);

  storage.setItem(dismissCountKey, String(nextDismissCount));
  storage.setItem(dismissedUntilKey, String(Date.now() + cooldownMs));
};

export const clearPromptDismissalState = ({
  dismissedUntilKey,
  dismissCountKey,
  legacyPermanentDismissKeys = [],
  storage,
}: {
  dismissedUntilKey: string;
  dismissCountKey: string;
  legacyPermanentDismissKeys?: string[];
  storage: Storage;
}) => {
  storage.removeItem(dismissedUntilKey);
  storage.removeItem(dismissCountKey);

  for (const key of legacyPermanentDismissKeys) {
    storage.removeItem(key);
  }
};
