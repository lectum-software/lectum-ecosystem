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

const TRAFFIC_FILTER_KEYS = new Set([
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "gender",
  "language",
  "modality",
  "more_experienced",
  "q",
  "race_color",
  "religion",
  "search",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
  "verified",
]);

// Interaction reports need search context, but never tokens or arbitrary return URLs.
export const interactionAnalyticsPath = (value: string) => {
  const pathname = normalizeAnalyticsPath(value);
  const query = new URL(value, ANALYTICS_PATH_ORIGIN).searchParams;
  const safeQuery = new URLSearchParams();
  for (const [key, value] of query) {
    if (TRAFFIC_FILTER_KEYS.has(key) && value.trim())
      safeQuery.append(key, value.trim().slice(0, 128));
  }
  const suffix = safeQuery.toString();
  return (pathname + (suffix ? `?${suffix}` : "")).slice(0, 512);
};

export const getCurrentInteractionPath = () =>
  typeof window === "undefined"
    ? undefined
    : interactionAnalyticsPath(window.location.pathname + window.location.search);
