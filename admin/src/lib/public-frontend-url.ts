const LOCAL_FRONTEND_URL = "http://localhost:3000";

const resolvePublicFrontendUrl = () => {
  const configured = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || LOCAL_FRONTEND_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") return LOCAL_FRONTEND_URL;

    return url.origin;
  } catch {
    return LOCAL_FRONTEND_URL;
  }
};

export const publicFrontendUrl = resolvePublicFrontendUrl();

export const toPublicFrontendHref = (value: string) => {
  const normalized = value.trim();
  const fallback = `${publicFrontendUrl}/`;

  if (!normalized || normalized.startsWith("//") || normalized.includes("\\")) return fallback;

  try {
    const url = new URL(normalized, publicFrontendUrl);
    if (url.origin !== publicFrontendUrl) return fallback;
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;

    return url.toString();
  } catch {
    return fallback;
  }
};
