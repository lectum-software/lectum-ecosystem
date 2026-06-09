import type { user } from "@/api/generator/types";
import { getPsychologistRegistrationEntryPath } from "./psychologist-onboarding";

export const USER_HOME_PATHS = {
  paciente: "/app/community",
  psicologo: "/app/community",
} as const;

type RedirectFallback = string | null;

export function getUserHomePath(
  data: Partial<Pick<user, "role" | "patient_profile" | "psychologist_profile">> | null | undefined,
  fallback: string,
) {
  if (data?.role === "paciente" && !data.patient_profile?.onboarding_completed_at) {
    return "/patient/welcome";
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
  callbackUrl: string | null,
  fallback: RedirectFallback,
) {
  if (data && "confirmed" in data && data.confirmed === false) {
    return "/auth/verify-email";
  }

  if (callbackUrl) return callbackUrl;
  if (!fallback) return null;

  return getUserHomePath(data, fallback);
}
