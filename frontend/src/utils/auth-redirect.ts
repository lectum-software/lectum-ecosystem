import type { user } from "@/api/generator/types";
import {
  getPsychologistPlanSelectionRequirementPath,
  getPsychologistRegistrationEntryPath,
} from "./psychologist-onboarding";
import { normalizeSafeInternalRedirect } from "./safe-redirect";

export const USER_HOME_PATHS = {
  paciente: "/psicologos",
  psicologo: "/psicologos",
} as const;

type RedirectFallback = string | null;
type ResolveAuthRedirectOptions = {
  skipOnboardingRedirect?: boolean;
};

export function getUserHomePath(
  data: Partial<Pick<user, "role" | "patient_profile" | "psychologist_profile">> | null | undefined,
  fallback: string,
) {
  if (data?.role === "paciente" && !data.patient_profile?.onboarding_completed_at) {
    return "/paciente/boas-vindas";
  }

  if (data?.role && data.role in USER_HOME_PATHS) {
    return getPsychologistRegistrationEntryPath(data, USER_HOME_PATHS[data.role]);
  }

  return fallback;
}

export function resolveAuthRedirect(
  data:
    | Partial<Pick<user, "role" | "confirmed" | "patient_profile" | "psychologist_profile">>
    | null
    | undefined,
  explicitRedirect: string | null,
  fallback: RedirectFallback,
  legacyCallbackUrl?: string | null,
  options: ResolveAuthRedirectOptions = {},
) {
  if (data && "confirmed" in data && data.confirmed === false) {
    const pendingRedirect = normalizeSafeInternalRedirect(explicitRedirect ?? legacyCallbackUrl);

    if (pendingRedirect) {
      return `/auth/verify-email?redirectTo=${encodeURIComponent(pendingRedirect)}`;
    }

    return "/auth/verify-email";
  }

  if (!options.skipOnboardingRedirect) {
    const psychologistPlanSelectionRequirement = getPsychologistPlanSelectionRequirementPath(data);
    if (psychologistPlanSelectionRequirement) return psychologistPlanSelectionRequirement;
  }

  const safeExplicitRedirect = normalizeSafeInternalRedirect(explicitRedirect);
  const safeLegacyCallbackUrl = normalizeSafeInternalRedirect(legacyCallbackUrl);

  if (safeExplicitRedirect) return safeExplicitRedirect;
  if (safeLegacyCallbackUrl) return safeLegacyCallbackUrl;
  if (!fallback) return null;

  const fallbackTarget = options.skipOnboardingRedirect
    ? fallback
    : getUserHomePath(data, fallback);

  return normalizeSafeInternalRedirect(fallbackTarget, "/psicologos");
}
