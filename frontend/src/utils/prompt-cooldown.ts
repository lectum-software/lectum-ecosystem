import type { user } from "@/api/generator/types";
import { readStorageItem, removeStorageItem, writeStorageItem } from "@/utils/browser-storage";

const TWO_DAYS_MS = 1000 * 60 * 60 * 24 * 2;
const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
const PSYCHOLOGIST_SHORT_COOLDOWN_DISMISSALS = 2;

export type PromptUserRole = "paciente" | "psicologo" | string | null | undefined;

type PromptRegistrationUser =
  | Pick<user, "confirmed" | "id" | "patient_profile" | "psychologist_profile" | "role">
  | null
  | undefined;

const hasActiveProfessionalSubscription = (
  profile: NonNullable<user["psychologist_profile"]> | null | undefined,
) => {
  return Boolean(profile?.subscriptions?.some((subscription) => subscription.status === "ativa"));
};

export const hasCompletedRegistrationForPrompts = (user: PromptRegistrationUser) => {
  if (!user?.id || !user.confirmed) {
    return false;
  }

  if (user.role === "paciente") {
    return Boolean(user.patient_profile?.onboarding_completed_at);
  }

  if (user.role === "psicologo") {
    const profile = user.psychologist_profile;

    return Boolean(
      profile &&
        hasActiveProfessionalSubscription(profile) &&
        profile.whatsapp &&
        profile.published === true,
    );
  }

  return false;
};

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
  const currentCount = Number(readStorageItem(storage, dismissCountKey) ?? 0);
  const nextDismissCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
  const cooldownMs = resolvePromptCooldownMs(role, nextDismissCount);

  writeStorageItem(storage, dismissCountKey, String(nextDismissCount));
  writeStorageItem(storage, dismissedUntilKey, String(Date.now() + cooldownMs));
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
  removeStorageItem(storage, dismissedUntilKey);
  removeStorageItem(storage, dismissCountKey);

  for (const key of legacyPermanentDismissKeys) {
    removeStorageItem(storage, key);
  }
};
