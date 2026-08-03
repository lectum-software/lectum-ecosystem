import type { user } from "@/api/generator/types";
import {
  getPsychologistPlanSelectionRequirementPath,
  getPsychologistRegistrationEntryPath,
} from "./psychologist-onboarding";

export const USER_HOME_PATHS = {
  paciente: "/psicologos",
  psicologo: "/psicologos",
} as const;

type RedirectFallback = string | null;

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
) {
  if (data && "confirmed" in data && data.confirmed === false) {
    const pendingRedirect = explicitRedirect ?? legacyCallbackUrl;

    if (pendingRedirect) {
      return `/auth/verify-email?redirectTo=${encodeURIComponent(pendingRedirect)}`;
    }

    return "/auth/verify-email";
  }

  const psychologistPlanSelectionRequirement = getPsychologistPlanSelectionRequirementPath(data);
  if (psychologistPlanSelectionRequirement) return psychologistPlanSelectionRequirement;

  if (explicitRedirect) return explicitRedirect;
  if (legacyCallbackUrl) return legacyCallbackUrl;
  if (!fallback) return null;

  return getUserHomePath(data, fallback);
}
