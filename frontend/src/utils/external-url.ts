const WHATSAPP_ROOT_DOMAIN = "whatsapp.com";

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
