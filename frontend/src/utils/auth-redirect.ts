import type { user } from "@/api/generator/types";

export const USER_HOME_PATHS = {
  paciente: "/patient/welcome",
  psicologo: "/dashboard",
} as const;

type RedirectFallback = string | null;

export function getUserHomePath(data: Pick<user, "role"> | null | undefined, fallback: string) {
  if (data?.role && data.role in USER_HOME_PATHS) {
    return USER_HOME_PATHS[data.role];
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
