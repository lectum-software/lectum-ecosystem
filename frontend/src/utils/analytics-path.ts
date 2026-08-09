import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

const ANALYTICS_PATH_ORIGIN = "https://lectum.local";

export const normalizeAnalyticsPath = (value?: string | null) => {
  const safePath = normalizeSafeInternalRedirect(value, "/") || "/";

  try {
    return new URL(safePath, ANALYTICS_PATH_ORIGIN).pathname || "/";
  } catch {
    return "/";
  }
};

export const getCurrentAnalyticsPath = () => {
  if (typeof window === "undefined") return "/";

  return normalizeAnalyticsPath(window.location.pathname);
};
