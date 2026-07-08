export const GOOGLE_MANAGE_ACCOUNT_URL = "https://myaccount.google.com/security";

const toUrlOrigin = (value?: string | null) => {
  const raw = value?.trim();

  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
};

export const getGoogleOAuthBaseUrl = () =>
  toUrlOrigin(process.env.GOOGLE_OAUTH_BASE_URL) || toUrlOrigin(process.env.BASE);

export const getGoogleOAuthCallbackUrl = () => {
  const baseUrl = getGoogleOAuthBaseUrl();

  return baseUrl ? `${baseUrl}/api/public/google/callback` : "";
};

export const createGoogleOAuthLoginUrl = (deviceId: string) => {
  const baseUrl = getGoogleOAuthBaseUrl();

  if (!baseUrl) return null;

  return new URL(`/api/public/google/login/${encodeURIComponent(deviceId)}`, baseUrl);
};

export const isGoogleOAuthConfigured = () => {
  return Boolean(
    getGoogleOAuthBaseUrl() &&
      process.env.CALLBACK_URL_API_USER &&
      process.env.GOOGLE_CLIENT_ID_API_USER &&
      process.env.GOOGLE_CLIENT_SECRET_API_USER,
  );
};
