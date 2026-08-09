import { resolveAdminApiRequestUrl } from "./api-request-url";
import { parseConfiguredHttpOrigin } from "./http-origin-policy";

const DEFAULT_ADMIN_API_URL = "http://localhost:3001";
const productionFallback = "";

const normalizeApiUrl = (value?: string | null) => {
  const normalized = value?.trim();
  const fallback =
    process.env.NODE_ENV === "development" ? DEFAULT_ADMIN_API_URL : productionFallback;
  if (!normalized) return fallback;

  return parseConfiguredHttpOrigin(normalized)?.origin ?? fallback;
};

export const adminApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
export const adminApiRequestUrl = resolveAdminApiRequestUrl(adminApiUrl);
