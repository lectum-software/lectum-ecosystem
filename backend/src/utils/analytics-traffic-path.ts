const MAX_ANALYTICS_PATH_LENGTH = 512;
const MAX_TRAFFIC_QUERY_VALUE_LENGTH = 128;
const MAX_SEARCH_TERM_LENGTH = 80;

const FILTER_VALUE_PARAM_KEYS = [
  "approach",
  "city",
  "gender",
  "language",
  "modality",
  "race_color",
  "religion",
  "service",
  "specialty",
  "state",
  "target_audience",
] as const;

const SEARCH_TEXT_PARAM_KEYS = ["q", "search"] as const;

const BOOLEAN_FILTER_PARAM_KEYS = [
  "accepts_insurance",
  "available_today",
  "discount_first_session",
  "more_experienced",
  "social_value",
  "verified",
] as const;

type FilterValueParamKey = (typeof FILTER_VALUE_PARAM_KEYS)[number];
type SearchTextParamKey = (typeof SEARCH_TEXT_PARAM_KEYS)[number];
type BooleanFilterParamKey = (typeof BOOLEAN_FILTER_PARAM_KEYS)[number];
type TrafficSearchFilterParamKey = BooleanFilterParamKey | FilterValueParamKey | SearchTextParamKey;

type TrafficFilterDictionary = Map<string, string> | Record<string, string>;
export type TrafficFilterLabelLookup = Partial<
  Record<FilterValueParamKey, TrafficFilterDictionary>
>;

export const TRAFFIC_SEARCH_FILTER_PARAM_KEYS = new Set([
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

const FILTER_PARAM_LABELS = {
  accepts_insurance: "Aceita conv\u00eanio",
  approach: "Abordagem",
  available_today: "Dispon\u00edvel hoje",
  city: "Cidade",
  discount_first_session: "Desconto na primeira sess\u00e3o",
  gender: "G\u00eanero",
  language: "Idioma",
  modality: "Modalidade",
  more_experienced: "Mais experientes",
  q: "Pesquisa",
  race_color: "Ra\u00e7a/cor",
  religion: "Religi\u00e3o",
  search: "Pesquisa",
  service: "Servi\u00e7o",
  social_value: "Valor social",
  specialty: "Especialidade",
  state: "Estado",
  target_audience: "P\u00fablico atendido",
  verified: "Somente verificados",
} satisfies Record<TrafficSearchFilterParamKey, string>;

const MODALITY_LABELS: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
};

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

const normalizeLookupKey = (value: string) =>
  normalizeQueryValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const humanizeFilterValue = (value: string) =>
  normalizeQueryValue(value)
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));

const isMeaningfulTrafficQueryValue = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return normalized !== "" && normalized !== "false";
};

const getFilterValueLabel = (
  key: FilterValueParamKey,
  value: string,
  labelLookup?: TrafficFilterLabelLookup,
) => {
  const normalizedValue = normalizeQueryValue(value, MAX_SEARCH_TERM_LENGTH);
  if (!normalizedValue) return "";

  if (key === "modality") {
    return MODALITY_LABELS[normalizedValue.toLowerCase()] ?? humanizeFilterValue(normalizedValue);
  }

  if (key === "state") {
    return normalizedValue.toUpperCase();
  }

  const dictionary = labelLookup?.[key];
  const normalizedKey = normalizeLookupKey(normalizedValue);
  const lookupValue =
    dictionary instanceof Map ? dictionary.get(normalizedKey) : dictionary?.[normalizedKey];

  return lookupValue?.trim() || humanizeFilterValue(normalizedValue);
};

const isFilterValueParamKey = (key: string): key is FilterValueParamKey =>
  FILTER_VALUE_PARAM_KEYS.includes(key as FilterValueParamKey);

const isBooleanFilterParamKey = (key: string): key is BooleanFilterParamKey =>
  BOOLEAN_FILTER_PARAM_KEYS.includes(key as BooleanFilterParamKey);

const isSelectedBooleanFilterValue = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return normalized !== "" && normalized !== "false" && normalized !== "0";
};

const isMeaningfulTrafficParamValue = (key: string, value: string) => {
  if (isBooleanFilterParamKey(key)) return isSelectedBooleanFilterValue(value);

  return isMeaningfulTrafficQueryValue(value);
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
      if (!isMeaningfulTrafficParamValue(key, queryValue)) continue;

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

      return isMeaningfulTrafficParamValue(key, rawValue);
    });
  } catch {
    return false;
  }
};

export const hasDirectorySelectedFilterParams = (path: string | null | undefined) => {
  if (!path?.includes("?")) return false;

  try {
    const url = parseAnalyticsPath(path);

    return [...url.searchParams.entries()].some(([rawKey, rawValue]) => {
      const key = rawKey.trim().toLowerCase();
      if (!isFilterValueParamKey(key) && !isBooleanFilterParamKey(key)) return false;

      return isMeaningfulTrafficParamValue(key, rawValue);
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

    for (const key of SEARCH_TEXT_PARAM_KEYS) {
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

export const extractSearchFiltersFromTrafficPath = (
  path: string | null | undefined,
  labelLookup?: TrafficFilterLabelLookup,
) => {
  if (!path?.includes("?")) return [];

  try {
    const url = parseAnalyticsPath(path);
    const filters = new Set<string>();

    for (const [rawKey, rawValue] of url.searchParams.entries()) {
      const key = rawKey.trim().toLowerCase();
      if (!TRAFFIC_SEARCH_FILTER_PARAM_KEYS.has(key)) continue;

      const value = normalizeQueryValue(rawValue, MAX_SEARCH_TERM_LENGTH);
      if (!isMeaningfulTrafficParamValue(key, value)) continue;

      if (isBooleanFilterParamKey(key)) {
        filters.add(FILTER_PARAM_LABELS[key]);
        continue;
      }

      if (isFilterValueParamKey(key)) {
        const valueLabel = getFilterValueLabel(key, value, labelLookup);
        if (!valueLabel) continue;

        filters.add(`${FILTER_PARAM_LABELS[key]}: ${valueLabel}`);
      }
    }

    return [...filters];
  } catch {
    return [];
  }
};
