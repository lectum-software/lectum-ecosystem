import { parseConfiguredHttpOrigin } from "./http-origin-policy";

const LOCAL_FRONTEND_URL = "http://localhost:3000";
const INTERNAL_ORIGIN = "https://lectum-admin.invalid";

const resolvePublicFrontendUrl = () => {
  const configured = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  const fallback = process.env.NODE_ENV === "development" ? LOCAL_FRONTEND_URL : "";
  if (!configured) return fallback;

  return parseConfiguredHttpOrigin(configured)?.origin ?? fallback;
};

export const publicFrontendUrl = resolvePublicFrontendUrl();

export const toPublicFrontendHref = (value: string) => {
  const normalized = value.trim();
  const fallback = publicFrontendUrl ? `${publicFrontendUrl}/` : "/";

  if (!normalized || normalized.startsWith("//") || normalized.includes("\\")) return fallback;

  try {
    const parsingOrigin = publicFrontendUrl || INTERNAL_ORIGIN;
    const url = new URL(normalized, parsingOrigin);
    if (url.origin !== parsingOrigin || url.username || url.password) return fallback;
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;

    return publicFrontendUrl ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};
