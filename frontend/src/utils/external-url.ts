const WHATSAPP_ROOT_DOMAIN = "whatsapp.com";
export const GOOGLE_ACCOUNT_MANAGEMENT_URL = "https://myaccount.google.com/security";

export const normalizeTrustedWhatsAppUrl = (value: string | null | undefined) => {
  const raw = value?.trim();
  if (!raw || raw.length > 4096) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const trustedHostname =
      hostname === "wa.me" ||
      hostname === WHATSAPP_ROOT_DOMAIN ||
      hostname.endsWith(`.${WHATSAPP_ROOT_DOMAIN}`);

    if (url.protocol !== "https:" || !trustedHostname || url.username || url.password) return null;

    return url.toString();
  } catch {
    return null;
  }
};

export const normalizeTrustedGoogleAccountUrl = (value: string | null | undefined) => {
  const raw = value?.trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "myaccount.google.com" ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};
