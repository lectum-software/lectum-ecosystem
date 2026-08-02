const MAX_ANALYTICS_PATH_LENGTH = 512;
const MAX_TRAFFIC_QUERY_VALUE_LENGTH = 128;
const MAX_SEARCH_TERM_LENGTH = 80;

const SEARCH_TERM_PARAM_KEYS = ["q", "search"] as const;

export const TRAFFIC_SEARCH_FILTER_PARAM_KEYS = new Set([
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "gender",
  "language",
  "modality",
  "q",
  "race_color",
  "religion",
  "search",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
]);

const stripControlCharacters = (value: string, replacement: string) =>
  Array.from(value, (char) => {
    const code = char.charCodeAt(0);

    return code <= 31 || code === 127 ? replacement : char;
  }).join("");

const safeDecodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizePathname = (value: string) => {
  const path = safeDecodePath(value || "/")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);

      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/\/{2,}/g, "/")
    .trim();
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const withoutTrailing = withSlash.length > 1 ? withSlash.replace(/\/+$/g, "") : withSlash;

  return withoutTrailing || "/";
};

const parseAnalyticsPath = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://")
    ? new URL(value)
    : new URL(value, "https://lectum.local");

const normalizeQueryValue = (value: string, maxLength = MAX_TRAFFIC_QUERY_VALUE_LENGTH) =>
  stripControlCharacters(value, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);

const isMeaningfulTrafficQueryValue = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return normalized !== "" && normalized !== "false";
};

export const sanitizeAnalyticsPathWithTrafficQuery = (value: unknown) => {
  if (typeof value !== "string") return "/";

  const input = value.trim();
  if (!input) return "/";

  try {
    const parsed = parseAnalyticsPath(input);
    const pathname = normalizePathname(parsed.pathname);
    const allowed = new URLSearchParams();

    for (const [rawKey, rawValue] of parsed.searchParams.entries()) {
      const key = rawKey.trim().toLowerCase();
      if (!TRAFFIC_SEARCH_FILTER_PARAM_KEYS.has(key)) continue;

      const queryValue = normalizeQueryValue(rawValue);
      if (!isMeaningfulTrafficQueryValue(queryValue)) continue;

      allowed.append(key, queryValue);
    }

    const query = allowed.toString();
    const path = `${pathname}${query ? `?${query}` : ""}`;

    return path.slice(0, MAX_ANALYTICS_PATH_LENGTH) || "/";
  } catch {
    return normalizePathname(input.split("#")[0]?.split("?")[0] || "/").slice(
      0,
      MAX_ANALYTICS_PATH_LENGTH,
    );
  }
};

export const hasSearchFilterTrafficParams = (path: string | null | undefined) => {
  if (!path?.includes("?")) return false;

  try {
    const url = parseAnalyticsPath(path);

    return [...url.searchParams.entries()].some(([rawKey, rawValue]) => {
      const key = rawKey.trim().toLowerCase();
      if (!TRAFFIC_SEARCH_FILTER_PARAM_KEYS.has(key)) return false;

      return isMeaningfulTrafficQueryValue(rawValue);
    });
  } catch {
    return false;
  }
};

export const extractSearchTermsFromTrafficPath = (path: string | null | undefined) => {
  if (!path?.includes("?")) return [];

  try {
    const url = parseAnalyticsPath(path);
    const terms = new Set<string>();

    for (const key of SEARCH_TERM_PARAM_KEYS) {
      const values = url.searchParams.getAll(key);

      for (const value of values) {
        const term = normalizeQueryValue(value, MAX_SEARCH_TERM_LENGTH);
        if (!isMeaningfulTrafficQueryValue(term)) continue;

        terms.add(term);
      }
    }

    return [...terms];
  } catch {
    return [];
  }
};
