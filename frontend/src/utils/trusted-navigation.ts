const LOCAL_API_URL = "http://localhost:3001";

export const normalizeTrustedApiUrl = (value: string) => {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || LOCAL_API_URL;

  try {
    const apiOrigin = new URL(configuredApiUrl).origin;
    const url = new URL(value, apiOrigin);
    if (url.origin !== apiOrigin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return url.toString();
  } catch {
    return null;
  }
};

export const buildTrustedGoogleLoginUrl = (
  deviceId: string | null | undefined,
  query?: URLSearchParams,
) => {
  if (!deviceId) throw new Error("Device identifier is unavailable");

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || LOCAL_API_URL;
  const defaultLoginUrl = new URL("/api/public/google/login", configuredApiUrl).toString();
  const configuredLoginUrl = process.env.NEXT_PUBLIC_LOGIN_URL?.trim() || defaultLoginUrl;
  const trustedLoginUrl = normalizeTrustedApiUrl(configuredLoginUrl);

  if (!trustedLoginUrl) throw new Error("Google login URL is not trusted");

  const url = new URL(trustedLoginUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(deviceId)}`;
  url.search = query?.toString() || "";

  return url.toString();
};
