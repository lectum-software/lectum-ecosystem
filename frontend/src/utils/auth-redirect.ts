import type { user } from "@/api/generator/types";
import { getPsychologistRegistrationEntryPath } from "./psychologist-onboarding";

export const USER_HOME_PATHS = {
  paciente: "/patient/welcome",
  psicologo: "/app/professional/billing/plans",
} as const;

type RedirectFallback = string | null;

export function getUserHomePath(
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
  fallback: string,
) {
  if (data?.role && data.role in USER_HOME_PATHS) {
    return getPsychologistRegistrationEntryPath(data, USER_HOME_PATHS[data.role]);
  }

  return fallback;
}

export function resolveAuthRedirect(
  data: Pick<user, "role" | "confirmed"> | null | undefined,
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
